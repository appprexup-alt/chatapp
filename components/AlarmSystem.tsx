
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import { Task, Appointment } from '../types';
import { differenceInMinutes, isFuture } from 'date-fns';
import { Bell, X, Clock, AlertTriangle } from 'lucide-react';

// Base64 Simple Beep Sound to avoid external dependencies
const ALARM_SOUND = "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU"; // Short placeholder, browsers might block autoplay without interaction.

const AlarmSystem: React.FC = () => {
  const [alert, setAlert] = useState<{ type: 'task' | 'appointment', title: string, time: string, id: string } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<number | null>(null);
  const triggeredEvents = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Create audio object
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Short notification sound
    audioRef.current.loop = true;

    const checkEvents = async () => {
      const tasks = await db.getTasks();
      const appointments = await db.getAppointments();
      const now = new Date();

      const processEvent = (id: string, title: string, dateStr: string, type: 'task' | 'appointment') => {
        if (triggeredEvents.current.has(id)) return;

        const eventDate = new Date(dateStr);
        const diff = differenceInMinutes(eventDate, now);

        // Logic: Alert if event is between 0 and 7 minutes in the future
        if (diff >= 0 && diff <= 7 && isFuture(eventDate)) {
          triggerAlarm(id, title, dateStr, type);
        }
      };

      tasks.forEach(t => t.status === 'Pendiente' && processEvent(t.id, t.title, t.dueDate, 'task'));
      appointments.forEach(a => a.status === 'Pendiente' && processEvent(a.id, a.title, a.date, 'appointment'));
    };

    // Check every 30 seconds
    const timer = setInterval(checkEvents, 30000);
    
    // Initial check
    checkEvents();

    return () => clearInterval(timer);
  }, []);

  const triggerAlarm = (id: string, title: string, time: string, type: 'task' | 'appointment') => {
    triggeredEvents.current.add(id);
    setAlert({ id, title, time, type });
    
    // Play Sound
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.log("Autoplay prevented:", e));
    }

    // Auto-snooze after 1 minute if no interaction
    intervalRef.current = window.setTimeout(() => {
      stopAlarm();
    }, 60000);
  };

  const stopAlarm = () => {
    setAlert(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (intervalRef.current) clearTimeout(intervalRef.current);
  };

  if (!alert) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] animate-bounce-in">
      <div className="bg-danger text-white rounded-2xl shadow-2xl p-4 w-80 border-2 border-white/20 flex flex-col relative overflow-hidden">
        {/* Pulse Effect Background */}
        <div className="absolute top-0 left-0 w-full h-full bg-white/10 animate-pulse pointer-events-none"></div>
        
        <div className="flex justify-between items-start mb-2 relative z-10">
          <div className="flex items-center gap-2 font-bold text-lg">
            <AlertTriangle className="animate-bounce" />
            Recordatorio
          </div>
          <button onClick={stopAlarm} className="text-white/80 hover:text-white bg-white/10 rounded-full p-1">
            <X size={18} />
          </button>
        </div>

        <div className="relative z-10">
          <p className="text-white/90 text-sm font-medium uppercase tracking-wide mb-1">
            {alert.type === 'task' ? 'Tarea Pendiente' : 'Cita Programada'}
          </p>
          <h3 className="text-xl font-bold leading-tight mb-2">{alert.title}</h3>
          <div className="flex items-center gap-2 text-sm bg-black/20 p-2 rounded-lg">
            <Clock size={16} />
            <span>{new Date(alert.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} (En &lt; 7 min)</span>
          </div>
        </div>

        <button 
          onClick={stopAlarm}
          className="mt-4 bg-white text-danger font-bold py-2 rounded-xl shadow-lg hover:bg-gray-100 transition-colors relative z-10"
        >
          Entendido, Detener Alarma
        </button>
      </div>
    </div>
  );
};

export default AlarmSystem;
