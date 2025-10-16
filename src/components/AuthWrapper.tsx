'use client';

import { AuthProvider } from '@/lib/AuthContext';

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
