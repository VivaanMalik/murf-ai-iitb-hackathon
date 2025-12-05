import { useEffect, useRef, useState } from "react";

import ChatMessage from "@/components/ChatMessage";
import StreamingAgentResponse from "@/components/StreamingAgentResponse";
import RecordButton from "@/components/RecordButton";
import AudioReactiveParticles from "@/components/AudioReactiveParticles"; // Used for the microphone glow
import BackgroundParticles from "@/components/BackgroundParticles"; // Used for the full background
import SettingsPanel from "@/components/SettingsPanel";
import VoiceActivityIndicator from "@/components/VoiceActivityIndicator";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import { Loader2, Send, Square, FileUp } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import KnowledgeSidebar, {
  KnowledgeSidebarRef,
} from "@/components/KnowledgeSidebar";

import type React from "react";

const Index = () => {
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);
  const sidebarRef = useRef<KnowledgeSidebarRef | null>(null);

  const {
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
  } = useVoiceChat({
    onAfterUserMessage: () => {
      sidebarRef.current?.refreshDocuments();
    }
  });


  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [textInput, setTextInput] = useState("");
  const [isPdfProcessing, setIsPdfProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Settings state
  const [voicePersona, setVoicePersona] = useState("conversational");
  const [accentColor, setAccentColor] = useState("180 100% 50%");
  const [isDarkMode, setIsDarkMode] = useState(true);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      alert("Please upload a PDF file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      const res = await fetch("http://localhost:8000/api/upload_pdf", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      console.log("PDF Upload Response:", json);
      alert("PDF uploaded & ingested successfully!");

      // 🔥 After new PDF is ingested, refresh the sidebar
      setSidebarRefreshKey((k) => k + 1);
      sidebarRef.current?.refreshDocuments();
    } catch (err) {
      console.error(err);
      alert("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--accent", accentColor);
    root.style.setProperty("--accent-glow", accentColor);
    root.style.setProperty("--primary", accentColor);
    root.style.setProperty("--ring", accentColor);
    root.style.setProperty("--record-button", accentColor);
    root.style.setProperty("--record-button-glow", accentColor);
    root.style.setProperty("--record-button-active", "0 100% 50%");
    root.style.setProperty("--waveform", accentColor);
    root.style.setProperty("--agent-bubble-border", accentColor);
    root.style.setProperty("--citation-card-border", accentColor);
    root.style.setProperty("--user-bubble", accentColor);
    root.style.setProperty("--user-bubble-glow", accentColor);
  }, [accentColor]);

  const handleThemeToggle = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("light");
  };

  const handleSendText = () => {
    // Prevent sending "Listening..." as a message
    if (textInput.trim() && !isProcessing && textInput !== "Listening...") {
      sendTextMessage(textInput);
      setTextInput("");

      // 🔥 Refresh sidebar after sending a text message
      setSidebarRefreshKey((k) => k + 1);
      sidebarRef.current?.refreshDocuments();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  // ⬇️ Only processing truly disables controls; speaking can be interrupted
  const isDisabled = isProcessing;

  const handleStart = (e?: any) => {
    if (isRecording || isDisabled) return;

    if (e && e.type === "touchstart") e.preventDefault();

    // If the bot is currently speaking, stop it before starting to record
    if (isAgentSpeaking || isPlaying) {
      stopSpeaking();
    }

    startRecording();
  };

  const handleStop = (e?: any) => {
    if (e && e.type === "touchend") e.preventDefault();
    if (isRecording) {
      stopRecording();
    }
    // Clear the "Listening..." placeholder immediately on stop
    if (textInput === "Listening...") setTextInput("");
  };

  // Spacebar push-to-talk
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement === textareaRef.current) return;
      if (e.code === "Space" && !e.repeat && !isRecording && !isDisabled) {
        e.preventDefault();
        handleStart();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (document.activeElement === textareaRef.current) return;
      if (e.code === "Space" && isRecording) {
        e.preventDefault();
        handleStop();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isRecording, isDisabled, isAgentSpeaking, isPlaying]);

  // ESC to stop speaking / recording
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;

      if (isRecording) {
        handleStop();
      }

      if (isAgentSpeaking || isPlaying) {
        stopSpeaking();
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isRecording, isAgentSpeaking, isPlaying]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentSentenceIndex]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.role === "system" && last.content.startsWith("📄 Detected")) {
      setIsPdfProcessing(true);

      // hide after 6 seconds (background ingestion)
      setTimeout(() => setIsPdfProcessing(false), 6000);
    }
  }, [messages]);

  return (
    <div className="h-[100dvh] bg-background flex flex-col transition-colors duration-300 relative overflow-hidden">
      {/* Background Particles */}
      <BackgroundParticles
        audioStream={audioStream}
        accentColor={accentColor}
        isAgentSpeaking={isAgentSpeaking}
      />

      {/* Header */}
      <header className="flex-none border-b border-accent/20 backdrop-blur-md bg-background/80 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Voice Ontology eXpert - VOX
          </h1>
          <SettingsPanel
            voicePersona={voicePersona}
            onVoicePersonaChange={setVoicePersona}
            accentColor={accentColor}
            onAccentColorChange={setAccentColor}
            isDarkMode={isDarkMode}
            onThemeToggle={handleThemeToggle}
          />
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Knowledge Sidebar – on the left, max width by default, auto-refreshing */}
        <KnowledgeSidebar
          ref={sidebarRef}
          refreshKey={sidebarRefreshKey}
        />

        {/* Main Chat Area */}
        <main className="flex-1 overflow-y-auto scroll-smooth z-10">
          <div className="container mx-auto px-4 py-6 max-w-4xl">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center space-y-6">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-20"></div>
                  <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center shadow-[0_0_30px_hsl(var(--accent)/0.3)]">
                    <VoiceActivityIndicator isActive={false} className="h-10" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-2">Ready to Chat</h2>
                  <p className="text-muted-foreground">
                    Hold <b>Space</b> or the button to speak.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6 pb-4">
                {messages.map((message, index) => {
                  const isLastAgentMessage =
                    message.role === "agent" &&
                    index === messages.length - 1;

                  if (
                    isLastAgentMessage &&
                    (isPlaying ||
                      isProcessing ||
                      message.content === "Thinking...")
                  ) {
                    return (
                      <StreamingAgentResponse
                        key={message.id}
                        fullText={message.content}
                        isStreaming={isPlaying || isProcessing}
                      />
                    );
                  }

                  return (
                    <ChatMessage
                      key={message.id}
                      role={message.role}
                      content={message.content}
                    />
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="flex-none border-t border-accent/20 backdrop-blur-md bg-background/90 z-20">
        <div className="container mx-auto px-4 py-4 max-w-4xl space-y-4">
          <div className="flex justify-center min-h-[24px]">
            {isProcessing && !isAgentSpeaking && (
              <div className="flex items-center gap-2 text-primary animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-medium">Processing...</span>
              </div>
            )}

            {uploading && (
              <div
                className="fixed top-4 right-4 px-3 py-2 rounded-md bg-neutral-900 border border-[var(--accent)] 
                text-[var(--accent-foreground)] shadow-[0_0_10px_var(--accent-glow)] pointer-events-none z-[9999]"
              >
                <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
                Processing PDF…
              </div>
            )}

            {(isAgentSpeaking || isPlaying) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={stopSpeaking}
                className="flex items-center gap-2 text-accent hover:text-accent/80 hover:bg-accent/10"
              >
                <Square className="w-4 h-4 fill-current" />
                <span className="text-sm font-medium">Stop</span>
              </Button>
            )}
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div
                className={`relative group touch-none ${
                  isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                }`}
                onMouseDown={() => handleStart()}
                onMouseUp={() => handleStop()}
                onMouseLeave={() => handleStop()}
                onTouchStart={(e) => handleStart(e)}
                onTouchEnd={(e) => handleStop(e)}
                onContextMenu={(e) => e.preventDefault()}
              >
                {(isRecording || isAgentSpeaking) && (
                  <div className="absolute inset-0 -m-4 rounded-full opacity-50 overflow-hidden pointer-events-none">
                    <AudioReactiveParticles
                      isActive={isRecording || isAgentSpeaking}
                      audioStream={audioStream}
                    />
                  </div>
                )}
                <RecordButton
                  isRecording={isRecording}
                  onMouseDown={() => {}}
                  onMouseUp={() => {}}
                  onTouchStart={() => {}}
                  onTouchEnd={() => {}}
                />
              </div>
              <p className="text-xs text-muted-foreground font-medium hidden md:block">
                {isRecording ? "Release to Send" : "Hold Space to Speak"}
              </p>
            </div>

            <div className="flex-1 w-full flex gap-2 items-center">
              <div className="relative h-[50px] w-[50px] shrink-0">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />

                <Button
                  size="icon"
                  variant="outline"
                  className="h-[50px] w-[50px] text-accent border-accent/40 hover:bg-accent/10"
                >
                  <FileUp className="w-5 h-5" />
                </Button>
              </div>

              {/* TEXTAREA */}
              <Textarea
                ref={textareaRef}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type a message..."
                className="min-h-[50px] max-h-[120px] flex-1 resize-none border-accent/30 
                          focus:border-accent focus:ring-1 focus:ring-accent bg-background/50"
                disabled={isRecording}
              />

              {/* SEND BUTTON */}
              <Button
                onClick={handleSendText}
                disabled={!textInput.trim() || isProcessing || isRecording}
                size="icon"
                className="h-[50px] w-[50px] shrink-0 bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
