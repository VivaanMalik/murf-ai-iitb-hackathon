import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "agent" | "system";
  content: string;
}

const API_BASE_URL = "http://localhost:8000";

interface VoiceChatOptions {
  // Called after each user message completes its /api/chat round-trip
  onAfterUserMessage?: () => void;
}

export const useVoiceChat = (options?: VoiceChatOptions) => {
  const { onAfterUserMessage } = options || {};

  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(-1);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingAudioRef = useRef(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  // ------------------------------------------------------
  // STOP SPEAKING: interrupt LLM stream + TTS playback
  // ------------------------------------------------------
  const stopSpeaking = useCallback(() => {
    // Abort current /api/chat streaming fetch if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Stop audio playback
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }

    // Clear queue
    audioQueueRef.current = [];
    isPlayingAudioRef.current = false;

    // Reset flags
    setIsAgentSpeaking(false);
    setIsPlaying(false);
    setCurrentSentenceIndex(-1);
  }, []);

  // ------------------------------------------------------
  // RECORDING: non-streaming STT via /api/transcribe
  // ------------------------------------------------------
  const startRecording = useCallback(async () => {
    try {
      // If the bot is currently speaking, stop it before starting to record
      if (isAgentSpeaking || isPlaying) {
        stopSpeaking();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        // stop mic
        stream.getTracks().forEach((track) => track.stop());
        setAudioStream(null);

        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("Failed to access microphone");
    }
  }, [isAgentSpeaking, isPlaying, stopSpeaking]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  // ------------------------------------------------------
  // HANDLE /api/chat STREAMING RESPONSE (NDJSON)
  // ------------------------------------------------------
  const handleStreamingResponse = async (
    response: Response,
    userMessageId: string
  ) => {
    if (!response.body) {
      throw new Error("No response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const agentMessageId = (Date.now() + 1).toString();
    let agentContent = "";
    let isFirstChunk = true;

    // Add initial empty agent message
    const agentMessage: Message = {
      id: agentMessageId,
      role: "agent",
      content: "",
    };
    setMessages((prev) => [...prev, agentMessage]);

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          setIsAgentSpeaking(false);
          setCurrentSentenceIndex(-1);
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // keep last incomplete line

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const chunk = JSON.parse(line);

            // First chunk may contain full_text
            if (isFirstChunk && chunk.full_text) {
              agentContent = chunk.full_text;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === agentMessageId
                    ? { ...msg, content: agentContent }
                    : msg
                )
              );
              isFirstChunk = false;
            }

            // Fallback: incremental text_chunk
            if (!chunk.full_text && "text_chunk" in chunk) {
              agentContent += chunk.text_chunk;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === agentMessageId
                    ? { ...msg, content: agentContent }
                    : msg
                )
              );
            }

            // Sentence index for highlighting
            if (typeof chunk.index === "number") {
              setCurrentSentenceIndex(chunk.index);
            }

            // Audio chunks to play
            if (chunk.audio_chunk) {
              if (!isFirstChunk) {
                setIsAgentSpeaking(true);
              }
              queueAudio(chunk.audio_chunk);
            }

            // Completion
            if (chunk.status === "done" || chunk.status === "complete") {
              setIsAgentSpeaking(false);
              setCurrentSentenceIndex(-1);
            }

            if (chunk.error) {
              console.error("Stream error:", chunk.error);
              toast.error(chunk.error);
              setIsAgentSpeaking(false);
            }
          } catch (e) {
            console.error("Error parsing chunk:", line, e);
          }
        }
      }
    } catch (error: any) {
      if (error?.name === "AbortError") {
        console.log("Stream aborted by user");
      } else {
        console.error("Error reading stream:", error);
        toast.error("Error while streaming response");
      }
    } finally {
      setIsAgentSpeaking(false);
      setCurrentSentenceIndex(-1);
    }
  };

  // ------------------------------------------------------
  // PROCESS AUDIO: /api/transcribe → /api/chat (stream)
  // ------------------------------------------------------
  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);

    try {
      // 1) Transcribe
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.webm");

      const transcribeResponse = await fetch(
        `${API_BASE_URL}/api/transcribe`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!transcribeResponse.ok) {
        throw new Error("Transcription failed");
      }

      const { transcription } = await transcribeResponse.json();

      if (!transcription) {
        console.error("No transcription available to send");
        setIsProcessing(false);
        return;
      }

      // 2) Add user message locally
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: transcription,
      };
      setMessages((prev) => [...prev, userMessage]);

      // 3) Send to /api/chat (streaming)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const chatResponse = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_message: transcription,
          user_id: "user_1",
        }),
        signal: controller.signal,
      });

      if (!chatResponse.ok) {
        throw new Error("Chat request failed");
      }

      await handleStreamingResponse(chatResponse, userMessage.id);

      // 🔥 after voice message round-trip completes
      onAfterUserMessage?.();
    } catch (error: any) {
      if (error?.name === "AbortError") {
        console.log("Chat request aborted");
      } else {
        console.error("Error processing audio:", error);
        toast.error("Failed to process your message");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // ------------------------------------------------------
  // AUDIO PLAYBACK QUEUE
  // ------------------------------------------------------
  const playNext = () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingAudioRef.current = false;
      setIsPlaying(false);
      setCurrentSentenceIndex(-1);
      return;
    }

    const audioBase64 = audioQueueRef.current.shift()!;
    isPlayingAudioRef.current = true;
    setIsPlaying(true);

    try {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }

      const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
      audioElementRef.current = audio;

      audio.onended = () => {
        audioElementRef.current = null;
        playNext();
      };

      audio.onerror = (error) => {
        console.error("Error playing audio:", error);
        audioElementRef.current = null;
        playNext();
      };

      audio
        .play()
        .catch((error) => {
          console.error("Error starting audio playback:", error);
          playNext();
        });
    } catch (error) {
      console.error("Error creating audio:", error);
      playNext();
    }
  };

  const queueAudio = (audioBase64: string) => {
    audioQueueRef.current.push(audioBase64);
    if (!isPlayingAudioRef.current) {
      playNext();
    }
  };

  // ------------------------------------------------------
  // SEND TEXT MESSAGE: /api/chat (streaming)
  // ------------------------------------------------------
  const sendTextMessage = async (text: string) => {
    if (!text.trim()) return;

    setIsProcessing(true);

    try {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: text.trim(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Abort any previous stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const chatResponse = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_message: text.trim(),
          user_id: "user_1",
        }),
        signal: controller.signal,
      });

      if (!chatResponse.ok) {
        throw new Error("Chat request failed");
      }

      await handleStreamingResponse(chatResponse, userMessage.id);

      // 🔥 after text message round-trip completes
      onAfterUserMessage?.();
    } catch (error: any) {
      if (error?.name === "AbortError") {
        console.log("Chat request aborted");
      } else {
        console.error("Error sending text message:", error);
        toast.error("Failed to send your message");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // ------------------------------------------------------
  // PUBLIC API
  // ------------------------------------------------------
  return {
    messages,
    isRecording,
    isProcessing,
    isPlaying,
    isAgentSpeaking,
    audioStream,
    currentSentenceIndex,
    startRecording,
    stopRecording,
    sendTextMessage,
    stopSpeaking,
  };
};
