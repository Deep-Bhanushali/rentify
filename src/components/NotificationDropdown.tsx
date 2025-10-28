'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Check, X, Calendar, DollarSign, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

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

interface NotificationDropdownProps {
  unreadCount: number;
  onMarkAllRead: () => void;
  onMarkRead?: (notificationId: string) => void;
}

export function NotificationDropdown({ unreadCount, onMarkAllRead, onMarkRead }: NotificationDropdownProps) {
  const { notifications: realTimeNotifications, onNewNotification } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Update local notifications when real-time notifications change
  useEffect(() => {
    setNotifications(realTimeNotifications.slice(0, 10)); // Show latest 10
  }, [realTimeNotifications]);

  // Fetch initial notifications on mount
  useEffect(() => {
    const fetchInitialNotifications = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('/api/notifications?limit=10', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setNotifications(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    if (realTimeNotifications.length === 0) {
      fetchInitialNotifications();
    }
  }, [realTimeNotifications.length]);

  // Listen for new notifications
  useEffect(() => {
    const unsubscribe = onNewNotification((newNotification) => {
      // Play notification sound (optional)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(newNotification.title, {
          body: newNotification.message,
        });
      }

      // Update local state immediately
      setNotifications(prev => [newNotification, ...prev.slice(0, 9)]);
    });

    return unsubscribe;
  }, [onNewNotification]);

  // Mark single notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/notifications/mark-read', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationIds: [notificationId] }),
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === notificationId ? { ...notif, isRead: true } : notif
          )
        );
        onMarkRead?.(notificationId);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Toggle dropdown
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_request':
        return <Calendar className="w-4 h-4 text-blue-600" />;
      case 'approved':
        return <Check className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <X className="w-4 h-4 text-red-600" />;
      case 'payment_received':
        return <DollarSign className="w-4 h-4 text-green-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    }
  };

  // Get notification color class
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'new_request':
        return 'border-blue-200 bg-blue-50';
      case 'approved':
        return 'border-green-200 bg-green-50';
      case 'rejected':
        return 'border-red-200 bg-red-50';
      case 'payment_received':
        return 'border-green-200 bg-green-50';
      default:
        return 'border-yellow-200 bg-yellow-50';
    }
  };

  return (
    <div className="relative">
      {/* Notification button */}
      <button
        ref={buttonRef}
        type="button"
        className="relative rounded-full bg-white p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:text-blue-600 focus:bg-blue-50"
        onClick={toggleDropdown}
      >
        <span className="sr-only">View notifications</span>
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 z-50 mt-2 w-80 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="text-xs text-blue-600 hover:text-blue-500 font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}

          {/* Notifications list */}
          {!loading && (
            <div className="max-h-96 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 border-l-4 ${getNotificationColor(notification.type)} ${
                      !notification.isRead ? 'border-l-opacity-100' : 'border-l-opacity-30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 w-full">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          {notification.rentalRequest && (
                            <p className="text-xs text-gray-500 mt-1">
                              For: {notification.rentalRequest.product.title}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(notification.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {!notification.isRead && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="ml-2 text-blue-600 hover:text-blue-500 text-xs underline"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-6 text-center">
                  <Bell className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">No notifications</p>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="border-t px-4 py-3">
            <button
              type="button"
              className="text-sm text-blue-600 hover:text-blue-500 font-medium"
              onClick={() => {
                // Could navigate to a dedicated notifications page
                setIsOpen(false);
              }}
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
