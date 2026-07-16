function getReactionLabel(reaction) {
  if (reaction.emoji === "thumbs-up") return "Like";
  return reaction.emoji;
}

function formatTime(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function MessageBubble({ isSelf, message }) {
  return (
    <article className={`message-bubble${isSelf ? " is-self" : ""}`}>
      <div className="message-bubble__meta">
        <strong>{isSelf ? "You" : message.sender}</strong>
        <time>{formatTime(message.time)}</time>
      </div>
      <div className="message-bubble__content">{message.content}</div>
      <div className="message-bubble__footer">
        {message.reactions?.map((reaction) => (
          <span
            className="message-bubble__reaction"
            key={`${reaction.emoji}-${reaction.count}`}
          >
            {getReactionLabel(reaction)} {reaction.count}
          </span>
        ))}
        {message.status ? <small>{message.status}</small> : null}
      </div>
    </article>
  );
}

export default MessageBubble;
