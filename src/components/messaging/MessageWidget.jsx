import { useEffect } from "react";
import { Clock3, Maximize2, Radio } from "lucide-react";
import useMessagingStore from "../../stores/useMessagingStore";
import MessagingPanel from "./MessagingPanel";
import "./Messaging.css";

function MessageWidget() {
  const conversations = useMessagingStore((state) => state.conversations);
  const totalUnread = useMessagingStore((state) => state.totalUnread);
  const loadingConversations = useMessagingStore(
    (state) => state.loadingConversations,
  );
  const error = useMessagingStore((state) => state.error);
  const openMessaging = useMessagingStore((state) => state.openMessaging);
  const refreshMessaging = useMessagingStore(
    (state) => state.refreshMessaging,
  );
  const latestConversation = conversations[0];
  const latestMessage = latestConversation?.preview ||
    "Cardiology Team: Cath lab is prepped.";
  const [latestSender, ...messageParts] = latestMessage.split(": ");
  const hasSender = messageParts.length > 0;

  useEffect(() => {
    refreshMessaging();
    const intervalId = window.setInterval(refreshMessaging, 10000);

    return () => window.clearInterval(intervalId);
  }, [refreshMessaging]);

  return (
    <>
      <section className="utility-card message-widget" aria-label="In message">
        <div className="message-widget__header">
          <div className="message-widget__eyebrow">
            <Radio size={12} />
            <span>In Message</span>
          </div>
          <button
            aria-label="Open messages"
            className="message-widget__icon-button"
            onClick={openMessaging}
            type="button"
          >
            <Maximize2 size={10} />
          </button>
        </div>

        <button
          className="message-widget__preview"
          onClick={openMessaging}
          type="button"
        >
          <span className="message-widget__channel-mark" aria-hidden="true">
            <span>#</span>
          </span>
          <span className="message-widget__preview-copy">
            <span className="message-widget__channel-row">
              <strong>{latestConversation?.name || "# Emergency"}</strong>
              <time>{latestConversation?.time || "Now"}</time>
            </span>
            <small>
              {hasSender ? <b>{latestSender}</b> : null}
              {hasSender ? messageParts.join(": ") : latestMessage}
            </small>
          </span>
          {totalUnread > 0 ? (
            <span className="message-widget__unread" aria-label={`${totalUnread} unread messages`}>
              {totalUnread}
            </span>
          ) : null}
        </button>

        <div className="message-widget__status">
          <Clock3 size={11} />
          <span>{totalUnread > 0 ? `${totalUnread} unread across your teams` : "You're caught up"}</span>
        </div>
      </section>
      <MessagingPanel />
    </>
  );
}

export default MessageWidget;
