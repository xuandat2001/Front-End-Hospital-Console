import { useCallback, useEffect, useMemo, useState } from 'react';
import { roomService } from '../services/core-modules/roomApi';

const POLL_INTERVAL = 15000;

export default function useRoomOccupancy() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connectionState] = useState('connected');

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

    const pollTimer = setInterval(refresh, POLL_INTERVAL);

    return () => {
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
