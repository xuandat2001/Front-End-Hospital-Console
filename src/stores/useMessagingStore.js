import { create } from "zustand";
import * as messagingApi from "../services/messaging/messagingApi";
import {
  connectMessagingSocket as connectSocket,
  disconnectMessagingSocket as disconnectSocket,
  getMessagingSocket,
  reconnectMessagingSocket as reconnectSocket,
} from "../services/messaging/socketClient";
import * as webrtcClient from "../services/messaging/webrtcClient";
import useSessionStore from "../store/useSessionStore";

let socketAuthRefreshAttempted = false;
let socketAuthRefreshPromise = null;

function getTotalUnread(unreadByConversation) {
  return Object.values(unreadByConversation).reduce(
    (total, value) => total + Number(value || 0),
    0,
  );
}

function getCurrentTimeLabel(value = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function normalizeEllyId(value) {
  return String(value || "").trim().toUpperCase();
}

function unwrapResponse(response, fallback = []) {
  return response?.data ?? response ?? fallback;
}

function getConversationId(conversation) {
  return String(conversation.id || conversation._id);
}

function getCurrentEllyId() {
  return normalizeEllyId(useSessionStore.getState().currentUser?.ellyId);
}

function getDirectPeer(conversation) {
  const currentEllyId = getCurrentEllyId();
  return (conversation.members || []).find(
    (member) => normalizeEllyId(member.ellyId) !== currentEllyId,
  );
}

function getPeerEllyId(conversation) {
  const currentEllyId = getCurrentEllyId();
  return (conversation.memberIds || []).find(
    (ellyId) => normalizeEllyId(ellyId) !== currentEllyId,
  );
}

function getPrefilledMemberEllyIds(conversation) {
  if (!conversation || conversation.type !== "DIRECT") return [];

  const peerEllyId = getPeerEllyId(conversation);
  return peerEllyId ? [normalizeEllyId(peerEllyId)] : [];
}

function mapConversation(conversation, unreadCount = 0) {
  const id = getConversationId(conversation);
  const lastMessage = conversation.lastMessage || {};
  const directPeer = conversation.type === "DIRECT" ? getDirectPeer(conversation) : null;
  const directPeerId = (conversation.memberIds || []).find(
    (ellyId) => normalizeEllyId(ellyId) !== getCurrentEllyId(),
  );
  const name =
    conversation.name ||
    directPeer?.fullName ||
    directPeerId ||
    (conversation.type === "DIRECT"
      ? "Direct message"
      : conversation.departmentName || conversation.departmentId || "Conversation");

  return {
    ...conversation,
    id,
    name,
    subtitle:
      conversation.type === "DEPARTMENT"
        ? `${conversation.departmentName || conversation.departmentId || "Department"} channel`
        : conversation.type === "DIRECT"
          ? directPeer?.role || "Direct message"
          : `${conversation.memberIds?.length || 0} members`,
    preview: lastMessage.content || "No messages yet",
    time: lastMessage.sentAt ? getCurrentTimeLabel(lastMessage.sentAt) : "",
    unread: unreadCount,
    tone:
      conversation.type === "DEPARTMENT"
        ? "danger"
        : conversation.type === "DIRECT"
          ? "staff"
          : "heart",
  };
}

function mapMessage(message) {
  const currentEllyId = getCurrentEllyId();
  const senderEllyId = normalizeEllyId(message.senderEllyId);
  const reactionsByEmoji = (message.reactions || []).reduce((map, reaction) => {
    map[reaction.emoji] = (map[reaction.emoji] || 0) + 1;
    return map;
  }, {});

  return {
    ...message,
    id: String(message.id || message._id),
    conversationId: String(message.conversationId),
    sender:
      senderEllyId === currentEllyId
        ? "You"
        : message.senderName || message.senderEllyId,
    time: message.createdAt ? getCurrentTimeLabel(message.createdAt) : "",
    isSelf: senderEllyId === currentEllyId,
    status: String(message.status || "sent").toLowerCase(),
    reactions: Object.entries(reactionsByEmoji).map(([emoji, count]) => ({
      emoji,
      count,
    })),
  };
}

function upsertById(items = [], nextItem) {
  const existingIndex = items.findIndex((item) => item.id === nextItem.id);

  if (existingIndex >= 0) {
    return items.map((item, index) =>
      index === existingIndex ? { ...item, ...nextItem } : item,
    );
  }

  return [nextItem, ...items];
}

function upsertMessage(messages = [], nextMessage) {
  const mapped = mapMessage(nextMessage);
  const existingIndex = messages.findIndex((message) => message.id === mapped.id);

  if (existingIndex >= 0) {
    return messages.map((message, index) =>
      index === existingIndex ? { ...message, ...mapped } : message,
    );
  }

  return [...messages, mapped];
}

const socketHandlers = {
  connect: () => {
    socketAuthRefreshAttempted = false;
    useMessagingStore.setState({ socketConnected: true, error: null });
  },
  disconnect: () => {
    useMessagingStore.setState({ socketConnected: false });
  },
  connect_error: (error) => {
    void useMessagingStore.getState().handleSocketConnectError(error);
  },
  "message:new": ({ conversationId, message, conversation }) => {
    useMessagingStore.getState().receiveMessage(conversationId, message, conversation);
  },
  "message:read": (payload) => {
    useMessagingStore.getState().setReadReceipt(payload);
  },
  "message:updated": ({ message }) => {
    useMessagingStore.getState().replaceMessage(message);
  },
  "message:deleted": ({ message }) => {
    useMessagingStore.getState().replaceMessage(message);
  },
  "message:reaction:updated": ({ message }) => {
    useMessagingStore.getState().replaceMessage(message);
  },
  "typing:update": (payload) => {
    useMessagingStore.getState().setTyping(payload);
  },
  "presence:update": (payload) => {
    useMessagingStore.getState().setPresence(payload);
  },
  "conversation:updated": ({ conversation }) => {
    if (conversation) useMessagingStore.getState().upsertConversation(conversation);
  },
  "unread:updated": ({ unread }) => {
    useMessagingStore.getState().setUnreadSummary(unread);
  },
  "call:incoming": (payload) => {
    useMessagingStore.setState({
      incomingCall: payload,
      callStatus: "incoming",
      callError: null,
    });
  },
  "call:initiate": ({ call }) => {
    useMessagingStore.setState({
      activeCall: call,
      callStatus: "ringing",
      callError: null,
    });
  },
  "call:accepted": ({ call }) => {
    useMessagingStore.getState().handleCallAccepted(call);
  },
  "call:offer": (payload) => {
    useMessagingStore.getState().handleCallOffer(payload);
  },
  "call:answer": (payload) => {
    useMessagingStore.getState().handleCallAnswer(payload);
  },
  "call:ice-candidate": (payload) => {
    useMessagingStore.getState().handleRemoteIceCandidate(payload);
  },
  "call:rejected": ({ call }) => {
    useMessagingStore.getState().cleanupCall("rejected", call);
  },
  "call:ended": ({ call }) => {
    useMessagingStore.getState().cleanupCall("ended", call);
  },
  "call:error": ({ message }) => {
    useMessagingStore.setState({ callError: message || "Call failed" });
  },
};

const useMessagingStore = create((set, get) => ({
  isMessagingOpen: false,
  selectedConversationId: null,
  conversations: [],
  messagesByConversation: {},
  unreadByConversation: {},
  presenceByUser: {},
  typingByConversation: {},
  socketConnected: false,
  activeCall: null,
  incomingCall: null,
  localStream: null,
  remoteStream: null,
  isMuted: false,
  isCameraOff: false,
  callStatus: "idle",
  callError: null,
  loadingConversations: false,
  loadingMessages: false,
  sending: false,
  uploading: false,
  error: null,
  totalUnread: 0,
  newDirectTargetEllyId: "",
  contextMenu: {
    isOpen: false,
    x: 0,
    y: 0,
    conversationId: null,
  },
  groupModal: {
    isOpen: false,
    prefilledMemberEllyIds: [],
    sourceConversationId: null,
  },
  deleteConfirm: {
    isOpen: false,
    conversationId: null,
  },
  deletingConversation: false,

  openMessaging: () => {
    set({ isMessagingOpen: true });
    get().loadConversations();
    get().connectMessagingSocket();
  },
  closeMessaging: () => set({ isMessagingOpen: false }),
  toggleMessaging: () => {
    const nextOpen = !get().isMessagingOpen;
    set({ isMessagingOpen: nextOpen });
    if (nextOpen) {
      get().loadConversations();
      get().connectMessagingSocket();
    }
  },

  setNewDirectTargetEllyId: (newDirectTargetEllyId) =>
    set({ newDirectTargetEllyId }),

  openConversationContextMenu: (conversationId, position = {}) => {
    const menuWidth = 190;
    const menuHeight = 96;
    const viewportWidth =
      typeof window === "undefined" ? 1200 : window.innerWidth;
    const viewportHeight =
      typeof window === "undefined" ? 800 : window.innerHeight;
    const x = Math.min(
      Math.max(Number(position.x) || 0, 8),
      Math.max(8, viewportWidth - menuWidth - 8),
    );
    const y = Math.min(
      Math.max(Number(position.y) || 0, 8),
      Math.max(8, viewportHeight - menuHeight - 8),
    );

    set({
      contextMenu: {
        isOpen: true,
        x,
        y,
        conversationId,
      },
    });
  },

  closeConversationContextMenu: () =>
    set((state) => ({
      contextMenu: {
        ...state.contextMenu,
        isOpen: false,
        conversationId: null,
      },
    })),

  openGroupModalFromConversation: (conversationId) => {
    const conversation = get().conversations.find(
      (item) => item.id === conversationId,
    );

    set({
      contextMenu: {
        isOpen: false,
        x: 0,
        y: 0,
        conversationId: null,
      },
      groupModal: {
        isOpen: true,
        prefilledMemberEllyIds: getPrefilledMemberEllyIds(conversation),
        sourceConversationId: conversationId || null,
      },
    });
  },

  openGroupModal: (prefilledMemberEllyIds = []) =>
    set({
      groupModal: {
        isOpen: true,
        prefilledMemberEllyIds: prefilledMemberEllyIds.map(normalizeEllyId).filter(Boolean),
        sourceConversationId: null,
      },
    }),

  closeGroupModal: () =>
    set({
      groupModal: {
        isOpen: false,
        prefilledMemberEllyIds: [],
        sourceConversationId: null,
      },
    }),

  openDeleteConfirm: (conversationId) =>
    set({
      contextMenu: {
        isOpen: false,
        x: 0,
        y: 0,
        conversationId: null,
      },
      deleteConfirm: {
        isOpen: true,
        conversationId,
      },
    }),

  closeDeleteConfirm: () =>
    set({
      deleteConfirm: {
        isOpen: false,
        conversationId: null,
      },
    }),

  loadUnreadSummary: async () => {
    const response = await messagingApi.getUnreadSummary();
    const unread = unwrapResponse(response, []);
    get().setUnreadSummary(unread);
    return unread;
  },

  loadConversations: async () => {
    set({ loadingConversations: true, error: null });

    try {
      const [conversationsResponse, unreadResponse] = await Promise.all([
        messagingApi.getConversations(),
        messagingApi.getUnreadSummary(),
      ]);
      const unread = unwrapResponse(unreadResponse, []);
      const unreadMap = unread.reduce((map, item) => {
        map[String(item.conversationId)] = item.unreadCount || 0;
        return map;
      }, {});
      const conversations = unwrapResponse(conversationsResponse, []).map(
        (conversation) =>
          mapConversation(conversation, unreadMap[getConversationId(conversation)] || 0),
      );
      const selectedConversationId =
        conversations.some((conversation) => conversation.id === get().selectedConversationId)
          ? get().selectedConversationId
          : conversations[0]?.id || null;

      set({
        conversations,
        unreadByConversation: unreadMap,
        totalUnread: getTotalUnread(unreadMap),
        selectedConversationId,
        loadingConversations: false,
        error: null,
      });

      if (selectedConversationId) {
        await get().loadMessages(selectedConversationId);
      }

      return conversations;
    } catch (error) {
      set({
        loadingConversations: false,
        conversations: [],
        selectedConversationId: null,
        error: error.message,
      });
      return [];
    }
  },

  createDirectConversation: async (targetEllyId) => {
    const normalizedTargetEllyId = normalizeEllyId(targetEllyId);
    if (!normalizedTargetEllyId) return null;

    set({ loadingConversations: true, error: null });

    try {
      const response = await messagingApi.createDirectConversation(normalizedTargetEllyId);
      const conversation = mapConversation(unwrapResponse(response));

      set((state) => ({
        conversations: upsertById(state.conversations, conversation),
        selectedConversationId: conversation.id,
        newDirectTargetEllyId: "",
        loadingConversations: false,
        error: null,
      }));

      await get().loadMessages(conversation.id);
      await get().markConversationRead(conversation.id);

      return conversation;
    } catch (error) {
      set({ loadingConversations: false, error: error.message });
      return null;
    }
  },

  createGroupConversation: async ({ name, description = "", memberEllyIds = [] }) => {
    const normalizedName = String(name || "").trim();
    const normalizedMembers = memberEllyIds.map(normalizeEllyId).filter(Boolean);

    if (!normalizedName) {
      set({ error: "Group name is required" });
      return null;
    }

    if (!normalizedMembers.length) {
      set({ error: "Add at least one member ELLY ID" });
      return null;
    }

    set({ loadingConversations: true, error: null });

    try {
      const response = await messagingApi.createGroupConversation({
        name: normalizedName,
        description,
        memberEllyIds: normalizedMembers,
      });
      const conversation = mapConversation(unwrapResponse(response));

      set((state) => ({
        conversations: upsertById(state.conversations, conversation),
        selectedConversationId: conversation.id,
        loadingConversations: false,
        error: null,
      }));

      await get().loadMessages(conversation.id);
      return conversation;
    } catch (error) {
      set({ loadingConversations: false, error: error.message });
      return null;
    }
  },

  createGroupFromConversation: async (
    conversationId,
    groupName,
    extraMemberEllyIds = [],
    description = "",
  ) => {
    const conversation = get().conversations.find(
      (item) => item.id === conversationId,
    );
    const memberEllyIds = [
      ...getPrefilledMemberEllyIds(conversation),
      ...extraMemberEllyIds,
    ];

    return get().createGroupConversation({
      name: groupName,
      description,
      memberEllyIds,
    });
  },

  addGroupMembers: async (conversationId, memberEllyIds = []) => {
    const normalizedMembers = memberEllyIds.map(normalizeEllyId).filter(Boolean);
    if (!conversationId || !normalizedMembers.length) return null;

    try {
      const response = await messagingApi.addGroupMembers(
        conversationId,
        normalizedMembers,
      );
      const conversation = mapConversation(unwrapResponse(response));
      get().upsertConversation(conversation);
      return conversation;
    } catch (error) {
      set({ error: error.message });
      return null;
    }
  },

  removeGroupMember: async (conversationId, ellyId) => {
    if (!conversationId || !ellyId) return null;

    try {
      const response = await messagingApi.removeGroupMember(conversationId, ellyId);
      const conversation = mapConversation(unwrapResponse(response));
      get().upsertConversation(conversation);
      return conversation;
    } catch (error) {
      set({ error: error.message });
      return null;
    }
  },

  archiveConversation: async (conversationId) => {
    if (!conversationId) return null;

    set({ deletingConversation: true, error: null });

    try {
      const response = await messagingApi.archiveConversation(conversationId);
      set((state) => {
        const remainingConversations = state.conversations.filter(
          (conversation) => conversation.id !== conversationId,
        );
        const nextSelectedConversationId =
          state.selectedConversationId === conversationId
            ? remainingConversations[0]?.id || null
            : state.selectedConversationId;
        const nextMessagesByConversation = { ...state.messagesByConversation };
        delete nextMessagesByConversation[conversationId];

        return {
          conversations: remainingConversations,
          selectedConversationId: nextSelectedConversationId,
          messagesByConversation: nextMessagesByConversation,
          deletingConversation: false,
          deleteConfirm: {
            isOpen: false,
            conversationId: null,
          },
          error: null,
        };
      });
      return unwrapResponse(response, {});
    } catch (error) {
      set({ deletingConversation: false, error: error.message });
      return null;
    }
  },

  deleteConversationForCurrentUser: async (conversationId) =>
    get().archiveConversation(conversationId),

  selectConversation: async (conversationId) => {
    if (!conversationId) return;

    const previous = get().selectedConversationId;
    if (previous && previous !== conversationId) get().leaveConversation(previous);

    set({ selectedConversationId: conversationId });
    get().joinConversation(conversationId);
    await get().loadMessages(conversationId);
    await get().markConversationRead(conversationId);
  },

  loadMessages: async (conversationId) => {
    if (!conversationId) return [];

    set({ loadingMessages: true, error: null });

    try {
      const response = await messagingApi.getConversationMessages(conversationId);
      const messages = unwrapResponse(response, []).map(mapMessage);
      set((state) => ({
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: messages,
        },
        loadingMessages: false,
        error: null,
      }));
      return messages;
    } catch (error) {
      set({ loadingMessages: false, error: error.message });
      return [];
    }
  },

  sendMessage: async (conversationId, content, options = {}) => {
    const trimmedContent = String(content || "").trim();
    if (!conversationId || !trimmedContent) return null;

    set({ sending: true, error: null });

    try {
      const response = await messagingApi.sendConversationMessage(
        conversationId,
        trimmedContent,
        options,
      );
      const message = unwrapResponse(response);
      get().receiveMessage(conversationId, message);
      await get().loadConversations();
      return message;
    } catch (error) {
      set({ error: error.message });
      return null;
    } finally {
      set({ sending: false });
    }
  },

  markConversationRead: async (conversationId) => {
    if (!conversationId) return;

    set((state) => {
      const nextUnreadByConversation = {
        ...state.unreadByConversation,
        [conversationId]: 0,
      };
      return {
        conversations: state.conversations.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, unread: 0 }
            : conversation,
        ),
        unreadByConversation: nextUnreadByConversation,
        totalUnread: getTotalUnread(nextUnreadByConversation),
      };
    });

    try {
      await messagingApi.markConversationRead(conversationId);
    } catch (error) {
      set({ error: error.message });
    }
  },

  refreshMessaging: async () => {
    await get().loadConversations();
    if (get().selectedConversationId) {
      await get().loadMessages(get().selectedConversationId);
    }
    await get().loadUnreadSummary();
  },

  handleSocketConnectError: async (error) => {
    const message = error?.message || "Messaging connection failed";
    const session = useSessionStore.getState();

    set({ socketConnected: false });

    if (
      message !== "Invalid socket token" ||
      !session.refreshToken ||
      socketAuthRefreshAttempted
    ) {
      set({ error: message });
      return null;
    }

    if (socketAuthRefreshPromise) return socketAuthRefreshPromise;

    socketAuthRefreshAttempted = true;
    socketAuthRefreshPromise = (async () => {
      try {
        await session.refresh();
        reconnectSocket();
        return true;
      } catch (refreshError) {
        set({
          error: refreshError?.message || "Messaging authentication expired",
        });
        return false;
      } finally {
        socketAuthRefreshPromise = null;
      }
    })();

    return socketAuthRefreshPromise;
  },

  connectMessagingSocket: () => {
    return connectSocket(socketHandlers);
  },

  disconnectMessagingSocket: () => {
    disconnectSocket();
    set({ socketConnected: false });
  },

  joinConversation: (conversationId) => {
    const socket = getMessagingSocket();
    if (socket?.connected && conversationId) {
      socket.emit("conversation:join", { conversationId });
    }
  },

  leaveConversation: (conversationId) => {
    const socket = getMessagingSocket();
    if (socket?.connected && conversationId) {
      socket.emit("conversation:leave", { conversationId });
    }
  },

  sendTypingStart: (conversationId) => {
    if (conversationId) getMessagingSocket()?.emit("typing:start", { conversationId });
  },
  sendTypingStop: (conversationId) => {
    if (conversationId) getMessagingSocket()?.emit("typing:stop", { conversationId });
  },

  uploadAttachment: async (conversationId, file) => {
    set({ uploading: true, error: null });
    try {
      const response = await messagingApi.uploadAttachment(conversationId, file);
      get().receiveMessage(conversationId, unwrapResponse(response));
    } catch (error) {
      set({ error: error.message });
    } finally {
      set({ uploading: false });
    }
  },

  uploadVoiceNote: async (conversationId, file, durationSeconds) => {
    set({ uploading: true, error: null });
    try {
      const response = await messagingApi.uploadVoiceNote(conversationId, file, {
        durationSeconds,
      });
      get().receiveMessage(conversationId, unwrapResponse(response));
    } catch (error) {
      set({ error: error.message });
    } finally {
      set({ uploading: false });
    }
  },

  editMessage: async (messageId, content) => {
    const response = await messagingApi.editMessage(messageId, content);
    get().replaceMessage(unwrapResponse(response));
  },

  deleteMessage: async (messageId) => {
    const response = await messagingApi.deleteMessage(messageId);
    get().replaceMessage(unwrapResponse(response));
  },

  addReaction: async (messageId, emoji) => {
    const response = await messagingApi.addReaction(messageId, emoji);
    get().replaceMessage(unwrapResponse(response));
  },

  removeReaction: async (messageId, emoji) => {
    const response = await messagingApi.removeReaction(messageId, emoji);
    get().replaceMessage(unwrapResponse(response));
  },

  pinMessage: async (messageId) => {
    const response = await messagingApi.pinMessage(messageId);
    get().replaceMessage(unwrapResponse(response));
  },

  unpinMessage: async (messageId) => {
    const response = await messagingApi.unpinMessage(messageId);
    get().replaceMessage(unwrapResponse(response));
  },

  setupPeerConnection: (callId) => {
    return webrtcClient.createPeerConnection({
      onIceCandidate: (candidate) => {
        getMessagingSocket()?.emit("call:ice-candidate", {
          callId,
          candidate: candidate.toJSON ? candidate.toJSON() : candidate,
        });
      },
      onRemoteStream: (remoteStream) => {
        set({ remoteStream });
      },
    });
  },

  startLocalMedia: async () => {
    const localStream = await webrtcClient.startLocalMedia();
    set({ localStream });
    return localStream;
  },

  initiateVideoCall: async (conversation) => {
    if (!conversation || conversation.type !== "DIRECT") return;

    const calleeEllyId = getPeerEllyId(conversation);
    if (!calleeEllyId) {
      set({ callError: "No call recipient found" });
      return;
    }

    try {
      get().connectMessagingSocket();
      await get().startLocalMedia();
      set({
        activeCall: {
          conversationId: conversation.id,
          calleeEllyId,
        },
        callStatus: "ringing",
        callError: null,
      });
      getMessagingSocket()?.emit("call:initiate", {
        conversationId: conversation.id,
        calleeEllyId,
        callType: "video",
      });
    } catch (error) {
      webrtcClient.stopCall();
      set({
        localStream: null,
        remoteStream: null,
        activeCall: null,
        callStatus: "idle",
        callError: error.message,
      });
    }
  },

  acceptCall: async (callId) => {
    try {
      get().connectMessagingSocket();
      await get().startLocalMedia();
      get().setupPeerConnection(callId);
      getMessagingSocket()?.emit("call:accept", { callId });
    } catch (error) {
      set({ callError: error.message });
    }
  },

  rejectCall: (callId) => {
    getMessagingSocket()?.emit("call:reject", { callId });
    get().cleanupCall("rejected");
  },

  endCall: (callId) => {
    if (callId) getMessagingSocket()?.emit("call:end", { callId });
    get().cleanupCall("ended");
  },

  handleCallAccepted: async (call) => {
    const currentEllyId = getCurrentEllyId();
    set({
      activeCall: call,
      incomingCall: null,
      callStatus: "accepted",
      callError: null,
    });

    if (normalizeEllyId(call.callerEllyId) !== currentEllyId) return;

    try {
      get().setupPeerConnection(call.callId);
      const offer = await webrtcClient.createOffer();
      getMessagingSocket()?.emit("call:offer", {
        callId: call.callId,
        offer,
      });
    } catch (error) {
      set({ callError: error.message });
    }
  },

  handleCallOffer: async ({ callId, offer, sdp }) => {
    try {
      if (!get().localStream) {
        await get().startLocalMedia();
      }
      get().setupPeerConnection(callId);
      const answer = await webrtcClient.handleOffer(offer || sdp);
      getMessagingSocket()?.emit("call:answer", {
        callId,
        answer,
      });
    } catch (error) {
      set({ callError: error.message });
    }
  },

  handleCallAnswer: async ({ answer, sdp }) => {
    try {
      await webrtcClient.handleAnswer(answer || sdp);
    } catch (error) {
      set({ callError: error.message });
    }
  },

  handleRemoteIceCandidate: async ({ candidate }) => {
    try {
      await webrtcClient.handleIceCandidate(candidate);
    } catch (error) {
      set({ callError: error.message });
    }
  },

  toggleMute: () => {
    const nextMuted = !get().isMuted;
    webrtcClient.setAudioEnabled(!nextMuted);
    set({ isMuted: nextMuted });
  },

  toggleCamera: () => {
    const nextCameraOff = !get().isCameraOff;
    webrtcClient.setVideoEnabled(!nextCameraOff);
    set({ isCameraOff: nextCameraOff });
  },

  cleanupCall: (status = "idle", call = null) => {
    webrtcClient.stopCall();
    set({
      activeCall: call,
      incomingCall: null,
      localStream: null,
      remoteStream: null,
      isMuted: false,
      isCameraOff: false,
      callStatus: status,
    });
  },

  initiateCall: (calleeEllyId, conversationId) => {
    const conversation = get().conversations.find(
      (item) => item.id === conversationId && item.memberIds?.includes(calleeEllyId),
    );
    return get().initiateVideoCall(conversation);
  },

  receiveMessage: (conversationId, message, conversation) => {
    const mappedConversation = conversation ? mapConversation(conversation) : null;
    set((state) => {
      const nextMessages = upsertMessage(
        state.messagesByConversation[conversationId] || [],
        message,
      );

      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: nextMessages,
        },
        conversations: mappedConversation
          ? upsertById(state.conversations, mappedConversation)
          : state.conversations,
      };
    });
  },

  replaceMessage: (message) => {
    const mapped = mapMessage(message);
    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [mapped.conversationId]: upsertMessage(
          state.messagesByConversation[mapped.conversationId] || [],
          mapped,
        ),
      },
    }));
  },

  upsertConversation: (conversation) => {
    const mapped = mapConversation(conversation);
    set((state) => ({
      conversations: upsertById(state.conversations, mapped),
    }));
  },

  setUnreadSummary: (unread = []) => {
    const unreadMap = unread.reduce((map, item) => {
      map[String(item.conversationId)] = item.unreadCount || 0;
      return map;
    }, {});
    set((state) => ({
      unreadByConversation: unreadMap,
      totalUnread: getTotalUnread(unreadMap),
      conversations: state.conversations.map((conversation) => ({
        ...conversation,
        unread: unreadMap[conversation.id] || 0,
      })),
    }));
  },

  setTyping: ({ conversationId, ellyId, isTyping }) => {
    set((state) => ({
      typingByConversation: {
        ...state.typingByConversation,
        [conversationId]: isTyping ? ellyId : null,
      },
    }));
  },

  setReadReceipt: () => {},

  setPresence: (payload) => {
    if (payload.users) {
      set({
        presenceByUser: payload.users.reduce((map, user) => {
          map[user.ellyId] = user;
          return map;
        }, {}),
      });
      return;
    }

    if (!payload.ellyId) return;
    set((state) => ({
      presenceByUser: {
        ...state.presenceByUser,
        [payload.ellyId]: payload,
      },
    }));
  },
}));

export default useMessagingStore;
