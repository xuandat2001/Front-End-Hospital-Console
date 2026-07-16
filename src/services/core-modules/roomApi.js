import { apiRequest } from '../config/config';

export const roomService = {
  getAllRooms: async () => {
    return await apiRequest('/rooms');
  },

  getRoomById: async (id) => {
    return await apiRequest(`/rooms/${id}`);
  },

  createRoom: async (roomData) => {
    return await apiRequest('/rooms', {
      method: 'POST',
      body: JSON.stringify(roomData),
    });
  },

  updateRoom: async (id, roomData) => {
    return await apiRequest(`/rooms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(roomData),
    });
  },

  deleteRoom: async (id) => {
    return await apiRequest(`/rooms/${id}`, {
      method: 'DELETE',
    });
  },

  updateOccupiedBeds: async (id, delta) => {
    return await apiRequest(`/rooms/${id}/occupied-beds`, {
      method: 'PUT',
      body: JSON.stringify({ delta }),
    });
  },

  getOccupancySummary: async () => {
    return await apiRequest('/rooms/occupancy');
  },
};
