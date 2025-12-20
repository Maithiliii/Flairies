import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { API_URL } from '@env';
import InAppNotification from '../components/InAppNotification';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning';
}

interface NotificationContextType {
  showNotification: (title: string, message: string, type?: 'success' | 'info' | 'warning') => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notification, setNotification] = useState<Notification | null>(null);
  const user = useSelector((state: RootState) => state.auth.user);

  // Poll for new notifications every 10 seconds
  useEffect(() => {
    if (!user) return;

    const checkNotifications = async () => {
      try {
        const response = await fetch(`${API_URL}/api/notifications/check/?email=${encodeURIComponent(user.email)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.has_new) {
            showNotification(data.title, data.message, 'info');
          }
        }
      } catch (error) {
        console.log('Failed to check notifications:', error);
      }
    };

    // Check immediately
    checkNotifications();

    // Then check every 10 seconds
    const interval = setInterval(checkNotifications, 10000);

    return () => clearInterval(interval);
  }, [user]);

  const showNotification = (title: string, message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    const id = Date.now().toString();
    setNotification({ id, title, message, type });
  };

  const hideNotification = () => {
    setNotification(null);
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {notification && (
        <InAppNotification
          visible={!!notification}
          title={notification.title}
          message={notification.message}
          type={notification.type}
          onClose={hideNotification}
        />
      )}
    </NotificationContext.Provider>
  );
};
