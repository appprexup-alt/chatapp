import { db } from './db';
import { evolutionService } from './evolutionService';
import { replaceVariables } from '../utils/textUtils';
import { User } from '../types';

const CHECK_INTERVAL = 1000 * 60 * 60; // Check every hour
const LEADER_CHECK_INTERVAL = 1000 * 5; // Check leadership every 5 seconds
const LEADER_TIMEOUT = 15000; // Leader considered dead after 15 seconds

let isRunning = false;
let runnerInterval: any = null;
let leadershipInterval: any = null;
const TAB_ID = Math.random().toString(36).substring(7);

const getCurrentUser = (): User | null => {
    const stored = localStorage.getItem('inmocrm_user');
    return stored ? JSON.parse(stored) : null;
};

const checkLeadership = (): boolean => {
    const now = Date.now();
    const leaderDataStr = localStorage.getItem('inmocrm_leader');

    if (leaderDataStr) {
        try {
            const leaderData = JSON.parse(leaderDataStr);
            // If the current leader is me, or the leader is dead, I can try to lead
            if (leaderData.id === TAB_ID) {
                // I am the leader, update heartbeat
                localStorage.setItem('inmocrm_leader', JSON.stringify({ id: TAB_ID, timestamp: now }));
                return true;
            }
            if (now - leaderData.timestamp > LEADER_TIMEOUT) {
                // Leader is dead, claim leadership
                localStorage.setItem('inmocrm_leader', JSON.stringify({ id: TAB_ID, timestamp: now }));
                console.log(`[Automation] ${TAB_ID} claiming leadership (previous leader timed out)`);
                return true;
            }
            return false;
        } catch (e) {
            // Corrupt data, claim it
            localStorage.setItem('inmocrm_leader', JSON.stringify({ id: TAB_ID, timestamp: now }));
            return true;
        }
    } else {
        // No leader, claim it
        localStorage.setItem('inmocrm_leader', JSON.stringify({ id: TAB_ID, timestamp: now }));
        console.log(`[Automation] ${TAB_ID} claiming initial leadership`);
        return true;
    }
};

export const runPipelineFollowUps = async () => {
    const user = getCurrentUser();
    if (!user?.organizationId) return;

    console.log(`[Automation] Checking pipeline follow-ups for Org: ${user.organizationId}`);

    try {
        // 1. Get configs and leads (Fresh from DB)
        const [configs, leads] = await Promise.all([
            db.getFollowUpCampaigns(),
            db.getLeads()
        ]);

        const activeConfigs = configs.filter(c => c.is_active);
        if (activeConfigs.length === 0) return;

        // Group leads by stage for efficient processing
        const leadsByStage: Record<string, typeof leads> = {};
        leads.forEach(l => {
            if (!l.pipelineStageId) return;
            if (!leadsByStage[l.pipelineStageId]) leadsByStage[l.pipelineStageId] = [];
            leadsByStage[l.pipelineStageId].push(l);
        });

        // Loop through stages that have active follow-up configs
        const stagesWithConfigs = [...new Set(activeConfigs.map(c => c.pipeline_stage_id))];

        for (const stageId of stagesWithConfigs) {
            const stageLeads = leadsByStage[stageId] || [];
            const stageConfigs = activeConfigs
                .filter(c => c.pipeline_stage_id === stageId)
                .sort((a, b) => b.delay_hours - a.delay_hours); // Sort DESCENDING (highest delay first)

            for (const lead of stageLeads) {
                const now = new Date();
                const lastUpdateStr = lead.pipelineStageChangedAt || lead.updatedAt || lead.createdAt;
                if (!lastUpdateStr) continue;

                const lastUpdate = new Date(lastUpdateStr);
                const hoursInStage = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);

                // Find the MOST advanced config that applies to this lead's time in stage
                // and has NOT been sent yet.
                let bestConfigToId = null;

                // We check configs from highest delay to lowest
                for (const config of stageConfigs) {
                    if (hoursInStage >= config.delay_hours) {
                        const alreadySent = await db.checkFollowUpLog(config.id, lead.id);

                        if (!alreadySent) {
                            // This is the highest delay config they qualify for that hasn't been sent.
                            // We'll send this one and stop looking for this lead.
                            bestConfigToId = config;
                            break;
                        } else {
                            // If they already received the HIGHEST delay message they qualify for,
                            // we stop completely for this lead. We don't want to send "earlier" 
                            // messages if a "later" one was already delivered.
                            break;
                        }
                    }
                }

                if (bestConfigToId) {
                    const config = bestConfigToId;
                    console.log(`[Automation] Sending best-match follow-up "${config.name}" to lead ${lead.name} (${lead.phone})`);

                    const message = replaceVariables(config.content, lead);
                    const phone = lead.phone.replace(/\D/g, '');

                    if (phone.length < 10) continue;

                    let success = false;
                    try {
                        if (config.media_url) {
                            await evolutionService.sendMedia(
                                user.organizationId,
                                phone,
                                config.media_url,
                                config.media_type as 'image' | 'video',
                                message
                            );
                        } else {
                            await evolutionService.sendText(
                                user.organizationId,
                                phone,
                                message
                            );
                        }
                        success = true;
                    } catch (err: any) {
                        console.error('[Automation] Error sending via Evolution:', err);
                    }

                    // 3. Log result IMMEDIATELY 
                    await db.logFollowUpActivity({
                        config_id: config.id,
                        lead_id: lead.id,
                        status: success ? 'sent' : 'failed'
                    });
                }
            }
        }
    } catch (error) {
        console.error('[Automation] Error in runPipelineFollowUps:', error);
    }
};

