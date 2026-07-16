import { apiRequest } from "../config/config";

function unwrap(response) {
  return response?.data ?? response;
}

function buildQuery(options = {}) {
  const params = new URLSearchParams();

  if (options.limit) params.set("limit", String(options.limit));
  if (options.before) params.set("before", options.before);

  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function getConversations() {
  return unwrap(await apiRequest("/messages/conversations"));
}

export async function createDirectConversation(targetEllyId) {
  return unwrap(
    await apiRequest("/messages/conversations/direct", {
      method: "POST",
      body: JSON.stringify({ targetEllyId }),
    }),
  );
}

export async function createDepartmentChannel(departmentId, departmentName) {
  return unwrap(
    await apiRequest("/messages/conversations/department", {
      method: "POST",
      body: JSON.stringify({ departmentId, departmentName }),
    }),
  );
}

export async function createGroupConversation(payload) {
  return unwrap(
    await apiRequest("/messages/conversations/group", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  );
}

export async function getConversationMessages(conversationId, options = {}) {
  return unwrap(
    await apiRequest(
      `/messages/conversations/${conversationId}/messages${buildQuery(options)}`,
    ),
  );
}

export async function sendConversationMessage(conversationId, content) {
  return unwrap(
    await apiRequest(`/messages/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
  );
}

export async function markConversationRead(conversationId) {
  return unwrap(
    await apiRequest(`/messages/conversations/${conversationId}/read`, {
      method: "PATCH",
    }),
  );
}

export async function getUnreadSummary() {
  return unwrap(await apiRequest("/messages/unread"));
}
