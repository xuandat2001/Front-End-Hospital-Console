import { useEffect, useRef } from "react";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import useMessagingStore from "../../stores/useMessagingStore";

function StreamVideo({ stream, className, isMuted, label }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream || null;
    }
  }, [stream]);

  return (
    <div className={className}>
      <video
        aria-label={label}
        autoPlay
        muted={isMuted}
        playsInline
        ref={videoRef}
      />
      {!stream ? <span>{label}</span> : null}
    </div>
  );
}

function ActiveCallPanel() {
  const activeCall = useMessagingStore((state) => state.activeCall);
  const localStream = useMessagingStore((state) => state.localStream);
  const remoteStream = useMessagingStore((state) => state.remoteStream);
  const callStatus = useMessagingStore((state) => state.callStatus);
  const callError = useMessagingStore((state) => state.callError);
  const isMuted = useMessagingStore((state) => state.isMuted);
  const isCameraOff = useMessagingStore((state) => state.isCameraOff);
  const toggleMute = useMessagingStore((state) => state.toggleMute);
  const toggleCamera = useMessagingStore((state) => state.toggleCamera);
  const endCall = useMessagingStore((state) => state.endCall);

  if (!activeCall || !["ringing", "accepted"].includes(callStatus)) return null;

  return (
    <section className="active-call-panel" aria-label="Active video call">
      <div className="active-call-panel__stage">
        <StreamVideo
          className="active-call-panel__remote"
          isMuted={false}
          label={callStatus === "accepted" ? "Waiting for remote video" : "Calling"}
          stream={remoteStream}
        />
        <StreamVideo
          className="active-call-panel__local"
          isMuted
          label="Local preview"
          stream={localStream}
        />
      </div>
      <div className="active-call-panel__footer">
        <span>{callStatus === "accepted" ? "Video call active" : "Ringing"}</span>
        {callError ? <small>{callError}</small> : null}
        <div>
          <button aria-label={isMuted ? "Unmute" : "Mute"} onClick={toggleMute} type="button">
            {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
          <button
            aria-label={isCameraOff ? "Turn camera on" : "Turn camera off"}
            onClick={toggleCamera}
            type="button"
          >
            {isCameraOff ? <VideoOff size={16} /> : <Video size={16} />}
          </button>
          <button
            aria-label="End video call"
            className="active-call-panel__end"
            onClick={() => endCall(activeCall.callId)}
            type="button"
          >
            <PhoneOff size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}

export default ActiveCallPanel;