export const runDailyAutomations = async () => {
    if (!checkLeadership()) {
        // console.log('[Automation] Not the leader tab, skipping check.');
        return;
    }

    if (isRunning) {
        console.log('[Automation] Already running, skipping concurrent execution.');
        return;
    }

    isRunning = true;
    console.log('[Automation] Starting daily automations check...');

    try {
        const user = getCurrentUser();
        if (!user?.organizationId) {
            console.log('[Automation] No active session, stopping runner.');
            isRunning = false;
            return;
        }

        // 1. Get Active Automations (Birthday/Anniversary)
        const automations = await db.getClientAutomations();
        const activeAutomations = automations.filter(a => a.is_active);

        // 2. Get All Clients
        const clients = await db.getClients();
        const today = new Date();
        const currentMonth = today.getMonth() + 1; // 1-12
        const currentDay = today.getDate(); // 1-31

        for (const auto of activeAutomations) {
            const [targetHour, targetMinute] = (auto.time_to_send || '10:00').split(':').map(Number);
            const nowHour = today.getHours();

            // Wait until the specific hour configured
            if (nowHour < targetHour) continue;

            if (auto.trigger_type === 'birthday') {
                const birthdayClients = clients.filter(c => {
                    if (!c.birthDate) return false;
                    const dateParts = c.birthDate.split('-');
                    if (dateParts.length < 3) return false;
                    const month = parseInt(dateParts[1]);
                    const day = parseInt(dateParts[2]);
                    return month === currentMonth && day === currentDay;
                });

                for (const client of birthdayClients) {
                    // Check if already sent TODAY for this automation
                    const alreadySent = await db.checkAutomationLog(auto.id, client.id);
                    if (alreadySent) continue;

                    console.log(`[Automation] Sending birthday message to ${client.name}`);

                    const message = replaceVariables(auto.content, client as any);
                    const phone = client.phone.replace(/\D/g, '');

                    if (phone.length < 10) continue;

                    let success = false;
                    try {
                        if (auto.media_url) {
                            await evolutionService.sendMedia(
                                user.organizationId,
                                phone,
                                auto.media_url,
                                auto.media_type as 'image' | 'video',
                                message
                            );
                        } else {
                            await evolutionService.sendText(
                                user.organizationId,
                                phone,
                                message
                            );
                        }
                        success = true;
                    } catch (err) {
                        console.error('[Automation] Error sending birthday message:', err);
                        success = false;
                    }

                    // Log result
                    await db.logClientAutomation({
                        automation_id: auto.id,
                        client_id: client.id,
                        status: success ? 'sent' : 'failed',
                        error_message: success ? undefined : 'Failed to send via Evolution'
                    });
                }
            }
        }

        // 3. Run Pipeline Follow-ups (Stage-based)
        await runPipelineFollowUps();

    } catch (error) {
        console.error('[Automation] Critical error in daily automations runner:', error);
    } finally {
        isRunning = false;
    }
};

export const initAutomationRunner = () => {
    // Singleton pattern: prevent multiple intervals
    if (runnerInterval) {
        console.log('[Automation] Runner already initialized, resetting interval.');
        clearInterval(runnerInterval);
    }
    if (leadershipInterval) {
        clearInterval(leadershipInterval);
    }

    // Run leadership check periodically
    leadershipInterval = setInterval(() => {
        checkLeadership();
    }, LEADER_CHECK_INTERVAL);

    // Initial check (non-blocking)
    setTimeout(runDailyAutomations, 2000);

    // Set interval to run periodically
    runnerInterval = setInterval(runDailyAutomations, CHECK_INTERVAL);
};
