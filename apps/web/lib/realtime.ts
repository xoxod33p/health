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

export interface PresenceChangePayload {
  email: string;
  authUserId: string;
  online: boolean;
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

export async function connectPresence(
  onPresenceChange: (presence: PresenceChangePayload) => void,
  onPresenceState?: (onlineEmails: string[]) => void
): Promise<() => void> {
  const { data, error } = await getSession();
  if (error || !data.session) return () => undefined;
  const realtimeUrl = getRealtimeUrl();
  const socket: Socket = io(`${realtimeUrl}/realtime`, { auth: { token: data.session.access_token }, transports: ['websocket'] });

  socket.on('presence.state', (state: { onlineEmails?: string[] }) => {
    if (onPresenceState && Array.isArray(state?.onlineEmails)) {
      onPresenceState(state.onlineEmails);
    }
  });

  socket.on('realtime.ready', (payload: { onlineEmails?: string[] }) => {
    if (onPresenceState && Array.isArray(payload?.onlineEmails)) {
      onPresenceState(payload.onlineEmails);
    }
  });

  socket.on('presence.changed', (payload: PresenceChangePayload) => {
    if (payload && typeof payload.email === 'string') {
      onPresenceChange(payload);
    }
  });

  return () => socket.disconnect();
}
