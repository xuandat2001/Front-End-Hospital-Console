import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { MOCK_MODE } from '../mocks/mockSession';
import { roomService } from '../services/core-modules/roomApi';
import { gatewayUrl, hospitalIdentity } from '../services/emergency/emergencyRealtimeApi';

const POLL_INTERVAL = 15000;

export default function useRoomOccupancy() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connectionState, setConnectionState] = useState(MOCK_MODE ? 'mock' : 'connecting');
  const socketRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const res = await roomService.getOccupancySummary();
      setRooms(res.data || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(refresh);

    if (MOCK_MODE) {
      return;
    }

    const socket = io(gatewayUrl, {
      path: '/realtime/socket.io',
      auth: hospitalIdentity,
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on('connection:ready', () => {
      setConnectionState('connected');
      refresh();
    });

    socket.on('disconnect', () => setConnectionState('disconnected'));
    socket.on('connect_error', () => setConnectionState('disconnected'));

    socket.on('room:occupancy-changed', (payload) => {
      if (!payload?.roomId) return;
      setRooms((prev) =>
        prev.map((r) =>
          r._id === payload.roomId || r.ellyId === payload.roomId || r.roomNumber === payload.roomId
            ? { ...r, ...payload, bedsAvailable: payload.bedsAvailable, occupancyRate: payload.occupancyRate }
            : r
        )
      );
    });

    const pollTimer = setInterval(refresh, POLL_INTERVAL);

    return () => {
      socket.disconnect();
      clearInterval(pollTimer);
    };
  }, [refresh]);

  const totalBeds = useMemo(() => rooms.reduce((sum, r) => sum + (r.capacity || 0), 0), [rooms]);
  const occupiedBeds = useMemo(() => rooms.reduce((sum, r) => sum + (r.occupiedBeds || 0), 0), [rooms]);
  const availableBeds = totalBeds - occupiedBeds;
  const byRoomType = useMemo(() => {
    const map = {};
    for (const r of rooms) {
      const type = r.roomType || 'OTHER';
      if (!map[type]) map[type] = [];
      map[type].push(r);
    }
    return map;
  }, [rooms]);

  return useMemo(() => ({
    rooms,
    loading,
    error,
    connectionState,
    totalBeds,
    occupiedBeds,
    availableBeds,
    byRoomType,
    refresh,
  }), [rooms, loading, error, connectionState, totalBeds, occupiedBeds, availableBeds, byRoomType, refresh]);
}
