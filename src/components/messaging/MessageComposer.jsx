import { useRef, useState } from "react";
import { AtSign, Mic, Paperclip, Send, Smile, Square } from "lucide-react";
import useMessagingStore from "../../stores/useMessagingStore";
import { MOCK_MODE } from "../../mocks/mockSession";

function MessageComposer({ conversationId }) {
  const [content, setContent] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const fileInputRef = useRef(null);
  const sendMessage = useMessagingStore((state) => state.sendMessage);
  const uploadAttachment = useMessagingStore((state) => state.uploadAttachment);
  const uploadVoiceNote = useMessagingStore((state) => state.uploadVoiceNote);
  const sendTypingStart = useMessagingStore((state) => state.sendTypingStart);
  const sendTypingStop = useMessagingStore((state) => state.sendTypingStop);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedContent = content.trim();
    if (!trimmedContent) return;

    await sendMessage(conversationId, trimmedContent);
    setContent("");
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await uploadAttachment(conversationId, file);
    event.target.value = "";
  };

  const startRecording = async () => {
    if (MOCK_MODE) {
      const file = new File(["Mock prototype voice note"], `voice-note-${Date.now()}.webm`, {
        type: "audio/webm",
      });
      setIsRecording(false);
      await uploadVoiceNote(conversationId, file);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const file = new File([blob], `voice-note-${Date.now()}.webm`, {
        type: "audio/webm",
      });
      stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      await uploadVoiceNote(conversationId, file);
    };

    recorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
  };

  return (
    <form className="messaging-composer" onSubmit={handleSubmit}>
      <input
        ref={fileInputRef}
        className="messaging-composer__file"
        onChange={handleFileChange}
        type="file"
      />
      <button
        aria-label="Attach file"
        onClick={() => fileInputRef.current?.click()}
        type="button"
      >
        <Paperclip size={18} />
      </button>
      <input
        aria-label="Type a message"
        onBlur={() => sendTypingStop(conversationId)}
        onChange={(event) => {
          setContent(event.target.value);
          sendTypingStart(conversationId);
        }}
        placeholder="Type a message..."
        value={content}
      />
      <button aria-label="Add emoji" type="button">
        <Smile size={18} />
      </button>
      <button aria-label="Mention staff" type="button">
        <AtSign size={18} />
      </button>
      <button
        aria-label={isRecording ? "Stop voice note" : "Record voice note"}
        onClick={isRecording ? stopRecording : startRecording}
        type="button"
      >
        {isRecording ? <Square size={16} /> : <Mic size={18} />}
      </button>
      <button
        aria-label="Send message"
        className="messaging-composer__send"
        disabled={!content.trim()}
        type="submit"
      >
        <Send size={18} />
      </button>
    </form>
  );
}

export default MessageComposer;
