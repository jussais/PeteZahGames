import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Square,
  Image,
  X,
  RotateCcw,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  Pencil,
  ChevronDown,
  Monitor,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  imageBase64?: string;
  imageMime?: string;
}

interface HistoryEntry {
  role: "user" | "assistant";
  content: string;
  image?: { base64: string; mime: string };
}

const MODELS = [
  { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B (Fast)" },
  { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
];

const SUGGESTIONS = [
  "How do I learn to code efficiently?",
  "Tell me a funny joke!",
  "Give me a fun fact!",
  "How do I bake a potato?",
  "Give me a motivational quote.",
  "What's a fun hobby to try?",
  "What's a good book to read?",
];

const SYSTEM_PROMPT = `You are PeteAI, a helpful and friendly AI assistant developed by PeteZah. Keep responses concise and natural. When answering educational or factual questions, format your response as:
Answer: [direct answer]
[brief explanation if needed]
For casual conversation, just respond naturally and briefly. Never reference the conversation format or mention "previous messages". Just respond naturally as if in a real conversation.`;

function FluidCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const parent = canvas.parentElement;
      const w = parent ? parent.clientWidth : canvas.offsetWidth;
      const h = parent ? parent.clientHeight : canvas.offsetHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);
    const blobs = Array.from({ length: 6 }, (_, i) => ({
      x: Math.random() * (canvas.offsetWidth || 800),
      y: Math.random() * (canvas.offsetHeight || 600),
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      radius: 140 + Math.random() * 200,
      hue: 200 + i * 10,
      saturation: 60 + Math.random() * 25,
      lightness: 40 + Math.random() * 15,
      opacity: 0.15 + Math.random() * 0.12,
    }));
    let time = 0;
    const animate = () => {
      time += 0.003;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);
      blobs.forEach((b) => {
        b.x += b.vx + Math.sin(time + b.hue) * 0.15;
        b.y += b.vy + Math.cos(time * 0.7 + b.hue) * 0.15;
        if (b.x < -b.radius) b.x = w + b.radius;
        if (b.x > w + b.radius) b.x = -b.radius;
        if (b.y < -b.radius) b.y = h + b.radius;
        if (b.y > h + b.radius) b.y = -b.radius;
        const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius);
        grad.addColorStop(
          0,
          `hsla(${b.hue}, ${b.saturation}%, ${b.lightness}%, ${
            b.opacity * 2.2
          })`
        );
        grad.addColorStop(
          0.4,
          `hsla(${b.hue}, ${b.saturation}%, ${b.lightness}%, ${
            b.opacity * 1.1
          })`
        );
        grad.addColorStop(
          1,
          `hsla(${b.hue}, ${b.saturation}%, ${b.lightness}%, 0)`
        );
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      });
      for (let i = 0; i < 3; i++) {
        const wx = w * (0.2 + i * 0.3) + Math.sin(time * 0.5 + i) * 60;
        const wy = h * (0.3 + i * 0.2) + Math.cos(time * 0.4 + i * 2) * 40;
        const wg = ctx.createRadialGradient(wx, wy, 0, wx, wy, 120);
        wg.addColorStop(0, "hsla(210, 70%, 90%, 0.07)");
        wg.addColorStop(1, "hsla(210, 60%, 90%, 0)");
        ctx.fillStyle = wg;
        ctx.fillRect(0, 0, w, h);
      }
      animRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
    </div>
  );
}

function TypingDots() {
  return (
    <span
      style={{
        display: "inline-flex",
        gap: 3,
        alignItems: "center",
        marginLeft: 4,
      }}
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          style={{
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.3)",
            display: "inline-block",
          }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </span>
  );
}

