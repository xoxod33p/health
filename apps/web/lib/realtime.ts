import { io, type Socket } from 'socket.io-client';
import { getSession } from './api';

function getRealtimeUrl(): string {
  if (typeof window !== 'undefined') {
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return window.location.origin;
    }
    return process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1$/, '') ?? 'http://localhost:3001';
  }
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1$/, '') ?? 'http://localhost:3001';
}

export async function connectRealtime(onChange: () => void): Promise<() => void> {
  const { data, error } = await getSession();
  if (error || !data.session) return () => undefined;
  const realtimeUrl = getRealtimeUrl();
  const socket: Socket = io(`${realtimeUrl}/realtime`, { auth: { token: data.session.access_token }, transports: ['websocket'] });
  socket.on('customer.changed', onChange);
  socket.on('sensor.changed', onChange);
  socket.on('dashboard.updated', onChange);
  return () => socket.disconnect();
}
