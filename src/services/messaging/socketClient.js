import { io } from "socket.io-client";
import useSessionStore from "../../store/useSessionStore";
import { MOCK_MODE } from "../../mocks/mockSession";

export const MESSAGING_SOCKET_URL =
  import.meta.env.VITE_MESSAGING_SOCKET_URL || "http://localhost:8089";

let socket = null;

function createMockSocket(handlers = {}) {
  return {
    connected: true,
    on(eventName, handler) {
      if (eventName === "connect" || eventName === "connection:ready") {
        queueMicrotask(() => handler());
      }
      return this;
    },
    off() {
      return this;
    },
    emit(eventName, payload = {}) {
      if (eventName === "call:initiate") {
        handlers["call:initiate"]?.({
          call: {
            callId: `mock-call-${Date.now()}`,
            calleeEllyId: payload.calleeEllyId,
            conversationId: payload.conversationId,
          },
        });
      }
      return true;
    },
    disconnect() {},
  };
}

export function getMessagingSocket() {
  return socket;
}

export function connectMessagingSocket(handlers = {}) {
  const session = useSessionStore.getState();

  if (MOCK_MODE) {
    socket = createMockSocket(handlers);
    return socket;
  }

  if (socket?.connected) return socket;

  socket = io(MESSAGING_SOCKET_URL, {
    transports: ["websocket", "polling"],
    auth: {
      token: session.accessToken,
      ellyId: session.currentUser?.ellyId,
      role: session.role || session.currentUser?.role,
      departmentId:
        session.currentUser?.departmentId || session.activeWorkspace?.departmentId,
      hospitalId:
        session.activeWorkspace?.id || session.workspace?.id,
      ellyHospitalId:
        session.activeWorkspace?.workspaceEllyId ||
        session.activeWorkspace?.ellyHospitalId ||
        session.workspace?.ellyHospitalId,
    },
  });

  Object.entries(handlers).forEach(([eventName, handler]) => {
    socket.on(eventName, handler);
  });

  return socket;
}

export function disconnectMessagingSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
