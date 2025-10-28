import { useEffect, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
import { io } from 'socket.io-client';

const SocketManager = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    if (user && !socketRef.current) {
      // Connect to the external Socket.IO server
      socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_SERVER_URL, {
        transports: ['websocket'],
        auth: {
          token: localStorage.getItem('token') // Assuming JWT token is stored in localStorage
        }
      });

      socketRef.current.on('connect', () => {
        console.log('Connected to Socket.IO server');
      });

      socketRef.current.on('disconnect', () => {
        console.log('Disconnected from Socket.IO server');
      });

      socketRef.current.on('connect_error', (error) => {
        console.log('Socket connection error:', error.message);
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user]);

  // Make socket available globally if needed (similar to global.io)
  if (typeof window !== 'undefined') {
    window.socket = socketRef.current;
  }

  return children;
};

export default SocketManager;
