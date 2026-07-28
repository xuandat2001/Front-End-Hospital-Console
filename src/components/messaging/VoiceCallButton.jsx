import { Phone } from "lucide-react";
import useSessionStore from "../../store/useSessionStore";
import useMessagingStore from "../../stores/useMessagingStore";

function VoiceCallButton({ conversation }) {
  const initiateCall = useMessagingStore((state) => state.initiateCall);
  const currentEllyId = useSessionStore((state) => state.currentUser?.ellyId);

  if (!conversation || conversation.type !== "DIRECT") return null;

  const calleeEllyId = (conversation.memberIds || []).find(
    (ellyId) => ellyId !== currentEllyId,
  );

  if (!calleeEllyId) return null;

  return (
    <button
      aria-label="Start voice call"
      onClick={() => initiateCall(calleeEllyId, conversation.id)}
      type="button"
    >
      <Phone size={16} />
    </button>
  );
}

export default VoiceCallButton;
