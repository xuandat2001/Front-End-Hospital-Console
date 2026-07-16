import { useState } from "react";
import { AtSign, Paperclip, Send, Smile } from "lucide-react";
import useMessagingStore from "../../stores/useMessagingStore";

function MessageComposer({ conversationId }) {
  const [content, setContent] = useState("");
  const sending = useMessagingStore((state) => state.sending);
  const sendMessage = useMessagingStore((state) => state.sendMessage);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedContent = content.trim();
    if (!trimmedContent || sending) return;

    try {
      await sendMessage(conversationId, trimmedContent);
      setContent("");
    } catch {
      // The store owns the user-facing error state.
    }
  };

  return (
    <form className="messaging-composer" onSubmit={handleSubmit}>
      <button aria-label="Attach file" type="button">
        <Paperclip size={18} />
      </button>
      <input
        aria-label="Type a message"
        onChange={(event) => setContent(event.target.value)}
        placeholder="Type a message..."
        value={content}
      />
      <button aria-label="Add emoji" type="button">
        <Smile size={18} />
      </button>
      <button aria-label="Mention staff" type="button">
        <AtSign size={18} />
      </button>
      <button
        aria-label="Send message"
        className="messaging-composer__send"
        disabled={!content.trim() || sending}
        type="submit"
      >
        <Send size={18} />
      </button>
    </form>
  );
}

export default MessageComposer;
