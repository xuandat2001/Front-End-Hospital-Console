import { useEffect, useMemo, useRef } from "react";
import { Info, Phone, UsersRound } from "lucide-react";
import useMessagingStore from "../../stores/useMessagingStore";
import useSessionStore from "../../store/useSessionStore";
import MessageBubble from "./MessageBubble";
import MessageComposer from "./MessageComposer";

function ChatWindow() {
  const conversationEndRef = useRef(null);
  const conversations = useMessagingStore((state) => state.conversations);
  const selectedConversationId = useMessagingStore(
    (state) => state.selectedConversationId,
  );
  const messagesByConversation = useMessagingStore(
    (state) => state.messagesByConversation,
  );
  const loadingMessages = useMessagingStore((state) => state.loadingMessages);
  const error = useMessagingStore((state) => state.error);
  const currentUser = useSessionStore((state) => state.currentUser);

  const selectedConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => conversation.id === selectedConversationId,
      ),
    [conversations, selectedConversationId],
  );
  const messages = selectedConversation
    ? messagesByConversation[selectedConversation.id] || []
    : [];

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, selectedConversation?.id]);

  if (!selectedConversation) {
    return (
      <section className="messaging-chat">
        <div className="messaging-chat__empty">
          Select a conversation to start messaging.
        </div>
      </section>
    );
  }

  return (
    <section className="messaging-chat" aria-label={selectedConversation.name}>
      <header className="messaging-chat__header">
        <div>
          <span className="messaging-chat__eyebrow">
            {selectedConversation.type}
          </span>
          <h2>{selectedConversation.name}</h2>
          <p>{selectedConversation.subtitle}</p>
        </div>
        <div className="messaging-chat__actions">
          <button aria-label="View members" type="button">
            <UsersRound size={16} />
            <span>24</span>
          </button>
          <button aria-label="Start call" type="button">
            <Phone size={16} />
          </button>
          <button aria-label="Conversation information" type="button">
            <Info size={16} />
          </button>
        </div>
      </header>

      <div className="messaging-chat__body" role="log" aria-live="polite">
        {loadingMessages ? (
          <div className="messaging-chat__empty">Loading messages...</div>
        ) : null}
        {!loadingMessages && error ? (
          <div className="messaging-chat__empty">{error}</div>
        ) : null}
        {!loadingMessages && !error && messages.length === 0 ? (
          <div className="messaging-chat__empty">No messages yet.</div>
        ) : null}
        {!loadingMessages
          ? messages.map((message) => (
              <MessageBubble
                isSelf={message.senderEllyId === currentUser?.ellyId}
                key={message.id}
                message={message}
              />
            ))
          : null}
        <span ref={conversationEndRef} />
      </div>

      <MessageComposer conversationId={selectedConversation.id} />
    </section>
  );
}

export default ChatWindow;
