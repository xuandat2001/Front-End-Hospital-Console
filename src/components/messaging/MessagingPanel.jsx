import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import useMessagingStore from "../../stores/useMessagingStore";
import ChatWindow from "./ChatWindow";
import ConversationList from "./ConversationList";

function MessagingPanel() {
  const isMessagingOpen = useMessagingStore((state) => state.isMessagingOpen);
  const closeMessaging = useMessagingStore((state) => state.closeMessaging);
  const seedDemoMessagingData = useMessagingStore(
    (state) => state.seedDemoMessagingData,
  );

  useEffect(() => {
    seedDemoMessagingData();
  }, [seedDemoMessagingData]);

  useEffect(() => {
    if (!isMessagingOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") closeMessaging();
    };
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMessaging, isMessagingOpen]);

  if (!isMessagingOpen) return null;

  return createPortal(
    <div className="messaging-panel-overlay" role="presentation">
      <button
        aria-label="Close messages"
        className="messaging-scrim"
        data-no-ripple="true"
        onClick={closeMessaging}
        type="button"
      />
      <section
        aria-label="Messages"
        aria-modal="true"
        className="messaging-panel"
        role="dialog"
      >
        <button
          aria-label="Close messages"
          className="messaging-panel__close"
          data-no-ripple="true"
          onClick={closeMessaging}
          type="button"
        >
          <X size={17} />
        </button>
        <ConversationList />
        <ChatWindow />
      </section>
    </div>,
    document.body,
  );
}

export default MessagingPanel;
