import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { roomService } from '../../../services/core-modules/roomApi';
import { hospitalService } from '../../../services/core-modules/hospitalApi';

export default function RoomManagement({ selectedRoomId }) {
  const [rooms, setRooms] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);

  const [formData, setFormData] = useState({
    ellyId: '',
    roomNumber: '',
    hospitalId: '',
    departmentId: '',
    roomType: 'GENERAL_WARD',
    floor: '',
    capacity: 8,
    occupiedBeds: 0,
    status: 'AVAILABLE',
  });

  const roomTypes = ['GENERAL_WARD', 'PRIVATE', 'ICU', 'EMERGENCY', 'SURGERY'];
  const statuses = ['AVAILABLE', 'FULL', 'MAINTENANCE'];

  const loadRooms = async () => {
    try {
      setLoading(true);
      const response = await roomService.getAllRooms();
      setRooms(response.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadHospitals = async () => {
    try {
      const response = await hospitalService.getAllHospitals();
      setHospitals(response.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const loadDepartments = async () => {
    try {
      const depts = await hospitalService.getAllDepartmentsList();
      setDepartments(depts || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadRooms();
    loadHospitals();
    loadDepartments();
  }, []);

  const resetForm = () => {
    setEditingRoom(null);
    setFormData({
      ellyId: '',
      roomNumber: '',
      hospitalId: '',
      departmentId: '',
      roomType: 'GENERAL_WARD',
      floor: '',
      capacity: 8,
      occupiedBeds: 0,
      status: 'AVAILABLE',
    });
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleCreate = async () => {
    try {
      await roomService.createRoom(formData);
      setShowForm(false);
      resetForm();
      loadRooms();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleUpdate = async () => {
    try {
      await roomService.updateRoom(editingRoom._id, formData);
      setShowForm(false);
      resetForm();
      loadRooms();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm('Delete this room?');
    if (!confirmed) return;
    try {
      await roomService.deleteRoom(id);
      loadRooms();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleEdit = (room) => {
    setEditingRoom(room);
    setFormData({
      ellyId: room.ellyId || '',
      roomNumber: room.roomNumber || '',
      hospitalId: room.hospitalId || '',
      departmentId: room.departmentId || '',
      roomType: room.roomType || 'GENERAL_WARD',
      floor: room.floor || '',
      capacity: room.capacity || 8,
      occupiedBeds: room.occupiedBeds || 0,
      status: room.status || 'AVAILABLE',
    });
    setShowForm(true);
  };

  useEffect(() => {
    if (!selectedRoomId || rooms.length === 0) return;
    const room = rooms.find((r) => r.ellyId === selectedRoomId || r._id === selectedRoomId);
    if (room) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setEditingRoom(room);
      setFormData({
        ellyId: room.ellyId || '',
        roomNumber: room.roomNumber || '',
        hospitalId: room.hospitalId || '',
        departmentId: room.departmentId || '',
        roomType: room.roomType || 'GENERAL_WARD',
        floor: room.floor || '',
        capacity: room.capacity || 8,
        occupiedBeds: room.occupiedBeds || 0,
        status: room.status || 'AVAILABLE',
      });
      setShowForm(true);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [selectedRoomId, rooms]);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between text-black">
        <div>
          <h1 className="text-2xl font-bold">Room Management</h1>
          <p className="text-sm text-slate-500">Create, update and manage rooms</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="rounded-lg bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-700"
        >
          + Add Room
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              <th className="p-4 text-left">Room</th>
              <th className="p-4 text-left">Type</th>
              <th className="p-4 text-left">Floor</th>
              <th className="p-4 text-left">Beds</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading &&
              rooms.map((room) => (
                <tr
                  key={room._id}
                  className="border-t border-slate-200 dark:border-slate-700"
                >
                  <td className="p-4">
                    <div className="font-medium">{room.roomNumber}</div>
                    <div className="text-xs text-slate-500">{room.ellyId}</div>
                  </td>
                  <td className="p-4">{room.roomType}</td>
                  <td className="p-4">{room.floor || '-'}</td>
                  <td className="p-4">
                    <span className={
                      room.occupiedBeds >= room.capacity
                        ? 'text-red-600 font-semibold'
                        : 'text-green-600'
                    }>
                      {room.occupiedBeds} / {room.capacity}
                    </span>
                  </td>
                  <td className="p-4">{room.status}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(room)}
                        className="rounded bg-amber-500 px-3 py-1 text-white"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(room._id)}
                        className="rounded bg-red-600 px-3 py-1 text-white"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {showForm && createPortal(
        <div
          className="console-tinted-popup-layer fixed inset-0 z-[12000] flex items-center justify-center bg-black/60 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="room-form-title"
        >
          <div className="console-tinted-popup max-h-full w-full max-w-3xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h2 id="room-form-title" className="mb-6 text-xl font-bold">
              {editingRoom ? 'Edit Room' : 'Create Room'}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <input
                name="ellyId"
                value={formData.ellyId}
                onChange={handleChange}
                placeholder="Room ID (unique)"
                className="rounded border p-3 bg-slate-800 text-white border-slate-600"
              />
              <input
                name="roomNumber"
                value={formData.roomNumber}
                onChange={handleChange}
                placeholder="Room Number"
                className="rounded border p-3 bg-slate-800 text-white border-slate-600"
              />
              <select
                name="hospitalId"
                value={formData.hospitalId}
                onChange={handleChange}
                className="rounded border p-3 bg-slate-800 text-white border-slate-600"
              >
                <option value="">Select Hospital</option>
                {hospitals.map((h) => (
                  <option key={h.ellyHospitalId} value={h.ellyHospitalId}>
                    {h.hospitalName}
                  </option>
                ))}
              </select>
              <select
                name="departmentId"
                value={formData.departmentId}
                onChange={handleChange}
                className="rounded border p-3 bg-slate-800 text-white border-slate-600"
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d.ellyDepartmentId || d._id} value={d.ellyDepartmentId || d._id}>
                    {d.name || d.specialty || d.ellyDepartmentId}
                  </option>
                ))}
              </select>
              <select
                name="roomType"
                value={formData.roomType}
                onChange={handleChange}
                className="rounded border p-3 bg-slate-800 text-white border-slate-600"
              >
                {roomTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <input
                name="floor"
                value={formData.floor}
                onChange={handleChange}
                placeholder="Floor"
                className="rounded border p-3 bg-slate-800 text-white border-slate-600"
              />
              <div className="flex gap-4">
                <input
                  type="number"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                  placeholder="Capacity"
                  className="w-full rounded border p-3 bg-slate-800 text-white border-slate-600"
                />
                <input
                  type="number"
                  name="occupiedBeds"
                  value={formData.occupiedBeds}
                  onChange={handleChange}
                  placeholder="Occupied"
                  className="w-full rounded border p-3 bg-slate-800 text-white border-slate-600"
                />
              </div>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="rounded border p-3 bg-slate-800 text-white border-slate-600"
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="rounded border px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={editingRoom ? handleUpdate : handleCreate}
                className="rounded bg-teal-600 px-4 py-2 text-white"
              >
                {editingRoom ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