function ScreenWidget({
  onSendToAI,
  onClose,
}: {
  onSendToAI: (base64: string, mime: string) => void;
  onClose: () => void;
}) {
  const [pos, setPos] = useState({
    x: window.innerWidth - 340,
    y: window.innerHeight - 320,
  });
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [hasStream, setHasStream] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 5 } as any,
      });
      streamRef.current = stream;
      setHasStream(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      stream.getVideoTracks()[0].addEventListener("ended", () => {
        streamRef.current = null;
        setHasStream(false);
        setScreenshot(null);
      });
    } catch {}
  };

  const capture = () => {
    if (!videoRef.current || !streamRef.current) return;
    setCapturing(true);
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    setScreenshot(canvas.toDataURL("image/png"));
    setCapturing(false);
  };

  const sendToAI = () => {
    if (!screenshot) return;
    onSendToAI(screenshot.split(",")[1], "image/png");
    setScreenshot(null);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setDragOffset({ x: e.clientX - pos.x, y: e.clientY - pos.y });
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) =>
      setPos({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, dragOffset]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 8 }}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: 300,
        zIndex: 9999,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.1)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        background: "rgba(8, 14, 28, 0.92)",
        boxShadow:
          "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
        userSelect: "none",
        overflow: "hidden",
      }}
    >
      <div
        onMouseDown={onMouseDown}
        style={{
          padding: "10px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "grab",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: hasStream ? "#4ade80" : "rgba(255,255,255,0.2)",
              boxShadow: hasStream ? "0 0 6px #4ade80" : "none",
            }}
          />
          <span
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.75)",
              fontWeight: 600,
              letterSpacing: "0.02em",
            }}
          >
            AI — Ask about your screen
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "rgba(255,255,255,0.35)",
            padding: 2,
            display: "flex",
          }}
        >
          <X size={12} />
        </button>
      </div>

      <div
        style={{
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <video
          ref={videoRef}
          muted
          style={{
            width: "100%",
            borderRadius: 10,
            display: hasStream ? "block" : "none",
            border: "1px solid rgba(255,255,255,0.07)",
            maxHeight: 150,
            objectFit: "cover",
            background: "#000",
          }}
        />

        {screenshot && (
          <div style={{ position: "relative" }}>
            <img
              src={screenshot}
              style={{
                width: "100%",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.08)",
                maxHeight: 150,
                objectFit: "cover",
                display: "block",
              }}
              alt="screenshot"
            />
            <button
              onClick={() => setScreenshot(null)}
              style={{
                position: "absolute",
                top: 6,
                right: 6,
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "rgba(0,0,0,0.6)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.7)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={10} />
            </button>
          </div>
        )}

        {!hasStream && !screenshot && (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <p
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.35)",
                marginBottom: 10,
              }}
            >
              Share your screen so AI can see it
            </p>
            <button
              onClick={startShare}
              style={{
                padding: "8px 18px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.8)",
                fontSize: 12,
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Share Screen
            </button>
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          {hasStream && !screenshot && (
            <button
              onClick={capture}
              disabled={capturing}
              style={{
                flex: 1,
                padding: "9px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.8)",
                fontSize: 11,
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              📸 Capture Frame
            </button>
          )}
          {screenshot && (
            <button
              onClick={sendToAI}
              style={{
                flex: 1,
                padding: "9px",
                borderRadius: 10,
                border: "1px solid rgba(100,160,255,0.35)",
                background: "rgba(80,140,255,0.15)",
                color: "rgba(160,200,255,1)",
                fontSize: 11,
                cursor: "pointer",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Send size={11} /> Send to AI
            </button>
          )}
        </div>

        {hasStream && (
          <p
            style={{
              fontSize: 10,
              color: "rgba(255,255,255,0.2)",
              textAlign: "center",
              margin: 0,
            }}
          >
            Keep this window open while browsing other tabs
          </p>
        )}
      </div>
    </motion.div>
  );
}

function MessageBubble({
  msg,
  onCopy,
  onRegen,
  onEdit,
  onThumbsUp,
  onThumbsDown,
}: {
  msg: Message;
  onCopy: (text: string) => void;
  onRegen: () => void;
  onEdit: (text: string) => void;
  onThumbsUp: () => void;
  onThumbsDown: () => void;
}) {
  const [liked, setLiked] = useState<"up" | "down" | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const handleSpeak = () => {
    if (!window.speechSynthesis) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const text = msg.content.replace(/<[^>]+>/g, "");
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  if (msg.id === "thinking") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          alignSelf: "flex-start",
          padding: "10px 15px",
          borderRadius: 20,
          fontSize: 13,
          color: "rgba(255,255,255,0.4)",
          display: "flex",
          alignItems: "center",
        }}
      >
        Thinking <TypingDots />
      </motion.div>
    );
  }

  if (msg.role === "user") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ alignSelf: "flex-end", maxWidth: "75%" }}
      >
        <div
          style={{
            padding: "10px 16px",
            borderRadius: 20,
            fontSize: 13,
            lineHeight: 1.6,
            background: "rgba(255,255,255,0.06)",
            color: "var(--foreground)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(8px)",
            wordBreak: "break-word",
          }}
        >
          {msg.imageBase64 && msg.imageMime && (
            <img
              src={`data:${msg.imageMime};base64,${msg.imageBase64}`}
              style={{
                maxHeight: 120,
                maxWidth: 200,
                borderRadius: 8,
                display: "block",
                marginBottom: 6,
              }}
              alt="attachment"
            />
          )}
          {msg.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        alignSelf: "flex-start",
        maxWidth: "80%",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <div
        style={{
          padding: "10px 16px",
          borderRadius: 20,
          fontSize: 13,
          lineHeight: 1.7,
          color: "var(--foreground)",
          wordBreak: "break-word",
        }}
        dangerouslySetInnerHTML={{ __html: msg.content }}
      />
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        style={{ display: "flex", gap: 1, paddingLeft: 10 }}
      >
        {[
          {
            icon: <Copy size={11} />,
            action: () => onCopy(msg.content.replace(/<[^>]+>/g, "")),
            title: "Copy",
          },
          {
            icon: speaking ? <Square size={11} /> : <Volume2 size={11} />,
            action: handleSpeak,
            title: speaking ? "Stop" : "Read aloud",
          },
          {
            icon: <RotateCcw size={11} />,
            action: onRegen,
            title: "Regenerate",
          },
          {
            icon: <Pencil size={11} />,
            action: () => onEdit(msg.content.replace(/<[^>]+>/g, "")),
            title: "Edit",
          },
          {
            icon: <ThumbsUp size={11} />,
            action: () => {
              setLiked("up");
              onThumbsUp();
            },
            title: "Like",
            active: liked === "up",
          },
          {
            icon: <ThumbsDown size={11} />,
            action: () => {
              setLiked("down");
              onThumbsDown();
            },
            title: "Dislike",
            active: liked === "down",
          },
        ].map((btn, i) => (
          <button
            key={i}
            onClick={btn.action}
            title={btn.title}
            className={`p-1.5 rounded-lg transition-colors ${
              (btn as any).active
                ? "text-foreground"
                : "text-foreground/25 hover:text-foreground/60"
            }`}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            {btn.icon}
          </button>
        ))}
      </motion.div>
    </motion.div>
  );
}

export default function AIPage({
  onNavigate,
}: {
  onNavigate: (url: string) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState(
    () => localStorage.getItem("selectedModel") || "llama-3.1-8b-instant"
  );
  const [modelOpen, setModelOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [pendingImage, setPendingImage] = useState<{
    base64: string;
    mime: string;
  } | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showScreenWidget, setShowScreenWidget] = useState(false);
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (chatBodyRef.current)
        chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }, 50);
  }, []);

  useEffect(() => {
    const welcome = "Hey! I'm PeteAI. What can I help you with?";
    setMessages([{ id: "welcome", role: "ai", content: welcome }]);
    setHistory([{ role: "assistant", content: welcome }]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const formatResponse = (text: string) => {
    let out = text.trim();
    out = out.replace(
      /```(\w+)?\n([\s\S]*?)```/g,
      (_: string, _lang: string, code: string) =>
        `<pre style="background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:12px 14px;overflow-x:auto;font-size:11px;margin:8px 0;font-family:'Courier New',monospace;color:rgba(255,255,255,0.85);white-space:pre-wrap;"><code>${code
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")}</code></pre>`
    );
    out = out.replace(
      /`([^`]+)`/g,
      "<code style=\"background:rgba(0,0,0,0.2);padding:1px 6px;border-radius:4px;font-size:0.88em;font-family:'Courier New',monospace;color:rgba(255,255,255,0.8);\">$1</code>"
    );
    out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/\*(.+?)\*/g, "<em>$1</em>");
    out = out.replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" style="color:var(--foreground);opacity:0.7;text-decoration:underline;text-underline-offset:2px;">$1</a>'
    );
    out = out.replace(/\n/g, "<br>");
    return out;
  };

  const sendMessage = useCallback(
    async (
      overrideText?: string,
      overrideImage?: { base64: string; mime: string } | null
    ) => {
      const text = (overrideText ?? input).trim();
      const img = overrideImage !== undefined ? overrideImage : pendingImage;
      if (!text && !img) return;
      if (isFetching) {
        abortRef.current?.abort();
        return;
      }

      setShowSuggestions(false);
      setPendingImage(null);

      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: text,
        imageBase64: img?.base64 ?? undefined,
        imageMime: img?.mime ?? undefined,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");

      const newHistory: HistoryEntry[] = [
        ...history,
        {
          role: "user",
          content: text,
          ...(img ? { image: { base64: img.base64, mime: img.mime } } : {}),
        },
      ];
      setHistory(newHistory);

      const groqMessages: { role: string; content: any }[] = [
        { role: "system", content: SYSTEM_PROMPT },
      ];

      for (const entry of newHistory) {
        if (entry.role === "user") {
          if (entry.image) {
            groqMessages.push({
              role: "user",
              content: [
                {
                  type: "text",
                  text: entry.content || "What's in this image?",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${entry.image.mime};base64,${entry.image.base64}`,
                  },
                },
              ],
            });
          } else {
            groqMessages.push({ role: "user", content: entry.content });
          }
        } else {
          groqMessages.push({ role: "assistant", content: entry.content });
        }
      }

      setMessages((prev) => [
        ...prev,
        { id: "thinking", role: "ai", content: "" },
      ]);
      setIsFetching(true);
      abortRef.current = new AbortController();

      try {
        const useVision = !!img;
        const selectedModel = useVision
          ? "meta-llama/llama-4-scout-17b-16e-instruct"
          : model;

        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: text || "What's in this image?",
            model: selectedModel,
            system: SYSTEM_PROMPT,
            groqMessages,
          }),
          signal: abortRef.current.signal,
        });
        const data = await res.json();
        let aiResponse = data?.response || "Sorry, I couldn't get a response.";

        if (text.toLowerCase().includes("source code"))
          aiResponse = "I'm sorry, I cannot reveal my source code.";
        else if (text.toLowerCase().includes("illegal"))
          aiResponse = "I can't help with anything illegal.";

        const formatted = formatResponse(aiResponse);
        setMessages((prev) =>
          prev
            .filter((m) => m.id !== "thinking")
            .concat({
              id: Date.now().toString(),
              role: "ai",
              content: formatted,
            })
        );
        setHistory((prev) =>
          [...prev, { role: "assistant" as const, content: aiResponse }].slice(
            -40
          )
        );
      } catch (err: any) {
        setMessages((prev) => prev.filter((m) => m.id !== "thinking"));
        if (err.name !== "AbortError") {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: "ai",
              content: "Couldn't reach PeteAI. Try again.",
            },
          ]);
        }
      } finally {
        setIsFetching(false);
        abortRef.current = null;
        inputRef.current?.focus();
      }
    },
    [input, pendingImage, isFetching, history, model]
  );

  const handleRegen = useCallback(() => {
    const lastUser = [...history].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    setHistory((prev) => prev.slice(0, -1));
    setMessages((prev) => prev.slice(0, -1));
    sendMessage(lastUser.content);
  }, [history, sendMessage]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPendingImage({ base64: result.split(",")[1], mime: file.type });
    };
    reader.readAsDataURL(file);
  };

  const canSend = (input.trim().length > 0 || !!pendingImage) && !isFetching;

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden">
      <FluidCanvas />

      <div
        className="flex-shrink-0 relative z-10 px-6 pt-4 pb-3 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="flex items-center gap-3">
          <img
            src="/storage/images/logo-png-removebg-preview.png"
            alt="PeteAI"
            className="w-7 h-7 object-contain opacity-80"
          />
          <div>
            <h1 className="text-sm font-bold text-foreground">PeteAI</h1>
            <p className="text-[10px] text-muted-foreground">Powered by Groq</p>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowScreenWidget(s => !s)}
            title="Screen capture"
            style={{
              background: "transparent", border: "none", cursor: "pointer", padding: 4, flexShrink: 0,
              color: showScreenWidget ? "rgba(150,200,255,0.9)" : "rgba(255,255,255,0.25)",
              transition: "color 0.2s", display: "flex", alignItems: "center",
            }}
          >
            <Monitor size={14} />
          </button>
          <AnimatePresence>
            {modelOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                className="absolute top-full right-0 mt-1.5 w-52 bg-card border border-border rounded-xl shadow-2xl py-1 z-50 overflow-hidden"
              >
                {MODELS.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => {
                      setModel(m.value);
                      localStorage.setItem("selectedModel", m.value);
                      setModelOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-[12px] hover:bg-accent transition-colors ${
                      model === m.value
                        ? "text-foreground"
                        : "text-foreground/50"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div
        ref={chatBodyRef}
        className="flex-1 overflow-y-auto relative z-10"
        style={{
          padding: "24px max(10%, 24px)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          scrollbarWidth: "none",
        }}
      >
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            onCopy={(text) => navigator.clipboard.writeText(text)}
            onRegen={handleRegen}
            onEdit={(text) => {
              setInput(text);
              inputRef.current?.focus();
            }}
            onThumbsUp={() => {}}
            onThumbsDown={() => {}}
          />
        ))}

        {showSuggestions && messages.length <= 1 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap gap-2 justify-center mt-auto pt-4"
          >
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="px-3 py-1.5 rounded-full text-[11px] text-foreground/50 hover:text-foreground transition-all"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "rgba(255,255,255,0.18)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "rgba(255,255,255,0.07)";
                }}
              >
                {s}
              </button>
            ))}
          </motion.div>
        )}
      </div>

      <div
        className="flex-shrink-0 relative z-10"
        style={{ padding: "0 max(10%, 24px) 20px" }}
      >
        <AnimatePresence>
          {pendingImage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center pb-2"
            >
              <div className="relative inline-block">
                <img
                  src={`data:${pendingImage.mime};base64,${pendingImage.base64}`}
                  className="max-h-16 rounded-lg border border-white/10"
                  alt="pending"
                />
                <button
                  onClick={() => setPendingImage(null)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive flex items-center justify-center border-none cursor-pointer"
                >
                  <X size={9} className="text-white" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          className="flex items-center gap-2 px-4 py-3 rounded-2xl transition-all"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(12px)",
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            title="Attach image"
            className="text-foreground/30 hover:text-foreground/70 transition-colors flex-shrink-0 p-1"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            <Image size={14} />
          </button>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="What would you like to talk about?"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-foreground/30 outline-none border-none"
          />
          <button
            onClick={() => setShowScreenWidget(s => !s)}
            title="Screen capture"
            style={{
              background: "transparent", border: "none", cursor: "pointer", padding: 4, flexShrink: 0,
              color: showScreenWidget ? "rgba(150,200,255,0.9)" : "rgba(255,255,255,0.25)",
              transition: "color 0.2s", display: "flex", alignItems: "center",
            }}
          >
            <Monitor size={14} />
          </button>
          <button
            onClick={() =>
              isFetching ? abortRef.current?.abort() : sendMessage()
            }
            disabled={!canSend && !isFetching}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-30"
            style={{
              background:
                canSend || isFetching
                  ? "rgba(255,255,255,0.15)"
                  : "rgba(255,255,255,0.06)",
              border: "none",
              cursor: canSend || isFetching ? "pointer" : "default",
            }}
          >
            {isFetching ? (
              <Square size={11} className="text-foreground" />
            ) : (
              <Send size={11} className="text-foreground" />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showScreenWidget && (
          <ScreenWidget
            onSendToAI={(base64, mime) => sendMessage("What do you see in this screenshot? Be concise.", { base64, mime })}
            onClose={() => setShowScreenWidget(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
