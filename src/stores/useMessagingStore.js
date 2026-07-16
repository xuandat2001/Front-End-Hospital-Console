import { create } from "zustand";
import {
  getConversationMessages,
  getConversations,
  getUnreadSummary,
  markConversationRead,
  sendConversationMessage,
} from "../services/messaging/messagingApi";

const toneByType = {
  DIRECT: "staff",
  DEPARTMENT: "primary",
  GROUP: "teal",
};

function getEntityId(entity) {
  return entity?.id || entity?._id;
}

function getTotalUnread(unreadByConversation) {
  return Object.values(unreadByConversation).reduce(
    (total, value) => total + Number(value || 0),
    0,
  );
}

function getReadableErrorMessage(error) {
  const message = error?.message || "";

  if (message.includes("(401)")) {
    return "Missing messaging identity headers.";
  }

  if (message.includes("(403)")) {
    return "You do not have access to this conversation.";
  }

  if (
    message.includes("(503)") ||
    message.toLowerCase().includes("failed while contacting") ||
    message.toLowerCase().includes("network")
  ) {
    return "Messaging service is unavailable.";
  }

  return message || "Messaging service is unavailable.";
}

function getFallbackConversationName(conversation) {
  if (conversation?.name) return conversation.name;
  if (conversation?.type === "DEPARTMENT") return conversation.departmentId;
  if (conversation?.type === "DIRECT") return "Direct conversation";
  return "Group conversation";
}

function getFallbackSubtitle(conversation) {
  if (conversation?.subtitle) return conversation.subtitle;
  if (conversation?.type === "DEPARTMENT") {
    return conversation.departmentId
      ? `Department channel - ${conversation.departmentId}`
      : "Department channel";
  }
  if (conversation?.type === "DIRECT") return "Direct message";

  const memberCount = conversation?.memberIds?.length || conversation?.members?.length;
  return memberCount ? `Group conversation - ${memberCount} members` : "Group conversation";
}

function normalizeConversation(conversation = {}) {
  const id = getEntityId(conversation);
  const lastMessage = conversation.lastMessage || {};
  const preview =
    lastMessage.content ||
    conversation.preview ||
    "No messages yet";
  const time =
    lastMessage.sentAt ||
    conversation.time ||
    conversation.updatedAt ||
    conversation.createdAt;

  return {
    ...conversation,
    id,
    type: conversation.type || "GROUP",
    name: getFallbackConversationName(conversation),
    subtitle: getFallbackSubtitle(conversation),
    preview,
    time,
    unread: Number(conversation.unread ?? conversation.unreadCount ?? 0),
    tone: conversation.tone || toneByType[conversation.type] || "muted",
  };
}

function normalizeMessage(message = {}) {
  const id = getEntityId(message);

  return {
    ...message,
    id,
    conversationId: message.conversationId || message.conversation,
    sender: message.sender || message.senderEllyId || "Unknown sender",
    time: message.time || message.createdAt || message.updatedAt,
    content: message.content || "",
  };
}

function buildUnreadMapFromConversations(conversations) {
  return conversations.reduce((map, conversation) => {
    map[conversation.id] = Number(conversation.unread || 0);
    return map;
  }, {});
}

function normalizeUnreadSummary(summary, conversations = []) {
  if (Array.isArray(summary)) {
    return summary.reduce((map, item) => {
      const conversationId = item.conversationId || item.id || item._id;
      if (conversationId) {
        map[conversationId] = Number(item.unreadCount ?? item.count ?? 0);
      }
      return map;
    }, {});
  }

  if (summary?.unreadByConversation) {
    return Object.entries(summary.unreadByConversation).reduce(
      (map, [conversationId, count]) => {
        map[conversationId] = Number(count || 0);
        return map;
      },
      {},
    );
  }

  return buildUnreadMapFromConversations(conversations);
}

