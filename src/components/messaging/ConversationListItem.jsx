import {
  Bell,
  HeartPulse,
  Radio,
  ShieldAlert,
  Tag,
  UserRound,
  UsersRound,
} from "lucide-react";

const iconByTone = {
  danger: ShieldAlert,
  heart: HeartPulse,
  staff: UserRound,
  violet: Radio,
  teal: UsersRound,
  primary: UsersRound,
  warning: Tag,
  muted: Bell,
};

function ConversationListItem({ conversation, isSelected, onSelect }) {
  const ItemIcon = iconByTone[conversation.tone] || UsersRound;

  return (
    <button
      className={`conversation-item${isSelected ? " is-selected" : ""}`}
      onClick={onSelect}
      type="button"
    >
      <span className="conversation-item__avatar" data-tone={conversation.tone}>
        <ItemIcon size={18} />
      </span>
      <span className="conversation-item__body">
        <span className="conversation-item__title-row">
          <strong>{conversation.name}</strong>
          <time>{conversation.time}</time>
        </span>
        <small>{conversation.preview}</small>
      </span>
      {conversation.unread > 0 ? (
        <span className="conversation-item__unread">{conversation.unread}</span>
      ) : null}
    </button>
  );
}

export default ConversationListItem;
