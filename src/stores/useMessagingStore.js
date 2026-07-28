import { create } from "zustand";
import * as messagingApi from "../services/messaging/messagingApi";
import {
  connectMessagingSocket as connectSocket,
  disconnectMessagingSocket as disconnectSocket,
  getMessagingSocket,
} from "../services/messaging/socketClient";
import useSessionStore from "../store/useSessionStore";

const demoConversations = [
  {
    id: "conv-emergency",
    type: "DEPARTMENT",
    name: "# Emergency",
    subtitle: "Operational channel - 24 members",
    preview: "Cardiology Team: Cath lab is prepped.",
    time: "11:42 AM",
    unread: 3,
    tone: "danger",
  },
  {
    id: "conv-cardiology",
    type: "GROUP",
    name: "Cardiology Team",
    subtitle: "Care coordination - 12 members",
    preview: "Dr. Minh: Reviewing patient data now.",
    time: "11:38 AM",
    unread: 2,
    tone: "heart",
  },
  {
    id: "conv-dr-minh",
    type: "DIRECT",
    name: "Dr. Minh",
    subtitle: "Direct message",
    preview: "You: Please check the latest echo.",
    time: "11:20 AM",
    unread: 0,
    tone: "staff",
  },
];

const demoMessagesByConversation = {
  "conv-emergency": [
    {
      id: "msg-emergency-1",
      sender: "Nurse Linh",
      senderEllyId: "ELLY-NURSE-001",
      time: "11:40 AM",
      content:
        "Patient E-2391, 58M with chest pain, is in ER Room 3. Vitals stable.",
      isSelf: false,
      reactions: [{ emoji: "👍", count: 1 }],
    },
    {
      id: "msg-emergency-2",
      sender: "You",
      senderEllyId: "ELLY-STAFF-001",
      time: "11:43 AM",
      content: "Acknowledged. ER team, estimate time to transfer?",
      isSelf: true,
      status: "sent",
    },
  ],
  "conv-cardiology": [
    {
      id: "msg-cardiology-1",
      sender: "Dr. Minh",
      senderEllyId: "ELLY-DOCTOR-001",
      time: "11:36 AM",
      content: "Reviewing patient data now. Echo image set is loading.",
      isSelf: false,
    },
  ],
  "conv-dr-minh": [
    {
      id: "msg-minh-1",
      sender: "You",
      senderEllyId: "ELLY-STAFF-001",
      time: "11:20 AM",
      content: "Please check the latest echo.",
      isSelf: true,
      status: "sent",
    },
  ],
};

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

function getConversationId(conversation) {
  return String(conversation.id || conversation._id);
}

function mapConversation(conversation, unreadCount = 0) {
  const id = getConversationId(conversation);
  const lastMessage = conversation.lastMessage || {};
  const name =
    conversation.name ||
    (conversation.type === "DIRECT"
      ? (conversation.memberIds || []).find(
          (ellyId) => ellyId !== useSessionStore.getState().currentUser?.ellyId,
        ) || "Direct message"
      : conversation.departmentId || "Conversation");

  return {
    ...conversation,
    id,
    name,
    subtitle:
      conversation.type === "DEPARTMENT"
        ? `${conversation.departmentId || "Department"} channel`
        : conversation.type === "DIRECT"
          ? "Direct message"
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
  const currentEllyId = useSessionStore.getState().currentUser?.ellyId;
  const reactionsByEmoji = (message.reactions || []).reduce((map, reaction) => {
    map[reaction.emoji] = (map[reaction.emoji] || 0) + 1;
    return map;
  }, {});

  return {
    ...message,
    id: String(message.id || message._id),
    conversationId: String(message.conversationId),
    sender: message.senderEllyId === currentEllyId ? "You" : message.senderEllyId,
    time: message.createdAt ? getCurrentTimeLabel(message.createdAt) : "",
    isSelf: message.senderEllyId === currentEllyId,
    status: String(message.status || "sent").toLowerCase(),
    reactions: Object.entries(reactionsByEmoji).map(([emoji, count]) => ({
      emoji,
      count,
    })),
  };
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
    useMessagingStore.setState({
      activeCall: call,
      incomingCall: null,
      callStatus: "accepted",
      callError: null,
    });
  },
  "call:rejected": ({ call }) => {
    useMessagingStore.setState({
      activeCall: call,
      incomingCall: null,
      callStatus: "rejected",
    });
  },
  "call:ended": ({ call }) => {
    useMessagingStore.setState({
      activeCall: call,
      incomingCall: null,
      callStatus: "ended",
    });
  },
  "call:error": ({ message }) => {
    useMessagingStore.setState({ callError: message || "Call failed" });
  },
};

