const DEFAULT_ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

export function createVoicePeerConnection({ onIceCandidate, onRemoteStream } = {}) {
  const peerConnection = new RTCPeerConnection({
    iceServers: DEFAULT_ICE_SERVERS,
  });

  peerConnection.onicecandidate = (event) => {
    if (event.candidate && onIceCandidate) {
      onIceCandidate(event.candidate);
    }
  };

  peerConnection.ontrack = (event) => {
    if (event.streams?.[0] && onRemoteStream) {
      onRemoteStream(event.streams[0]);
    }
  };

  return peerConnection;
}

export async function getMicrophoneStream() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone capture is not supported in this browser");
  }

  return navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false,
  });
}

export function stopMediaStream(stream) {
  stream?.getTracks?.().forEach((track) => track.stop());
}
