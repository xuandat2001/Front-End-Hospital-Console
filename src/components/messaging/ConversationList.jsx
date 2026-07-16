import { useMemo, useState } from "react";
import { Edit3, Search } from "lucide-react";
import useMessagingStore from "../../stores/useMessagingStore";
import ConversationListItem from "./ConversationListItem";

const filters = [
  { id: "ALL", label: "All" },
  { id: "DIRECT", label: "Direct" },
  { id: "DEPARTMENT", label: "Channels" },
  { id: "GROUP", label: "Teams" },
];

function ConversationList() {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const conversations = useMessagingStore((state) => state.conversations);
  const totalUnread = useMessagingStore((state) => state.totalUnread);
  const unreadByConversation = useMessagingStore(
    (state) => state.unreadByConversation,
  );
  const loadingConversations = useMessagingStore(
    (state) => state.loadingConversations,
  );
  const error = useMessagingStore((state) => state.error);
  const selectedConversationId = useMessagingStore(
    (state) => state.selectedConversationId,
  );
  const selectConversation = useMessagingStore(
    (state) => state.selectConversation,
  );

  const visibleConversations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return conversations.filter((conversation) => {
      const matchesFilter =
        activeFilter === "ALL" || conversation.type === activeFilter;
      const matchesQuery =
        !normalizedQuery ||
        conversation.name?.toLowerCase().includes(normalizedQuery) ||
        conversation.preview?.toLowerCase().includes(normalizedQuery);

      return matchesFilter && matchesQuery;
    });
  }, [activeFilter, conversations, query]);

  return (
    <aside className="messaging-panel-sidebar" aria-label="Conversations">
      <header className="messaging-panel-sidebar__header">
        <div>
          <h2>Messages</h2>
          <span>{totalUnread > 0 ? `${totalUnread} new` : "No unread"}</span>
        </div>
        <button aria-label="Compose message" type="button">
          <Edit3 size={16} />
        </button>
      </header>

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
          <p className="messaging-conversation-list__empty">
            Loading conversations...
          </p>
        ) : null}
        {!loadingConversations && error ? (
          <p className="messaging-conversation-list__empty">{error}</p>
        ) : null}
        {visibleConversations.map((conversation) => (
          <ConversationListItem
            conversation={conversation}
            isSelected={selectedConversationId === conversation.id}
            key={conversation.id}
            unreadCount={unreadByConversation[conversation.id] || 0}
            onSelect={() => selectConversation(conversation.id)}
          />
        ))}
        {!loadingConversations && visibleConversations.length === 0 ? (
          <p className="messaging-conversation-list__empty">
            {query || activeFilter !== "ALL"
              ? "No conversations found."
              : "No conversations yet."}
          </p>
        ) : null}
      </div>

      <button className="messaging-panel-sidebar__all" type="button">
        View all conversations
      </button>
    </aside>
  );
}

export default ConversationList;
