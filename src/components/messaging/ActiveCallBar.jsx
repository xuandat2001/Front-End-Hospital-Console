import { PhoneOff } from "lucide-react";
import useMessagingStore from "../../stores/useMessagingStore";

function ActiveCallBar() {
  const activeCall = useMessagingStore((state) => state.activeCall);
  const callStatus = useMessagingStore((state) => state.callStatus);
  const endCall = useMessagingStore((state) => state.endCall);

  if (!activeCall || !["ringing", "accepted"].includes(callStatus)) return null;

  return (
    <div className="active-call-bar" role="status">
      <span>
        {callStatus === "accepted" ? "Voice call active" : "Calling"} ·{" "}
        {activeCall.calleeEllyId}
      </span>
      <button
        aria-label="End call"
        onClick={() => endCall(activeCall.callId)}
        type="button"
      >
        <PhoneOff size={15} />
      </button>
    </div>
  );
}

export default ActiveCallBar;
