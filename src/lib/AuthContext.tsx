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
    if (user && typeof window !== 'undefined' && (window as any).socket) {
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
        console.log('📬 Received new notification via socket:', notification.title);

        // Add default properties if missing
        const completeNotification: Notification = {
          ...notification,
          isRead: false,
          createdAt: notification.createdAt || new Date().toISOString(),
        };

        setNotifications(prev => {
          const newNotifications = [completeNotification, ...prev];
          console.log('📱 Updated notifications state (socket), count:', newNotifications.length);
          // Force re-render by ensuring reference changes
          return [...newNotifications];
        });
        setUnreadNotificationsCount(prev => prev + 1);

        // Call all registered callbacks
        notificationCallbacks.current.forEach(callback => callback(completeNotification));
        console.log('📬 Called notification callbacks');
      };

      const handleConnectError = (error: { message: string }) => {
        console.error('❌ Socket connection error:', error.message);
        setIsSocketConnected(false);
      };

      globalSocket.on('connect', handleConnect);
      globalSocket.on('disconnect', handleDisconnect);
      globalSocket.on('notification', handleNotification);
      globalSocket.on('connect_error', handleConnectError);

      // Set initial connection state
      setIsSocketConnected(globalSocket.connected);

      // Cleanup function
      return () => {
        globalSocket.off('connect', handleConnect);
        globalSocket.off('disconnect', handleDisconnect);
        globalSocket.off('notification', handleNotification);
        globalSocket.off('connect_error', handleConnectError);
      };
    }
  }, [user]);



  // Notification polling every 60 seconds - merge with real-time data
  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('/api/notifications?limit=20', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            const polledNotifications = data.data;
            const newUnreadCount = data.unreadCount || 0;

            // Merge notifications: prefer real-time notifications, supplement with polled data
            setNotifications(prev => {
              // Create a map of existing notifications for fast lookup
              const existingMap = new Map(prev.map(n => [n.id, n]));
              const mergedNotifications = [...prev];

              // Add any missing notifications from poll (but don't replace existing ones)
              polledNotifications.forEach((polledNotif) => {
                if (!existingMap.has(polledNotif.id)) {
                  mergedNotifications.push(polledNotif as Notification);
                }
              });

              // Sort by creation date (newest first) and limit to 20
              return mergedNotifications
                .sort((a: Notification, b: Notification) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 20);
            });

            // Update unread count
            setUnreadNotificationsCount(newUnreadCount);

          }
        }
      } catch (error) {
        console.warn('Failed to fetch notifications:', error);
      }
    };

    // Initial fetch
    fetchNotifications();

    // Set up periodic polling every 60 seconds - system-wide cache revalidation baseline
    const interval = setInterval(fetchNotifications, 60000);

    return () => clearInterval(interval);
  }, [user]);

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
