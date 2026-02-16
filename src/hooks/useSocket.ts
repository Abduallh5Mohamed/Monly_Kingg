'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketOptions {
  autoConnect?: boolean;
}

export function useSocket(options: UseSocketOptions = {}) {
  const { autoConnect = true } = options;
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!autoConnect) return;

    // Get token from cookies
    const getToken = () => {
      const cookies = document.cookie.split(';');
      const tokenCookie = cookies.find(c => c.trim().startsWith('authToken='));
      return tokenCookie ? tokenCookie.split('=')[1] : null;
    };

    const token = getToken();
    if (!token) {
      console.log('No token found, skipping socket connection');
      return;
    }

    // Initialize socket connection
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;

    socketRef.current = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    const socket = socketRef.current;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('✅ Socket connected');
      setIsConnected(true);
      setError(null);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      setError(err.message);
      setIsConnected(false);
    });

    socket.on('error', (err) => {
      console.error('Socket error:', err);
      setError(err.message || 'Socket error');
    });

    return () => {
      console.log('🔌 Cleaning up socket connection');
      socket.disconnect();
    };
  }, [autoConnect]);

  const on = (event: string, callback: (...args: any[]) => void) => {
    socketRef.current?.on(event, callback);
  };

  const off = (event: string, callback?: (...args: any[]) => void) => {
    if (callback) {
      socketRef.current?.off(event, callback);
    } else {
      socketRef.current?.off(event);
    }
  };

  const emit = (event: string, ...args: any[]) => {
    socketRef.current?.emit(event, ...args);
  };

  return {
    socket: socketRef.current,
    isConnected,
    error,
    on,
    off,
    emit,
  };
}
