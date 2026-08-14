import { Video } from "lucide-react";
import useMessagingStore from "../../stores/useMessagingStore";

function VideoCallButton({ conversation }) {
  const initiateVideoCall = useMessagingStore((state) => state.initiateVideoCall);
  const callStatus = useMessagingStore((state) => state.callStatus);
  const enabled = import.meta.env.VITE_ENABLE_VIDEO_CALLS !== "false";

  if (!enabled || !conversation || conversation.type !== "DIRECT") return null;

  return (
    <button
      aria-label="Start video call"
      disabled={["ringing", "incoming", "accepted"].includes(callStatus)}
      onClick={() => initiateVideoCall(conversation)}
      type="button"
    >
      <Video size={16} />
    </button>
  );
}

export default VideoCallButton;