const useMessagingStore = create((set, get) => ({
  isMessagingOpen: false,
  selectedConversationId: null,
  conversations: [],
  messagesByConversation: {},
  unreadByConversation: {},
  totalUnread: 0,
  loadingConversations: false,
  loadingMessages: false,
  sending: false,
  error: null,

  openMessaging: () => set({ isMessagingOpen: true }),
  closeMessaging: () => set({ isMessagingOpen: false }),
  toggleMessaging: () =>
    set((state) => ({ isMessagingOpen: !state.isMessagingOpen })),

  loadConversations: async () => {
    set({ loadingConversations: true, error: null });

    try {
      const response = await getConversations();
      const conversations = Array.isArray(response)
        ? response.map(normalizeConversation).filter((item) => item.id)
        : [];
      const unreadByConversation = {
        ...buildUnreadMapFromConversations(conversations),
        ...get().unreadByConversation,
      };
      const currentSelectedId = get().selectedConversationId;
      const nextSelectedConversationId = conversations.some(
        (conversation) => conversation.id === currentSelectedId,
      )
        ? currentSelectedId
        : null;

      set({
        conversations: conversations.map((conversation) => ({
          ...conversation,
          unread: unreadByConversation[conversation.id] || 0,
        })),
        selectedConversationId: nextSelectedConversationId,
        unreadByConversation,
        totalUnread: getTotalUnread(unreadByConversation),
        loadingConversations: false,
      });
    } catch (error) {
      set({
        error: getReadableErrorMessage(error),
        loadingConversations: false,
      });
    }
  },

  loadUnreadSummary: async () => {
    try {
      const response = await getUnreadSummary();
      const unreadByConversation = normalizeUnreadSummary(
        response,
        get().conversations,
      );

      set((state) => ({
        unreadByConversation,
        totalUnread: getTotalUnread(unreadByConversation),
        conversations: state.conversations.map((conversation) => ({
          ...conversation,
          unread: unreadByConversation[conversation.id] || 0,
        })),
      }));
    } catch (error) {
      set({ error: getReadableErrorMessage(error) });
    }
  },

  refreshMessaging: async () => {
    await get().loadConversations();
    await get().loadUnreadSummary();
  },

  selectConversation: async (conversationId) => {
    if (!conversationId) return;

    set({
      selectedConversationId: conversationId,
      loadingMessages: true,
      error: null,
    });

    try {
      const response = await getConversationMessages(conversationId);
      const messages = Array.isArray(response)
        ? response.map(normalizeMessage).filter((item) => item.id)
        : [];

      await markConversationRead(conversationId);

      set((state) => {
        const nextUnreadByConversation = {
          ...state.unreadByConversation,
          [conversationId]: 0,
        };

        return {
          messagesByConversation: {
            ...state.messagesByConversation,
            [conversationId]: messages,
          },
          unreadByConversation: nextUnreadByConversation,
          totalUnread: getTotalUnread(nextUnreadByConversation),
          conversations: state.conversations.map((conversation) =>
            conversation.id === conversationId
              ? { ...conversation, unread: 0 }
              : conversation,
          ),
          loadingMessages: false,
        };
      });
    } catch (error) {
      set({
        error: getReadableErrorMessage(error),
        loadingMessages: false,
      });
    }
  },

  sendMessage: async (conversationId, content) => {
    const trimmedContent = String(content || "").trim();
    if (!conversationId || !trimmedContent || get().sending) return null;

    set({ sending: true, error: null });

    try {
      const response = await sendConversationMessage(conversationId, trimmedContent);
      const message = normalizeMessage(response);

      set((state) => {
        const currentMessages = state.messagesByConversation[conversationId] || [];
        const messageExists = currentMessages.some((item) => item.id === message.id);
        const nextMessages = messageExists
          ? currentMessages
          : [...currentMessages, message];
        const time = message.createdAt || message.time || new Date().toISOString();
        const nextUnreadByConversation = {
          ...state.unreadByConversation,
          [conversationId]: 0,
        };

        return {
          messagesByConversation: {
            ...state.messagesByConversation,
            [conversationId]: nextMessages,
          },
          conversations: state.conversations.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  preview: message.content,
                  time,
                  unread: 0,
                  lastMessage: {
                    ...(conversation.lastMessage || {}),
                    content: message.content,
                    senderEllyId: message.senderEllyId,
                    sentAt: time,
                  },
                }
              : conversation,
          ),
          unreadByConversation: nextUnreadByConversation,
          totalUnread: getTotalUnread(nextUnreadByConversation),
          sending: false,
        };
      });

      return message;
    } catch (error) {
      set({
        error: getReadableErrorMessage(error),
        sending: false,
      });
      throw error;
    }
  },
}));

export default useMessagingStore;
