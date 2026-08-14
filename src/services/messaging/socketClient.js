export const MESSAGING_SOCKET_URL = "mock://elly-prototype/messages";

let socket = null;

function createMockSocket(handlers = {}) {
  const listeners = new Map(Object.entries(handlers).map(([event, handler]) => [event, [handler]]));

  return {
    connected: false,
    on(eventName, handler) {
      listeners.set(eventName, [...(listeners.get(eventName) || []), handler]);
      return this;
    },
    emit(eventName, payload) {
      (listeners.get(eventName) || []).forEach((handler) => handler(payload));
      return this;
    },
    connect() {
      this.connected = true;
      globalThis.setTimeout(() => {
        (listeners.get("connect") || []).forEach((handler) => handler());
      }, 0);
      return this;
    },
    disconnect() {
      this.connected = false;
      (listeners.get("disconnect") || []).forEach((handler) => handler());
      return this;
    },
  };
}

export function getMessagingSocket() {
  return socket;
}

export function connectMessagingSocket(handlers = {}) {
  if (!socket) {
    socket = createMockSocket(handlers);
  }

  if (!socket.connected) socket.connect();
  return socket;
}

export function reconnectMessagingSocket() {
  if (!socket) return null;

  socket.disconnect();
  socket.connect();
  return socket;
}

export function disconnectMessagingSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
