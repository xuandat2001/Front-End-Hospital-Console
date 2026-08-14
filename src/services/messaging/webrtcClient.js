const DEFAULT_ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

let peerConnection = null;
let localStream = null;

function assertWebRtcSupport() {
  if (typeof RTCPeerConnection === "undefined") {
    throw new Error("WebRTC is not supported in this browser");
  }
}

export async function startLocalMedia() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera and microphone capture are not supported in this browser");
  }

  if (localStream) return localStream;

  localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true,
  });

  return localStream;
}

export function createPeerConnection({ onIceCandidate, onRemoteStream } = {}) {
  assertWebRtcSupport();

  if (peerConnection) {
    peerConnection.close();
  }

  peerConnection = new RTCPeerConnection({
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

  localStream?.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  return peerConnection;
}

export async function createOffer() {
  if (!peerConnection) {
    throw new Error("Peer connection has not been created");
  }

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  return offer;
}

export async function handleOffer(offer) {
  if (!peerConnection) {
    throw new Error("Peer connection has not been created");
  }

  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  return answer;
}

export async function handleAnswer(answer) {
  if (!peerConnection) {
    throw new Error("Peer connection has not been created");
  }

  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
}

export async function handleIceCandidate(candidate) {
  if (!peerConnection || !candidate) return;

  await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
}

export function setAudioEnabled(enabled) {
  localStream?.getAudioTracks().forEach((track) => {
    track.enabled = enabled;
  });
}

export function setVideoEnabled(enabled) {
  localStream?.getVideoTracks().forEach((track) => {
    track.enabled = enabled;
  });
}

export function stopCall() {
  if (peerConnection) {
    peerConnection.onicecandidate = null;
    peerConnection.ontrack = null;
    peerConnection.close();
    peerConnection = null;
  }

  localStream?.getTracks().forEach((track) => track.stop());
  localStream = null;
}

export function getLocalStream() {
  return localStream;
}
