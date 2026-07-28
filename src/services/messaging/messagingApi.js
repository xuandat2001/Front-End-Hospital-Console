import { apiRequest } from "../config/config";

export function getConversations() {
  return apiRequest("/messages/conversations");
}

export function createDirectConversation(targetEllyId) {
  return apiRequest("/messages/conversations/direct", {
    method: "POST",
    body: JSON.stringify({ targetEllyId }),
  });
}

export function createDepartmentConversation(departmentId, departmentName) {
  return apiRequest("/messages/conversations/department", {
    method: "POST",
    body: JSON.stringify({ departmentId, departmentName }),
  });
}

export function createGroupConversation(name, memberIds) {
  return apiRequest("/messages/conversations/group", {
    method: "POST",
    body: JSON.stringify({ name, memberIds }),
  });
}

export function getMessages(conversationId, params = {}) {
  const search = new URLSearchParams(params);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return apiRequest(`/messages/conversations/${conversationId}/messages${suffix}`);
}

export function sendMessage(conversationId, content, options = {}) {
  return apiRequest(`/messages/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content, ...options }),
  });
}

export function markConversationRead(conversationId) {
  return apiRequest(`/messages/conversations/${conversationId}/read`, {
    method: "PATCH",
  });
}

export function getUnread() {
  return apiRequest("/messages/unread");
}

export function uploadAttachment(conversationId, file, fields = {}) {
  const formData = new FormData();
  formData.append("file", file);
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) formData.append(key, value);
  });

  return apiRequest(`/messages/conversations/${conversationId}/attachments`, {
    method: "POST",
    body: formData,
  });
}

export function uploadVoiceNote(conversationId, file, fields = {}) {
  const formData = new FormData();
  formData.append("file", file);
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) formData.append(key, value);
  });

  return apiRequest(`/messages/conversations/${conversationId}/voice-notes`, {
    method: "POST",
    body: formData,
  });
}

export function editMessage(messageId, content) {
  return apiRequest(`/messages/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify({ content }),
  });
}

export function deleteMessage(messageId) {
  return apiRequest(`/messages/${messageId}`, {
    method: "DELETE",
  });
}

export function addReaction(messageId, emoji) {
  return apiRequest(`/messages/${messageId}/reactions`, {
    method: "POST",
    body: JSON.stringify({ emoji }),
  });
}

export function removeReaction(messageId, emoji) {
  return apiRequest(`/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`, {
    method: "DELETE",
  });
}

export function pinMessage(messageId) {
  return apiRequest(`/messages/${messageId}/pin`, {
    method: "POST",
  });
}

export function unpinMessage(messageId) {
  return apiRequest(`/messages/${messageId}/pin`, {
    method: "DELETE",
  });
}
