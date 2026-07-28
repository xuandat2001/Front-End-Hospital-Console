import { useState } from "react";
import useMessagingStore from "../../stores/useMessagingStore";

function getReactionLabel(reaction) {
  if (reaction.emoji === "thumbs-up") return "Like";
  return reaction.emoji;
}

function MessageBubble({ message }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const editMessage = useMessagingStore((state) => state.editMessage);
  const deleteMessage = useMessagingStore((state) => state.deleteMessage);
  const addReaction = useMessagingStore((state) => state.addReaction);
  const pinMessage = useMessagingStore((state) => state.pinMessage);
  const unpinMessage = useMessagingStore((state) => state.unpinMessage);

  const handleEdit = async () => {
    if (!draft.trim()) return;
    await editMessage(message.id, draft.trim());
    setIsEditing(false);
  };

  return (
    <article className={`message-bubble${message.isSelf ? " is-self" : ""}`}>
      <div className="message-bubble__meta">
        <strong>{message.sender}</strong>
        <time>{message.time}</time>
        {message.pinned?.isPinned ? <span>Pinned</span> : null}
      </div>
      {message.replyTo ? (
        <div className="message-bubble__reply">
          {message.replyTo.senderEllyId}: {message.replyTo.contentPreview}
        </div>
      ) : null}
      <div className="message-bubble__content">
        {isEditing ? (
          <span className="message-bubble__edit">
            <input
              aria-label="Edit message"
              onChange={(event) => setDraft(event.target.value)}
              value={draft}
            />
            <button onClick={handleEdit} type="button">
              Save
            </button>
          </span>
        ) : message.messageType === "VOICE_NOTE" && message.voiceNote?.url ? (
          <audio controls src={message.voiceNote.url} />
        ) : message.attachments?.length ? (
          <span className="message-bubble__attachments">
            {message.content}
            {message.attachments.map((attachment) => (
              <a href={attachment.url} key={attachment.attachmentId} rel="noreferrer" target="_blank">
                {attachment.originalName || attachment.fileName}
              </a>
            ))}
          </span>
        ) : (
          message.content
        )}
      </div>
      <div className="message-bubble__footer">
        {message.reactions?.map((reaction) => (
          <span
            className="message-bubble__reaction"
            key={`${reaction.emoji}-${reaction.count}`}
          >
            {getReactionLabel(reaction)} {reaction.count}
          </span>
        ))}
        {message.isEdited ? <small>edited</small> : null}
        {message.status ? <small>{message.status}</small> : null}
        <button onClick={() => addReaction(message.id, "👍")} type="button">
          👍
        </button>
        <button
          onClick={() =>
            message.pinned?.isPinned
              ? unpinMessage(message.id)
              : pinMessage(message.id)
          }
          type="button"
        >
          {message.pinned?.isPinned ? "Unpin" : "Pin"}
        </button>
        {message.isSelf && !message.isDeleted ? (
          <>
            <button onClick={() => setIsEditing((value) => !value)} type="button">
              Edit
            </button>
            <button onClick={() => deleteMessage(message.id)} type="button">
              Delete
            </button>
          </>
        ) : null}
      </div>
    </article>
  );
}

export default MessageBubble;
