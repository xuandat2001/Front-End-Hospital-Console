import { describe, expect, it } from "vitest";
import useMessagingStore from "./useMessagingStore";

describe("useMessagingStore transient UI cleanup", () => {
  it("dismisses messaging panels, context menus, and confirmation modals together", () => {
    useMessagingStore.setState({
      isMessagingOpen: true,
      contextMenu: {
        isOpen: true,
        x: 100,
        y: 120,
        conversationId: "conversation-1",
      },
      groupModal: {
        isOpen: true,
        prefilledMemberEllyIds: ["ELY-1"],
        sourceConversationId: "conversation-1",
      },
      deleteConfirm: {
        isOpen: true,
        conversationId: "conversation-1",
      },
    });

    useMessagingStore.getState().dismissTransientMessagingUi();

    expect(useMessagingStore.getState()).toMatchObject({
      isMessagingOpen: false,
      contextMenu: {
        isOpen: false,
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
    });
  });
});
