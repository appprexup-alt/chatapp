const fs = require('fs');
const path = 'c:/Users/RYZEN/Downloads/crm-whatsapp (1)/n8n-workflows/alquimia-ai-v4-unified.json';
const outPath = 'c:/Users/RYZEN/Downloads/crm-whatsapp (1)/n8n-workflows/alquimia-ai-v6-agent.json';

try {
    const workflow = JSON.parse(fs.readFileSync(path, 'utf8'));

    // 1. Remove 'Get Properties' node
    console.log("Removing 'Get Properties' node...");
    workflow.nodes = workflow.nodes.filter(n => n.name !== 'Get Properties');

    // 2. Fix connections (Save Incoming -> Get Chat History)
    // Original: Save Incoming -> Get Properties -> Get Chat History
    // New: Save Incoming -> Get Chat History
    if (workflow.connections['Save Incoming'] && workflow.connections['Save Incoming'].main) {
        // Point to Get Chat History
        workflow.connections['Save Incoming'].main[0][0].node = 'Get Chat History';
    }
    // Remove the dead connection entry
    delete workflow.connections['Get Properties'];

    // 3. Update 'Prepare AI Context' code
    const contextNode = workflow.nodes.find(n => n.name === 'Prepare AI Context');
    if (contextNode) {
        console.log("Updating Context Node...");
        let code = contextNode.parameters.jsCode;
        code = code.replace(/const properties = \$\('Get Properties'\)\.item\.json;/g, "// Properties removed");
        code = code.replace(/const props = Array\.isArray\(properties\)[\s\S]*?: 'No hay propiedades disponibles';/g, "const props = 'Usa la herramienta de búsqueda para encontrar propiedades.';");
        contextNode.parameters.jsCode = code;
    }

    // 4. Add Tool Node
    console.log("Adding Tool Node...");
    const toolNode = {
        "parameters": {
            "workflowId": "INSERT_SEARCH_WORKFLOW_ID_HERE",
            "name": "search_properties",
            "description": "Busca propiedades en la base de datos. Input: { query: string, min_price: number, max_price: number }"
        },
        "id": "tool-search",
        "name": "Tool Search",
        "type": "@n8n/n8n-nodes-langchain.toolWorkflow",
        "typeVersion": 1,
        "position": [
            3000,
            400
        ]
    };
    workflow.nodes.push(toolNode);

    // 5. Connect Tool to Agent
    // Tools output to 'ai_tool' input of Agent
    workflow.connections['Tool Search'] = {
        "ai_tool": [
            [
                {
                    "node": "AI Agent",
                    "type": "ai_tool",
                    "index": 0
                }
            ]
        ]
    };

    // 6. Update System Prompt
    const agentNode = workflow.nodes.find(n => n.name === 'AI Agent');
    if (agentNode) {
        console.log("Updating System Prompt...");
        let prompt = agentNode.parameters.options.systemMessage;
        // The original has: === PROPIEDADES DISPONIBLES ===\n{{ $json.properties }}
        prompt = prompt.replace("=== PROPIEDADES DISPONIBLES ===\n{{ $json.properties }}",
            "=== HERRAMIENTAS ===\nUsa la herramienta 'search_properties' para buscar lotes cuando el cliente pregunte por precios, áreas o características. NO inventes información. Si la herramienta no devuelve resultados, dilo.");
        agentNode.parameters.options.systemMessage = prompt;
    }

    workflow.name = "Alquimia AI v6 - Agent Search";

    fs.writeFileSync(outPath, JSON.stringify(workflow, null, 4));
    console.log("Successfully created " + outPath);

} catch (e) {
    console.error("Error:", e);
}
