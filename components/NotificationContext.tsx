
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { db } from '../services/db';
import { TaskStatus } from '../types';
import { isPast } from 'date-fns';
import { Bell, X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  addNotification: (notification: Omit<Notification, 'id'>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notifiedTasksRef = useRef<Set<string>>(new Set());

  const addNotification = ({ title, message, type }: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications((prev) => [...prev, { id, title, message, type }]);

    // Auto remove after 5 seconds
    setTimeout(() => {
      removeNotification(id);
    }, 5000);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Background Worker: Check for Overdue Tasks
  useEffect(() => {
    const checkOverdueTasks = async () => {
      const tasks = await db.getTasks();

      tasks.forEach(task => {
        if (task.status === TaskStatus.PENDING || task.status === TaskStatus.OVERDUE) {
          const dueDate = new Date(task.dueDate);
          // If task is past due and we haven't notified yet in this session
          if (isPast(dueDate) && !notifiedTasksRef.current.has(task.id)) {
            // Add to set immediately to prevent double firing
            notifiedTasksRef.current.add(task.id);

            addNotification({
              title: 'Tarea Vencida',
              message: `La tarea "${task.title}" ha vencido.`,
              type: 'warning'
            });

            // Optional: Update status in DB if needed, but purely UI for now
          }
        }
      });
    };

    // Run check immediately and then every 60 seconds
    checkOverdueTasks();
    const interval = setInterval(checkOverdueTasks, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}

      {/* Notification Container (Fixed Position) */}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-3 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`pointer-events-auto transform transition-all duration-300 ease-in-out animate-in slide-in-from-right-5 flex items-start gap-3 p-4 rounded-xl shadow-lg border backdrop-blur-md ${notification.type === 'success' ? 'bg-emerald-500/90 text-white border-emerald-600' :
                notification.type === 'error' ? 'bg-red-500/90 text-white border-red-600' :
                  notification.type === 'warning' ? 'bg-amber-500/90 text-white border-amber-600' :
                    'bg-primary/90 text-white border-primary'
              }`}
          >
            <div className="mt-0.5 shrink-0">
              {notification.type === 'success' && <CheckCircle size={20} />}
              {notification.type === 'error' && <AlertCircle size={20} />}
              {notification.type === 'warning' && <AlertTriangle size={20} />}
              {notification.type === 'info' && <Bell size={20} />}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm">{notification.title}</h4>
              <p className="text-sm opacity-90 leading-snug">{notification.message}</p>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="shrink-0 text-white/70 hover:text-white transition-colors p-1"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};