const useMessagingStore = create((set, get) => ({
  isMessagingOpen: false,
  selectedConversationId: "conv-emergency",
  conversations: [],
  messagesByConversation: {},
  unreadByConversation: {},
  presenceByUser: {},
  typingByConversation: {},
  socketConnected: false,
  activeCall: null,
  incomingCall: null,
  callStatus: "idle",
  callError: null,
  sending: false,
  uploading: false,
  error: null,
  totalUnread: 0,

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

  seedDemoMessagingData: () => {
    if (get().conversations.length > 0) return;

    const unreadByConversation = demoConversations.reduce((map, conversation) => {
      map[conversation.id] = conversation.unread || 0;
      return map;
    }, {});

    set({
      conversations: demoConversations,
      messagesByConversation: demoMessagesByConversation,
      unreadByConversation,
      totalUnread: getTotalUnread(unreadByConversation),
      selectedConversationId: "conv-emergency",
    });
  },

  loadConversations: async () => {
    try {
      const [conversationsResponse, unreadResponse] = await Promise.all([
        messagingApi.getConversations(),
        messagingApi.getUnread(),
      ]);
      const unread = unreadResponse.data || unreadResponse || [];
      const unreadMap = unread.reduce((map, item) => {
        map[String(item.conversationId)] = item.unreadCount || 0;
        return map;
      }, {});
      const conversations = (conversationsResponse.data || conversationsResponse).map(
        (conversation) =>
          mapConversation(conversation, unreadMap[getConversationId(conversation)] || 0),
      );

      set({
        conversations,
        unreadByConversation: unreadMap,
        totalUnread: getTotalUnread(unreadMap),
        selectedConversationId: get().selectedConversationId || conversations[0]?.id,
        error: null,
      });

      if (conversations[0] && !get().messagesByConversation[conversations[0].id]) {
        get().loadMessages(conversations[0].id);
      }
    } catch (error) {
      get().seedDemoMessagingData();
      set({ error: error.message });
    }
  },

  loadMessages: async (conversationId) => {
    if (!conversationId || conversationId.startsWith("conv-")) return;

    try {
      const response = await messagingApi.getMessages(conversationId);
      const messages = (response.data || response).map(mapMessage);
      set((state) => ({
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: messages,
        },
        error: null,
      }));
    } catch (error) {
      set({ error: error.message });
    }
  },

  selectConversation: (conversationId) => {
    const previous = get().selectedConversationId;
    if (previous && previous !== conversationId) get().leaveConversation(previous);
    set({ selectedConversationId: conversationId });
    get().joinConversation(conversationId);
    get().loadMessages(conversationId);
    get().markConversationRead(conversationId);
  },

  connectMessagingSocket: () => {
    const socket = connectSocket(socketHandlers);

    socket.on("connect", () => set({ socketConnected: true }));
    socket.on("disconnect", () => set({ socketConnected: false }));
    socket.on("connect_error", (error) => {
      set({ socketConnected: false, error: error.message });
    });

    return socket;
  },

  disconnectMessagingSocket: () => {
    disconnectSocket();
    set({ socketConnected: false });
  },

  joinConversation: (conversationId) => {
    const socket = getMessagingSocket();
    if (socket?.connected && !conversationId.startsWith("conv-")) {
      socket.emit("conversation:join", { conversationId });
    }
  },

  leaveConversation: (conversationId) => {
    const socket = getMessagingSocket();
    if (socket?.connected && !conversationId.startsWith("conv-")) {
      socket.emit("conversation:leave", { conversationId });
    }
  },

  sendMessage: async (conversationId, content, options = {}) => {
    const trimmedContent = content.trim();
    if (!conversationId || !trimmedContent) return;

    const socket = getMessagingSocket();
    if (socket?.connected && !conversationId.startsWith("conv-")) {
      socket.emit("message:send", {
        conversationId,
        content: trimmedContent,
        ...options,
      });
      return;
    }

    if (conversationId.startsWith("conv-")) {
      get().sendLocalMessage(conversationId, trimmedContent);
      return;
    }

    set({ sending: true });
    try {
      const response = await messagingApi.sendMessage(
        conversationId,
        trimmedContent,
        options,
      );
      get().receiveMessage(conversationId, response.data || response);
    } finally {
      set({ sending: false });
    }
  },

  sendLocalMessage: (conversationId, content) => {
    const time = getCurrentTimeLabel();
    const nextMessage = {
      id: `msg-local-${Date.now()}`,
      sender: "You",
      time,
      content,
      isSelf: true,
      status: "sent",
    };

    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: [
          ...(state.messagesByConversation[conversationId] || []),
          nextMessage,
        ],
      },
    }));
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

    const socket = getMessagingSocket();
    if (socket?.connected && !conversationId.startsWith("conv-")) {
      socket.emit("message:read", { conversationId });
    } else if (!conversationId.startsWith("conv-")) {
      await messagingApi.markConversationRead(conversationId);
    }
  },

  sendTypingStart: (conversationId) => {
    getMessagingSocket()?.emit("typing:start", { conversationId });
  },
  sendTypingStop: (conversationId) => {
    getMessagingSocket()?.emit("typing:stop", { conversationId });
  },

  uploadAttachment: async (conversationId, file) => {
    set({ uploading: true });
    try {
      const response = await messagingApi.uploadAttachment(conversationId, file);
      get().receiveMessage(conversationId, response.data || response);
    } finally {
      set({ uploading: false });
    }
  },

  uploadVoiceNote: async (conversationId, file, durationSeconds) => {
    set({ uploading: true });
    try {
      const response = await messagingApi.uploadVoiceNote(conversationId, file, {
        durationSeconds,
      });
      get().receiveMessage(conversationId, response.data || response);
    } finally {
      set({ uploading: false });
    }
  },

  editMessage: async (messageId, content) => {
    const response = await messagingApi.editMessage(messageId, content);
    get().replaceMessage(response.data || response);
  },

  deleteMessage: async (messageId) => {
    const response = await messagingApi.deleteMessage(messageId);
    get().replaceMessage(response.data || response);
  },

  addReaction: async (messageId, emoji) => {
    const response = await messagingApi.addReaction(messageId, emoji);
    get().replaceMessage(response.data || response);
  },

  removeReaction: async (messageId, emoji) => {
    const response = await messagingApi.removeReaction(messageId, emoji);
    get().replaceMessage(response.data || response);
  },

  pinMessage: async (messageId) => {
    const response = await messagingApi.pinMessage(messageId);
    get().replaceMessage(response.data || response);
  },

  unpinMessage: async (messageId) => {
    const response = await messagingApi.unpinMessage(messageId);
    get().replaceMessage(response.data || response);
  },

  initiateCall: (calleeEllyId, conversationId) => {
    getMessagingSocket()?.emit("call:initiate", { calleeEllyId, conversationId });
    set({ callStatus: "ringing", callError: null });
  },
  acceptCall: (callId) => getMessagingSocket()?.emit("call:accept", { callId }),
  rejectCall: (callId) => getMessagingSocket()?.emit("call:reject", { callId }),
  endCall: (callId) => getMessagingSocket()?.emit("call:end", { callId }),

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
          ? state.conversations.map((item) =>
              item.id === mappedConversation.id ? mappedConversation : item,
            )
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
    set((state) => {
      const exists = state.conversations.some((item) => item.id === mapped.id);
      return {
        conversations: exists
          ? state.conversations.map((item) => (item.id === mapped.id ? mapped : item))
          : [mapped, ...state.conversations],
      };
    });
  },

  setUnreadSummary: (unread = []) => {
    const unreadMap = unread.reduce((map, item) => {
      map[String(item.conversationId)] = item.unreadCount || 0;
      return map;
    }, {});
    set({
      unreadByConversation: unreadMap,
      totalUnread: getTotalUnread(unreadMap),
    });
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
