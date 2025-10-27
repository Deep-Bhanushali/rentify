'use client';

import { AuthProvider } from '@/lib/AuthContext';
import SocketManager from './SocketManager';

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SocketManager>
        {children}
      </SocketManager>
    </AuthProvider>
  );
}
