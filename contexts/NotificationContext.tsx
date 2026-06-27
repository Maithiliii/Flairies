import React, { createContext, useContext, useState } from 'react';
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
