'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';

// ─── Types ───────────────────────────────────────
// Define Socket type locally to avoid importing from socket.io-client (which causes webpack issues in SSR)
type Socket = any;

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  /** Subscribe to a socket event. Returns an unsubscribe function. */
  on: (event: string, callback: (...args: any[]) => void) => () => void;
  emit: (event: string, ...args: any[]) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  on: () => () => { },
  emit: () => { },
});

export const useSocket = () => useContext(SocketContext);

// ─── Provider ────────────────────────────────────
export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { isAuthenticated } = useAuth();

  // Connect / disconnect based on auth status
  useEffect(() => {
    // Only connect when user is authenticated and in browser
    if (!isAuthenticated || typeof window === 'undefined') {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Already connected — skip
    if (socketRef.current?.connected) return;

    let cancelled = false;

    // Dynamic import so socket.io-client is never bundled on the server
    import('socket.io-client').then(({ io }) => {
      if (cancelled) return;

      const socket = io(window.location.origin, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity,
        timeout: 10000,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('✅ Socket.IO connected:', socket.id);
        setIsConnected(true);
      });

      socket.on('disconnect', (reason) => {
        console.log('🔌 Socket.IO disconnected:', reason);
        setIsConnected(false);
      });

      socket.on('connect_error', (err) => {
        console.warn('⚠️ Socket.IO connection error:', err.message);
        setIsConnected(false);
      });

      socket.io.on('reconnect', (attempt) => {
        console.log(`♻️ Socket.IO reconnected after ${attempt} attempts`);
      });
    });

    return () => {
      cancelled = true;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
    };
  }, [isAuthenticated]);

  // Stable `on` — subscribe & return unsubscribe
  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    socketRef.current?.on(event, callback);
    return () => {
      socketRef.current?.off(event, callback);
    };
  }, []);

  // Stable `emit`
  const emit = useCallback((event: string, ...args: any[]) => {
    socketRef.current?.emit(event, ...args);
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected, on, emit }}>
      {children}
    </SocketContext.Provider>
  );
}
