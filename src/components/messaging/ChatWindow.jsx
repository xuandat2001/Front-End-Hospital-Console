import { useEffect, useMemo, useRef } from "react";
import { Info, UsersRound } from "lucide-react";
import useMessagingStore from "../../stores/useMessagingStore";
import ActiveCallBar from "./ActiveCallBar";
import IncomingCallModal from "./IncomingCallModal";
import MessageBubble from "./MessageBubble";
import MessageComposer from "./MessageComposer";
import VoiceCallButton from "./VoiceCallButton";

function ChatWindow() {
  const conversationEndRef = useRef(null);
  const conversations = useMessagingStore((state) => state.conversations);
  const selectedConversationId = useMessagingStore(
    (state) => state.selectedConversationId,
  );
  const messagesByConversation = useMessagingStore(
    (state) => state.messagesByConversation,
  );
  const typingByConversation = useMessagingStore(
    (state) => state.typingByConversation,
  );

  const selectedConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => conversation.id === selectedConversationId,
      ) || conversations[0],
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
        <div className="messaging-chat__empty">Select a conversation.</div>
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
          <VoiceCallButton conversation={selectedConversation} />
          <button aria-label="Conversation information" type="button">
            <Info size={16} />
          </button>
        </div>
      </header>

      <div className="messaging-chat__body" role="log" aria-live="polite">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {typingByConversation[selectedConversation.id] ? (
          <span className="messaging-typing">
            {typingByConversation[selectedConversation.id]} is typing...
          </span>
        ) : null}
        <span ref={conversationEndRef} />
      </div>

      <IncomingCallModal />
      <ActiveCallBar />
      <MessageComposer conversationId={selectedConversation.id} />
    </section>
  );
}

export default ChatWindow;
