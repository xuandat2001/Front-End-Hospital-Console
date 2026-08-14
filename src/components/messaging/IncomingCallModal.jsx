import { PhoneOff, Video } from "lucide-react";
import useMessagingStore from "../../stores/useMessagingStore";

function IncomingCallModal() {
  const incomingCall = useMessagingStore((state) => state.incomingCall);
  const acceptCall = useMessagingStore((state) => state.acceptCall);
  const rejectCall = useMessagingStore((state) => state.rejectCall);

  if (!incomingCall?.call) return null;

  const call = incomingCall.call;

  return (
    <div className="incoming-call-modal" role="dialog" aria-label="Incoming call">
      <div>
        <strong>Incoming video call</strong>
        <span>{incomingCall.caller?.fullName || call.callerEllyId}</span>
      </div>
      <button
        aria-label="Accept call"
        className="incoming-call-modal__accept"
        onClick={() => acceptCall(call.callId)}
        type="button"
      >
        <Video size={16} />
      </button>
      <button
        aria-label="Reject call"
        className="incoming-call-modal__reject"
        onClick={() => rejectCall(call.callId)}
        type="button"
      >
        <PhoneOff size={16} />
      </button>
    </div>
  );
}

export default IncomingCallModal;
