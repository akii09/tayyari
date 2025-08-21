"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { CheckIcon, AlertTriangleIcon, InfoIcon, XIcon } from "@/components/icons/Icons";

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  actions?: NotificationAction[];
  persistent?: boolean;
}

export interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

interface NotificationContextType {
  notifications: Notification[];
  showNotification: (notification: Omit<Notification, 'id'>) => string;
  hideNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = (notification: Omit<Notification, 'id'>): string => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration ?? 5000
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove notification after duration (unless persistent)
    if (!notification.persistent && newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        hideNotification(id);
      }, newNotification.duration);
    }

    return id;
  };

  const hideNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Global notification function for window object
  useEffect(() => {
    (window as any).showNotification = showNotification;
    return () => {
      delete (window as any).showNotification;
    };
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      showNotification,
      hideNotification,
      clearAllNotifications
    }}>
      {children}
      <NotificationContainer 
        notifications={notifications}
        onHide={hideNotification}
      />
    </NotificationContext.Provider>
  );
}

interface NotificationContainerProps {
  notifications: Notification[];
  onHide: (id: string) => void;
}

function NotificationContainer({ notifications, onHide }: NotificationContainerProps) {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
      {notifications.map((notification, index) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onHide={onHide}
          index={index}
        />
      ))}
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onHide: (id: string) => void;
  index: number;
}

function NotificationItem({ notification, onHide, index }: NotificationItemProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Animate in
    setTimeout(() => setIsVisible(true), 50);
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onHide(notification.id);
    }, 300);
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckIcon className="w-5 h-5 text-green-400" />;
      case 'error':
        return <AlertTriangleIcon className="w-5 h-5 text-red-400" />;
      case 'warning':
        return <AlertTriangleIcon className="w-5 h-5 text-yellow-400" />;
      case 'info':
        return <InfoIcon className="w-5 h-5 text-blue-400" />;
      default:
        return <InfoIcon className="w-5 h-5 text-text-secondary" />;
    }
  };

  const getColorClasses = () => {
    switch (notification.type) {
      case 'success':
        return 'border-green-500/20 bg-green-500/5';
      case 'error':
        return 'border-red-500/20 bg-red-500/5';
      case 'warning':
        return 'border-yellow-500/20 bg-yellow-500/5';
      case 'info':
        return 'border-blue-500/20 bg-blue-500/5';
      default:
        return 'border-glass-border bg-bg-secondary/50';
    }
  };

  return (
    <div
      className={`
        bg-bg-secondary/95 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-lg
        transition-all duration-300 ease-out
        ${getColorClasses()}
        ${isVisible && !isExiting 
          ? 'opacity-100 translate-x-0 scale-100' 
          : 'opacity-0 translate-x-full scale-95'
        }
      `}
      style={{ 
        animationDelay: `${index * 100}ms`,
        maxWidth: '400px'
      }}
      role="alert"
      aria-live={notification.type === 'error' ? 'assertive' : 'polite'}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-text-primary mb-1">
            {notification.title}
          </h4>
          <p className="text-sm text-text-secondary leading-relaxed">
            {notification.message}
          </p>
          
          {notification.actions && notification.actions.length > 0 && (
            <div className="flex gap-2 mt-3">
              {notification.actions.map((action, actionIndex) => (
                <button
                  key={actionIndex}
                  onClick={() => {
                    action.action();
                    handleClose();
                  }}
                  className={`
                    px-3 py-1.5 text-xs font-medium rounded transition-colors
                    ${action.style === 'primary' 
                      ? 'bg-electric-blue hover:bg-electric-blue/90 text-white'
                      : action.style === 'danger'
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-bg-tertiary hover:bg-bg-elevated text-text-primary'
                    }
                  `}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {!notification.persistent && (
          <button
            onClick={handleClose}
            className="flex-shrink-0 p-1 rounded hover:bg-bg-tertiary transition-colors"
            aria-label="Close notification"
          >
            <XIcon className="w-4 h-4 text-text-muted" />
          </button>
        )}
      </div>
    </div>
  );
}

// Utility functions for common notification types
export const notificationUtils = {
  success: (title: string, message: string, actions?: NotificationAction[]) => ({
    type: 'success' as const,
    title,
    message,
    actions
  }),

  error: (title: string, message: string, actions?: NotificationAction[]) => ({
    type: 'error' as const,
    title,
    message,
    actions,
    duration: 8000 // Longer duration for errors
  }),

  warning: (title: string, message: string, actions?: NotificationAction[]) => ({
    type: 'warning' as const,
    title,
    message,
    actions
  }),

  info: (title: string, message: string, actions?: NotificationAction[]) => ({
    type: 'info' as const,
    title,
    message,
    actions
  }),

  persistent: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string, actions?: NotificationAction[]) => ({
    type,
    title,
    message,
    actions,
    persistent: true,
    duration: 0
  })
};
