import { useEffect, useMemo, useState } from "react";
import { Edit3, Search, Trash2, UsersRound, X } from "lucide-react";
import useMessagingStore from "../../stores/useMessagingStore";
import { toast } from "../Toast";
import ConversationListItem from "./ConversationListItem";

const filters = [
  { id: "ALL", label: "All" },
  { id: "DIRECT", label: "Direct" },
  { id: "DEPARTMENT", label: "Channels" },
  { id: "GROUP", label: "Groups" },
];

function ConversationList() {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [showDirectForm, setShowDirectForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupMemberInput, setGroupMemberInput] = useState("");
  const [groupMemberEllyIds, setGroupMemberEllyIds] = useState([]);
  const [modalGroupName, setModalGroupName] = useState("");
  const [modalGroupDescription, setModalGroupDescription] = useState("");
  const [modalMemberInput, setModalMemberInput] = useState("");
  const [modalMemberEllyIds, setModalMemberEllyIds] = useState([]);
  const conversations = useMessagingStore((state) => state.conversations);
  const totalUnread = useMessagingStore((state) => state.totalUnread);
  const loadingConversations = useMessagingStore(
    (state) => state.loadingConversations,
  );
  const error = useMessagingStore((state) => state.error);
  const newDirectTargetEllyId = useMessagingStore(
    (state) => state.newDirectTargetEllyId,
  );
  const setNewDirectTargetEllyId = useMessagingStore(
    (state) => state.setNewDirectTargetEllyId,
  );
  const createDirectConversation = useMessagingStore(
    (state) => state.createDirectConversation,
  );
  const createGroupConversation = useMessagingStore(
    (state) => state.createGroupConversation,
  );
  const selectedConversationId = useMessagingStore(
    (state) => state.selectedConversationId,
  );
  const contextMenu = useMessagingStore((state) => state.contextMenu);
  const groupModal = useMessagingStore((state) => state.groupModal);
  const deleteConfirm = useMessagingStore((state) => state.deleteConfirm);
  const deletingConversation = useMessagingStore(
    (state) => state.deletingConversation,
  );
  const selectConversation = useMessagingStore(
    (state) => state.selectConversation,
  );
  const openConversationContextMenu = useMessagingStore(
    (state) => state.openConversationContextMenu,
  );
  const closeConversationContextMenu = useMessagingStore(
    (state) => state.closeConversationContextMenu,
  );
  const openGroupModal = useMessagingStore((state) => state.openGroupModal);
  const openGroupModalFromConversation = useMessagingStore(
    (state) => state.openGroupModalFromConversation,
  );
  const closeGroupModal = useMessagingStore((state) => state.closeGroupModal);
  const openDeleteConfirm = useMessagingStore(
    (state) => state.openDeleteConfirm,
  );
  const closeDeleteConfirm = useMessagingStore(
    (state) => state.closeDeleteConfirm,
  );
  const createGroupFromConversation = useMessagingStore(
    (state) => state.createGroupFromConversation,
  );
  const deleteConversationForCurrentUser = useMessagingStore(
    (state) => state.deleteConversationForCurrentUser,
  );

  const contextConversation = conversations.find(
    (conversation) => conversation.id === contextMenu.conversationId,
  );
  const deleteConversation = conversations.find(
    (conversation) => conversation.id === deleteConfirm.conversationId,
  );

  const visibleConversations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return conversations.filter((conversation) => {
      const matchesFilter =
        activeFilter === "ALL" || conversation.type === activeFilter;
      const matchesQuery =
        !normalizedQuery ||
        conversation.name.toLowerCase().includes(normalizedQuery) ||
        conversation.preview.toLowerCase().includes(normalizedQuery);

      return matchesFilter && matchesQuery;
    });
  }, [activeFilter, conversations, query]);

  useEffect(() => {
    if (!contextMenu.isOpen) return undefined;

    const handleClose = () => closeConversationContextMenu();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") closeConversationContextMenu();
    };

    window.addEventListener("click", handleClose);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("click", handleClose);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeConversationContextMenu, contextMenu.isOpen]);

  useEffect(() => {
    if (!groupModal.isOpen) return;

    setModalGroupName("");
    setModalGroupDescription("");
    setModalMemberInput("");
    setModalMemberEllyIds(groupModal.prefilledMemberEllyIds || []);
  }, [groupModal.isOpen, groupModal.prefilledMemberEllyIds]);

  const handleDirectSubmit = async (event) => {
    event.preventDefault();

    const conversation = await createDirectConversation(newDirectTargetEllyId);
    if (conversation) setShowDirectForm(false);
  };

  const handleAddGroupMember = () => {
    const normalizedEllyId = groupMemberInput.trim().toUpperCase();
    if (!normalizedEllyId) return;

    setGroupMemberEllyIds((current) =>
      current.includes(normalizedEllyId) ? current : [...current, normalizedEllyId],
    );
    setGroupMemberInput("");
  };

  const handleGroupSubmit = async (event) => {
    event.preventDefault();

    const conversation = await createGroupConversation({
      name: groupName,
      description: groupDescription,
      memberEllyIds: groupMemberEllyIds,
    });

    if (!conversation) return;

    setShowGroupForm(false);
    setGroupName("");
    setGroupDescription("");
    setGroupMemberInput("");
    setGroupMemberEllyIds([]);
    setActiveFilter("GROUP");
  };

  const handleConversationContextMenu = (event, conversation) => {
    event.preventDefault();
    openConversationContextMenu(conversation.id, {
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handleAddModalMember = () => {
    const normalizedEllyId = modalMemberInput.trim().toUpperCase();
    if (!normalizedEllyId) return;

    setModalMemberEllyIds((current) =>
      current.includes(normalizedEllyId) ? current : [...current, normalizedEllyId],
    );
    setModalMemberInput("");
  };

  const handleModalGroupSubmit = async (event) => {
    event.preventDefault();

    const conversation = groupModal.sourceConversationId
      ? await createGroupFromConversation(
          groupModal.sourceConversationId,
          modalGroupName,
          modalMemberEllyIds,
          modalGroupDescription,
        )
      : await createGroupConversation({
          name: modalGroupName,
          description: modalGroupDescription,
          memberEllyIds: modalMemberEllyIds,
        });

    if (!conversation) return;

    closeGroupModal();
    setActiveFilter("GROUP");
  };

  const handleConfirmDelete = async () => {
    const conversationId = deleteConfirm.conversationId;
    const result = await deleteConversationForCurrentUser(conversationId);
    if (result) {
      closeDeleteConfirm();
      toast("Chat deleted");
    } else {
      toast("Could not delete chat", "error");
    }
  };

  return (
    <>
    <aside className="messaging-panel-sidebar" aria-label="Conversations">
      <header className="messaging-panel-sidebar__header">
        <div>
          <h2>Messages</h2>
          <span>{totalUnread > 0 ? `${totalUnread} new` : "No unread"}</span>
        </div>
        <div className="messaging-panel-sidebar__header-actions">
          <button
            aria-label="Compose message"
            onClick={() => {
              setShowDirectForm((value) => !value);
              setShowGroupForm(false);
            }}
            type="button"
          >
            <Edit3 size={16} />
          </button>
          <button
            aria-label="Create group"
            onClick={() => {
              setShowGroupForm((value) => !value);
              setShowDirectForm(false);
            }}
            type="button"
          >
            <UsersRound size={16} />
          </button>
        </div>
      </header>

      {showDirectForm ? (
        <form className="messaging-direct-form" onSubmit={handleDirectSubmit}>
          <input
            aria-label="Enter Doctor or Staff ELLY ID"
            onChange={(event) => setNewDirectTargetEllyId(event.target.value)}
            placeholder="Enter Doctor or Staff ELLY ID"
            value={newDirectTargetEllyId}
          />
          <button disabled={loadingConversations} type="submit">
            Start
          </button>
        </form>
      ) : null}

      {showGroupForm ? (
        <form className="messaging-group-form" onSubmit={handleGroupSubmit}>
          <input
            aria-label="Group name"
            onChange={(event) => setGroupName(event.target.value)}
            placeholder="Group name"
            value={groupName}
          />
          <input
            aria-label="Group description"
            onChange={(event) => setGroupDescription(event.target.value)}
            placeholder="Description"
            value={groupDescription}
          />
          <div className="messaging-group-form__member-row">
            <input
              aria-label="Member ELLY ID"
              onChange={(event) => setGroupMemberInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleAddGroupMember();
                }
              }}
              placeholder="Member ELLY ID"
              value={groupMemberInput}
            />
            <button onClick={handleAddGroupMember} type="button">
              Add
            </button>
          </div>
          {groupMemberEllyIds.length ? (
            <div className="messaging-group-form__chips">
              {groupMemberEllyIds.map((ellyId) => (
                <button
                  key={ellyId}
                  onClick={() =>
                    setGroupMemberEllyIds((current) =>
                      current.filter((item) => item !== ellyId),
                    )
                  }
                  type="button"
                >
                  {ellyId}
                  <X size={12} />
                </button>
              ))}
            </div>
          ) : null}
          <button disabled={loadingConversations} type="submit">
            Create group
          </button>
        </form>
      ) : null}

      <label className="messaging-search">
        <Search size={16} />
        <input
          aria-label="Search conversations"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search conversations"
          type="search"
          value={query}
        />
      </label>

      <div className="messaging-filters" role="list" aria-label="Filters">
        {filters.map((filter) => (
          <button
            aria-pressed={activeFilter === filter.id}
            className={activeFilter === filter.id ? "is-active" : ""}
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            type="button"
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="messaging-conversation-list">
        {loadingConversations ? (
          <p className="messaging-conversation-list__empty">Loading conversations...</p>
        ) : null}
        {visibleConversations.map((conversation) => (
          <ConversationListItem
            conversation={conversation}
            isSelected={selectedConversationId === conversation.id}
            key={conversation.id}
            onContextMenu={handleConversationContextMenu}
            onSelect={() => selectConversation(conversation.id)}
          />
        ))}
        {visibleConversations.length === 0 ? (
          <p className="messaging-conversation-list__empty">
            No conversations found.
          </p>
        ) : null}
        {error ? (
          <p className="messaging-conversation-list__error">{error}</p>
        ) : null}
      </div>

      <button className="messaging-panel-sidebar__all" type="button">
        View all conversations
      </button>
    </aside>
    {contextMenu.isOpen && contextConversation ? (
      <div
        className="messaging-context-menu global-content-dropdown"
        onClick={(event) => event.stopPropagation()}
        role="menu"
        style={{ left: contextMenu.x, top: contextMenu.y }}
      >
        <button
          onClick={() => openGroupModalFromConversation(contextConversation.id)}
          role="menuitem"
          type="button"
        >
          <UsersRound size={14} />
          Create Group
        </button>
        <button
          className={contextConversation.type === "DEPARTMENT" ? "is-disabled" : ""}
          disabled={contextConversation.type === "DEPARTMENT"}
          onClick={() => openDeleteConfirm(contextConversation.id)}
          role="menuitem"
          title={
            contextConversation.type === "DEPARTMENT"
              ? "Cannot delete department channel"
              : undefined
          }
          type="button"
        >
          <Trash2 size={14} />
          Delete Chat
        </button>
      </div>
    ) : null}
    {groupModal.isOpen ? (
      <div className="messaging-modal-backdrop" role="presentation">
        <form
          aria-label="Create group"
          className="messaging-action-modal"
          onSubmit={handleModalGroupSubmit}
        >
          <header>
            <h3>Create Group</h3>
            <button aria-label="Cancel create group" onClick={closeGroupModal} type="button">
              <X size={16} />
            </button>
          </header>
          <input
            aria-label="Group name"
            onChange={(event) => setModalGroupName(event.target.value)}
            placeholder="Group name"
            value={modalGroupName}
          />
          <input
            aria-label="Group description"
            onChange={(event) => setModalGroupDescription(event.target.value)}
            placeholder="Description"
            value={modalGroupDescription}
          />
          <div className="messaging-action-modal__member-row">
            <input
              aria-label="Member ELLY ID"
              onChange={(event) => setModalMemberInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleAddModalMember();
                }
              }}
              placeholder="Member ELLY ID"
              value={modalMemberInput}
            />
            <button onClick={handleAddModalMember} type="button">
              Add
            </button>
          </div>
          {modalMemberEllyIds.length ? (
            <div className="messaging-action-modal__chips">
              {modalMemberEllyIds.map((ellyId) => (
                <button
                  key={ellyId}
                  onClick={() =>
                    setModalMemberEllyIds((current) =>
                      current.filter((item) => item !== ellyId),
                    )
                  }
                  type="button"
                >
                  {ellyId}
                  <X size={12} />
                </button>
              ))}
            </div>
          ) : null}
          <footer>
            <button onClick={closeGroupModal} type="button">
              Cancel
            </button>
            <button disabled={loadingConversations} type="submit">
              Create group
            </button>
          </footer>
        </form>
      </div>
    ) : null}
    {deleteConfirm.isOpen ? (
      <div className="messaging-modal-backdrop" role="presentation">
        <section
          aria-label="Delete chat confirmation"
          className="messaging-action-modal"
          role="dialog"
        >
          <header>
            <h3>Delete chat?</h3>
            <button aria-label="Cancel delete chat" onClick={closeDeleteConfirm} type="button">
              <X size={16} />
            </button>
          </header>
          <p>
            This will remove the chat from your conversation list. Messages will
            not be deleted for other members.
          </p>
          {deleteConversation ? <small>{deleteConversation.name}</small> : null}
          <footer>
            <button onClick={closeDeleteConfirm} type="button">
              Cancel
            </button>
            <button
              className="is-danger"
              disabled={deletingConversation}
              onClick={handleConfirmDelete}
              type="button"
            >
              Delete Chat
            </button>
          </footer>
        </section>
      </div>
    ) : null}
    </>
  );
}

export default ConversationList;
