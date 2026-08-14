export const APPOINTMENT_SOCKET_URL = "mock://elly-prototype/appointments";
export const APPOINTMENT_SOCKET_PATH = "/mock/socket.io";

export function connectAppointmentRealtime({
  onReady,
  onChanged,
  onDisconnect,
} = {}) {
  let connected = true;
  const readyTimer = globalThis.setTimeout(() => {
    if (!connected) return;
    onReady?.();
  }, 120);
  const refreshTimer = globalThis.setInterval(() => {
    if (!connected) return;
    onChanged?.();
  }, 30000);

  return {
    connected,
    disconnect() {
      connected = false;
      globalThis.clearTimeout(readyTimer);
      globalThis.clearInterval(refreshTimer);
      onDisconnect?.();
    },
  };
}
