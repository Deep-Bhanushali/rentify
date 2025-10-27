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

  const socketRef = useRef<Socket | null>(null);
  const connectionAttempted = useRef(false);

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

  // Socket connection management
  const connectSocket = (authToken?: string) => {
    if (socketRef.current?.connected || connectionAttempted.current) return;

    connectionAttempted.current = true;
    const token = authToken || localStorage.getItem('token');

    if (!token) {
      console.warn('No token available for socket connection');
      return;
    }

    console.log('Attempting socket connection with token...', {
      hasToken: !!token,
      tokenPreview: token ? token.substring(0, 20) + '...' : 'no-token'
    });

    const newSocket = io(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000', {
      auth: {
        token: token
      },
      autoConnect: true,
      timeout: 10000,
    });

    newSocket.on('connect', () => {
      console.log('✓ Connected to socket server successfully');
      setIsSocketConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Disconnected from socket server:', reason);
      setIsSocketConnected(false);
    });

    newSocket.on('new-notification', (notification: Notification) => {
      console.log('📬 Received new notification:', notification.title);
      setNotifications(prev => [notification, ...prev]);
      setUnreadNotificationsCount(prev => prev + 1);

      // Call all registered callbacks
      notificationCallbacks.current.forEach(callback => callback(notification));
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      connectionAttempted.current = false;
      // Reset connection attempt after a delay
      setTimeout(() => {
        connectionAttempted.current = false;
      }, 5000);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
  };

  const disconnectSocket = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      connectionAttempted.current = false;
    }
    setSocket(null);
    setIsSocketConnected(false);
    setNotifications([]);
  };

  // Register notification callback
  const onNewNotification = (callback: (notification: Notification) => void) => {
    notificationCallbacks.current.push(callback);
    return () => {
      notificationCallbacks.current = notificationCallbacks.current.filter(cb => cb !== callback);
    };
  };

  const login = (token: string, userData?: User) => {
    // Disconnect any existing socket first
    disconnectSocket();

    localStorage.setItem('token', token);

    const user = userData || {
      id: 'temp', // We'll fetch real user data if not provided
      name: 'User',
      email: 'user@example.com',
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);

    // Connect socket immediately after login with fresh token
    setTimeout(() => connectSocket(token), 100);

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
    disconnectSocket();
    setNotifications([]);
  };

  const updatePendingRequestsCount = (count: number) => {
    setPendingRequestsCount(count);
  };

  const updateUnreadNotificationsCount = (count: number) => {
    setUnreadNotificationsCount(count);
  };

  // Connect socket when user logs in (only for auto-login from localStorage)
  useEffect(() => {
    if (user && !socket) {
      // Only connect if not already connecting (manual login handles connection)
      connectSocket();
    }
  }, [user]);

  // Disconnect socket when user logs out
  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, []);

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
