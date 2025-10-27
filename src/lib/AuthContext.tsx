'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  rentalRequest?: {
    id: string;
    product: {
      title: string;
    };
  };
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  login: (token: string, user?: User) => void;
  logout: () => void;
  updatePendingRequestsCount: (count: number) => void;
  updateUnreadNotificationsCount: (count: number) => void;
  pendingRequestsCount: number;
  unreadNotificationsCount: number;
  socket: Socket | null;
  isSocketConnected: boolean;
  notifications: Notification[];
  onNewNotification: (callback: (notification: Notification) => void) => () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notificationCallbacks = useRef<((notification: Notification) => void)[]>([]);

  const isLoggedIn = !!user;

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);

        // Fetch initial counts
        fetchPendingRequestsCount(token);
        fetchUnreadNotificationsCount(token);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  // Fetch pending requests count
  const fetchPendingRequestsCount = async (token: string) => {
    try {
      const response = await fetch('/api/rental-requests?status=pending&asOwner=true', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Only count truly pending requests (status = 'pending'), exclude cancelled ones
          const trulyPendingRequests = data.data.filter((request: { status: string }) => request.status === 'pending');
          setPendingRequestsCount(trulyPendingRequests.length);
        }
      }
    } catch (error) {
      console.error('Error fetching pending requests count:', error);
    }
  };

  // Fetch unread notifications count
  const fetchUnreadNotificationsCount = async (token: string) => {
    try {
      const response = await fetch('/api/notifications?limit=1', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUnreadNotificationsCount(data.unreadCount || 0);
        }
      }
    } catch (error) {
      console.error('Error fetching unread notifications count:', error);
    }
  };

  // Socket connection management - use global socket from SocketManager
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).socket) {
      const globalSocket = (window as any).socket as Socket;

      setSocket(globalSocket);

      const handleConnect = () => {
        console.log('✓ Socket connection established');
        setIsSocketConnected(true);
      };

      const handleDisconnect = (reason: string) => {
        console.log('Socket disconnected:', reason);
        setIsSocketConnected(false);
      };

      const handleNotification = (notification: Notification) => {
        console.log('📬 Received new notification:', notification.title);
        setNotifications(prev => [notification, ...prev]);
        setUnreadNotificationsCount(prev => prev + 1);

        // Call all registered callbacks
        notificationCallbacks.current.forEach(callback => callback(notification));
      };

      const handleConnectError = (error: { message: string }) => {
        console.error('❌ Socket connection error:', error.message);
        setIsSocketConnected(false);
      };

      globalSocket.on('connect', handleConnect);
      globalSocket.on('disconnect', handleDisconnect);
      globalSocket.on('new-notification', handleNotification);
      globalSocket.on('connect_error', handleConnectError);

      // Set initial connection state
      setIsSocketConnected(globalSocket.connected);

      // Cleanup function
      return () => {
        globalSocket.off('connect', handleConnect);
        globalSocket.off('disconnect', handleDisconnect);
        globalSocket.off('new-notification', handleNotification);
        globalSocket.off('connect_error', handleConnectError);
      };
    }
  }, []);

  // Register notification callback
  const onNewNotification = (callback: (notification: Notification) => void) => {
    notificationCallbacks.current.push(callback);
    return () => {
      notificationCallbacks.current = notificationCallbacks.current.filter(cb => cb !== callback);
    };
  };

  const login = (token: string, userData?: User) => {
    localStorage.setItem('token', token);

    const user = userData || {
      id: 'temp', // We'll fetch real user data if not provided
      name: 'User',
      email: 'user@example.com',
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);

    // Socket connection is handled by SocketManager automatically
    // Fetch counts after login
    fetchPendingRequestsCount(token);
    fetchUnreadNotificationsCount(token);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setPendingRequestsCount(0);
    setUnreadNotificationsCount(0);
    setNotifications([]);
  };

  const updatePendingRequestsCount = (count: number) => {
    setPendingRequestsCount(count);
  };

  const updateUnreadNotificationsCount = (count: number) => {
    setUnreadNotificationsCount(count);
  };



  const value = {
    user,
    isLoggedIn,
    login,
    logout,
    updatePendingRequestsCount,
    updateUnreadNotificationsCount,
    pendingRequestsCount,
    unreadNotificationsCount,
    socket,
    isSocketConnected,
    notifications,
    onNewNotification,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
