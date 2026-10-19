import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Plus,
  Send,
  Sparkles,
  UserRound,
  MessageCircle,
  Copy,
  Check,
  Mic,
  MicOff,
  Download,
  Trash2,
  Code2,
  Compass,
  Lightbulb,
  Zap,
  PanelLeftClose,
  PanelLeft,
  Terminal,
  CornerDownLeft,
} from "lucide-react";
import "./index.css";

export type PersonaKey = "general" | "code" | "creative" | "brief";

export type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
};

export type Session = {
  id: string;
  title: string;
  persona: PersonaKey;
  messages: Message[];
  updatedAt: number;
};

const PERSONAS: Record<
  PersonaKey,
  {
    name: string;
    tagline: string;
    badge: string;
    color: string;
    icon: typeof Bot;
    promptPlaceholder: string;
  }
> = {
  general: {
    name: "Campus Core",
    tagline: "Intelligent, balanced & versatile everyday copilot",
    badge: "GENERAL",
    color: "#7952ec",
    icon: Compass,
    promptPlaceholder: "Ask anything about campus, concepts, or projects...",
  },
  code: {
    name: "Code Architect",
    tagline: "Modular software design, algorithms & instant bug audits",
    badge: "DEV & LOGIC",
    color: "#06b6d4",
    icon: Code2,
    promptPlaceholder: "Paste a function, ask for code architecture, or debug...",
  },
  creative: {
    name: "Creative Muse",
    tagline: "Provocative ideation, storytelling & visionary copy",
    badge: "IMAGINATION",
    color: "#f43f5e",
    icon: Lightbulb,
    promptPlaceholder: "Brainstorm startup hooks, narratives, or creative concepts...",
  },
  brief: {
    name: "Executive Brief",
    tagline: "Bulletproof summaries, high-signal decisions & no fluff",
    badge: "EXECUTIVE",
    color: "#eab308",
    icon: Zap,
    promptPlaceholder: "Request an executive summary, pros & cons, or decision matrix...",
  },
};

const SUGGESTIONS: {
  persona: PersonaKey;
  category: string;
  title: string;
  prompt: string;
}[] = [
  {
    persona: "general",
    category: "ACADEMIC",
    title: "Quantum Computing Basics",
    prompt: "Explain Quantum Superposition in simple terms with a real-life analogy.",
  },
  {
    persona: "code",
    category: "ENGINEERING",
    title: "Vite + React API Architecture",
    prompt: "How should I structure full-stack React + Express code for maintainability?",
  },
  {
    persona: "creative",
    category: "IDEATION",
    title: "Campus Hackathon Theme",
    prompt: "Give me 5 unconventional hackathon themes combining AI and sustainability.",
  },
  {
    persona: "brief",
    category: "STRATEGY",
    title: "AI Deployment Playbook",
    prompt: "Provide a 4-bullet executive checklist for deploying LLMs to production safely.",
  },
];

const STORAGE_KEY = "campusbot_sessions_v2";

const makeId = () => crypto.randomUUID();

function createNewSession(persona: PersonaKey = "general"): Session {
  return {
    id: makeId(),
    title: "New Dialogue",
    persona,
    messages: [],
    updatedAt: Date.now(),
  };
}

// Inline Markdown & Code Block Formatter
function FormattedMessage({ text }: { text: string }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="formatted-body">
      {parts.map((part, index) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const lines = part.slice(3, -3).trim().split("\n");
          const firstLine = lines[0].trim();
          const hasLang = /^[a-zA-Z0-9_-]+$/.test(firstLine);
          const language = hasLang ? firstLine : "code";
          const codeContent = hasLang ? lines.slice(1).join("\n") : lines.join("\n");

          return (
            <div key={index} className="code-window">
              <div className="code-header">
                <div className="code-lang">
                  <Terminal size={14} />
                  <span>{language}</span>
                </div>
                <button
                  type="button"
                  className="code-copy-btn"
                  onClick={() => copyCode(codeContent, index)}
                  aria-label="Copy code block"
                >
                  {copiedIndex === index ? (
                    <>
                      <Check size={13} className="check-icon" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy size={13} /> Copy code
                    </>
                  )}
                </button>
              </div>
              <pre className="code-content">
                <code>{codeContent}</code>
              </pre>
            </div>
          );
        }

        // Standard text: render line breaks, boldings, bullet lists
        return (
          <div key={index} className="prose-segment">
            {part.split("\n\n").map((paragraph, pIdx) => {
              const lines = paragraph.split("\n");
              const isList = lines.every((line) => line.trim().startsWith("- ") || line.trim().startsWith("* "));

              if (isList) {
                return (
                  <ul key={pIdx} className="prose-list">
                    {lines.map((l, lIdx) => {
                      const itemText = l.trim().replace(/^[-*]\s+/, "");
                      return <li key={lIdx}>{renderInline(itemText)}</li>;
                    })}
                  </ul>
                );
              }

              if (paragraph.startsWith("### ")) {
                return (
                  <h3 key={pIdx} className="prose-h3">
                    {renderInline(paragraph.replace(/^###\s+/, ""))}
                  </h3>
                );
              }

              return (
                <p key={pIdx} className="prose-paragraph">
                  {lines.map((line, lIdx) => (
                    <span key={lIdx}>
                      {renderInline(line)}
                      {lIdx < lines.length - 1 && <br />}
                    </span>
                  ))}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function renderInline(text: string) {
  // Bold **word**
  const boldParts = text.split(/(\*\*.*?\*\*)/g);
  return boldParts.map((bPart, bIdx) => {
    if (bPart.startsWith("**") && bPart.endsWith("**")) {
      return (
        <strong key={bIdx} className="prose-bold">
          {bPart.slice(2, -2)}
        </strong>
      );
    }
    // Inline code `code`
    const codeParts = bPart.split(/(`.*?`)/g);
    return codeParts.map((cPart, cIdx) => {
      if (cPart.startsWith("`") && cPart.endsWith("`")) {
        return (
          <code key={`${bIdx}-${cIdx}`} className="prose-inline-code">
            {cPart.slice(1, -1)}
          </code>
        );
      }
      return cPart;
    });
  });
}

export default function App() {
  const [sessions, setSessions] = useState<Session[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return [createNewSession()];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(
    () => sessions[0]?.id || ""
  );

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Active session
  const currentSession =
    sessions.find((s) => s.id === activeSessionId) || sessions[0] || createNewSession();

  // Save sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.error("Failed to persist sessions", e);
    }
  }, [sessions]);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSession.messages, loading]);

  // Adjust textarea height dynamically
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  const handleStartNewChat = (persona: PersonaKey = currentSession.persona) => {
    const newSession = createNewSession(persona);
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setInput("");
    setError("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length <= 1) {
      const fresh = createNewSession();
      setSessions([fresh]);
      setActiveSessionId(fresh.id);
      return;
    }
    const filtered = sessions.filter((s) => s.id !== id);
    setSessions(filtered);
    if (activeSessionId === id) {
      setActiveSessionId(filtered[0].id);
    }
  };

  const setPersona = (persona: PersonaKey) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === currentSession.id ? { ...s, persona, updatedAt: Date.now() } : s
      )
    );
  };

  const sendMessage = async (overrideValue?: string) => {
    const textToSend = (overrideValue ?? input).trim();
    if (!textToSend || loading) return;

    const userMessage: Message = {
      id: makeId(),
      role: "user",
      text: textToSend,
      timestamp: Date.now(),
    };

    const nextMessages = [...currentSession.messages, userMessage];

    // Auto title from first message
    const updatedTitle =
      currentSession.messages.length === 0
        ? textToSend.slice(0, 36) + (textToSend.length > 36 ? "..." : "")
        : currentSession.title;

    setSessions((prev) =>
      prev.map((s) =>
        s.id === currentSession.id
          ? {
              ...s,
              title: updatedTitle,
              messages: nextMessages,
              updatedAt: Date.now(),
            }
          : s
      )
    );

    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          persona: currentSession.persona,
          history: currentSession.messages.map(({ role, text }) => ({
            role,
            text,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to retrieve response from AI.");
      }

      if (typeof data.reply !== "string" || !data.reply.trim()) {
        throw new Error("The AI returned an empty response.");
      }

      const botMessage: Message = {
        id: makeId(),
        role: "assistant",
        text: data.reply,
        timestamp: Date.now(),
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSession.id
            ? {
                ...s,
                messages: [...nextMessages, botMessage],
                updatedAt: Date.now(),
              }
            : s
        )
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Service connection interrupted."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleExport = () => {
    if (currentSession.messages.length === 0) return;
    const personaInfo = PERSONAS[currentSession.persona];
    let content = `# CampusBot Dialogue: ${currentSession.title}\n`;
    content += `*Mode: ${personaInfo.name} | Exported: ${new Date().toLocaleString()}*\n\n---\n\n`;

    currentSession.messages.forEach((m) => {
      const roleName = m.role === "assistant" ? "CampusBot" : "User";
      content += `### ${roleName} (${new Date(m.timestamp).toLocaleTimeString()})\n\n${m.text}\n\n`;
    });

    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${currentSession.title.replace(/[^a-zA-Z0-9_-]/g, "_")}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Web Speech API Voice Dictation
  const toggleSpeechRecognition = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  const activePersonaData = PERSONAS[currentSession.persona];

  return (
    <div className={`atelier-layout ${isSidebarOpen ? "sidebar-visible" : "sidebar-collapsed"}`}>
      {/* Background Ambient Mesh Light */}
      <div className="ambient-mesh" aria-hidden="true">
        <div className="aura-glow aura-top" />
        <div className="aura-glow aura-bottom" />
      </div>

      {/* Side Navigation Atelier */}
      <aside className="atelier-sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo-glow">
            <Bot size={22} />
          </div>
          <div className="brand-copy">
            <span className="brand-title">CAMPUSBOT</span>
            <span className="brand-subtitle">AI INTELLIGENCE STUDIO</span>
          </div>
        </div>

        <button
          type="button"
          className="btn-create-session"
          onClick={() => handleStartNewChat()}
        >
          <Plus size={16} />
          <span>New Dialogue</span>
          <span className="key-hint">⌘N</span>
        </button>

        <div className="sidebar-section-label">
          <MessageCircle size={13} />
          <span>PAST SESSIONS ({sessions.length})</span>
        </div>

        <div className="session-history-list">
          {sessions.map((sess) => {
            const isActive = sess.id === currentSession.id;
            const pInfo = PERSONAS[sess.persona];
            return (
              <div
                key={sess.id}
                role="button"
                tabIndex={0}
                className={`session-item ${isActive ? "active" : ""}`}
                onClick={() => {
                  setActiveSessionId(sess.id);
                  setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setActiveSessionId(sess.id);
                  }
                }}
              >
                <div className="session-indicator-dot" style={{ background: pInfo.color }} />
                <div className="session-item-body">
                  <span className="session-title">{sess.title}</span>
                  <span className="session-meta">
                    {sess.messages.length} messages • {pInfo.badge}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-delete-session"
                  title="Delete dialogue"
                  onClick={(e) => handleDeleteSession(sess.id, e)}
                  aria-label="Delete dialogue"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="sidebar-footer">
          <div className="system-status-indicator">
            <span className="status-pulse-ring" />
            <span className="status-label">Engine Online • Gemini 3.8</span>
          </div>
        </div>
      </aside>

      {/* Primary Stage Canvas */}
      <main className="atelier-canvas">
        {/* Top Floating Control Bar */}
        <header className="atelier-header">
          <div className="header-left">
            <button
              type="button"
              className="btn-toggle-sidebar"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              aria-label="Toggle navigation drawer"
              title="Toggle Drawer"
            >
              {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
            </button>

            {/* Persona Switcher Tabs */}
            <div className="persona-nav" role="tablist" aria-label="AI Mode Selector">
              {(Object.keys(PERSONAS) as PersonaKey[]).map((key) => {
                const item = PERSONAS[key];
                const IconComponent = item.icon;
                const isSelected = currentSession.persona === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    className={`persona-pill ${isSelected ? "selected" : ""}`}
                    onClick={() => setPersona(key)}
                  >
                    <IconComponent size={14} style={{ color: isSelected ? item.color : undefined }} />
                    <span className="persona-name">{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="header-right">
            {currentSession.messages.length > 0 && (
              <button
                type="button"
                className="btn-action-ghost"
                onClick={handleExport}
                title="Download conversation markdown"
              >
                <Download size={15} />
                <span>Export .md</span>
              </button>
            )}

            <div className="orb-status-chip">
              <span className={`micro-orb ${loading ? "busy" : "ready"}`} />
              <span className="orb-mode-text">{activePersonaData.name}</span>
            </div>
          </div>
        </header>

        {/* Conversation Stream Container */}
        <div className={`dialogue-container ${currentSession.messages.length === 0 ? "is-empty" : ""}`}>
          {currentSession.messages.length === 0 ? (
            <div className="atelier-hero-welcome">
              {/* Dynamic Kinetic Core Orb */}
              <div className={`kinetic-core ${loading ? "core-active" : ""}`}>
                <div className="core-glow-layer" />
                <div className="core-rings" />
                <div className="core-icon-center">
                  <Sparkles size={22} />
                </div>
              </div>

              <div className="hero-typography">
                <span className="hero-eyebrow">NEO-COGNITIVE ASSISTANT</span>
                <h1 className="hero-headline">
                  Ideas ignite in <span className="highlight-gradient">Dialogue</span>.
                </h1>
                <p className="hero-description">{activePersonaData.tagline}</p>
              </div>

              {/* Bento Suggestions Grid */}
              <div className="bento-curations">
                {SUGGESTIONS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="bento-tile"
                    onClick={() => {
                      setPersona(item.persona);
                      void sendMessage(item.prompt);
                    }}
                    disabled={loading}
                  >
                    <div className="bento-top">
                      <span className="bento-category">{item.category}</span>
                      <CornerDownLeft size={13} className="bento-arrow" />
                    </div>
                    <div className="bento-title">{item.title}</div>
                    <div className="bento-snippet">{item.prompt}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="message-stream">
              {currentSession.messages.map((msg) => {
                const isAssistant = msg.role === "assistant";
                return (
                  <article
                    key={msg.id}
                    className={`stream-row ${isAssistant ? "row-assistant" : "row-user"}`}
                  >
                    <div className="avatar-capsule">
                      {isAssistant ? (
                        <div className="bot-avatar-inner">
                          <Bot size={17} />
                        </div>
                      ) : (
                        <div className="user-avatar-inner">
                          <UserRound size={17} />
                        </div>
                      )}
                    </div>

                    <div className="bubble-wrapper">
                      <div className="bubble-meta">
                        <span className="bubble-author">
                          {isAssistant ? `CampusBot • ${activePersonaData.badge}` : "You"}
                        </span>
                        <span className="bubble-time">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div className="bubble-content">
                        {isAssistant ? (
                          <FormattedMessage text={msg.text} />
                        ) : (
                          <p className="user-text">{msg.text}</p>
                        )}
                      </div>

                      {isAssistant && (
                        <div className="bubble-toolbar">
                          <button
                            type="button"
                            className="btn-toolbar-action"
                            onClick={() => handleCopyMessage(msg.id, msg.text)}
                            title="Copy response"
                          >
                            {copiedMsgId === msg.id ? (
                              <>
                                <Check size={12} className="check-icon" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy size={12} /> Copy
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}

              {loading && (
                <article className="stream-row row-assistant loading-row">
                  <div className="avatar-capsule">
                    <div className="bot-avatar-inner pulse-generating">
                      <Bot size={17} />
                    </div>
                  </div>
                  <div className="bubble-wrapper">
                    <div className="bubble-meta">
                      <span className="bubble-author">CampusBot • Thinking</span>
                    </div>
                    <div className="generating-loader">
                      <div className="quantum-dot" />
                      <div className="quantum-dot" />
                      <div className="quantum-dot" />
                      <span className="quantum-text">Synthesizing intelligence...</span>
                    </div>
                  </div>
                </article>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="floating-error-banner" role="alert">
            <span className="error-text">{error}</span>
            <button
              type="button"
              className="error-dismiss-btn"
              onClick={() => setError("")}
              aria-label="Dismiss notice"
            >
              ×
            </button>
          </div>
        )}

        {/* Floating Atelier Command Dock */}
        <div className="atelier-composer-dock">
          <form
            className="composer-glass-box"
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage();
            }}
          >
            <div className="composer-input-row">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder={activePersonaData.promptPlaceholder}
                rows={1}
                maxLength={4000}
                disabled={loading}
                aria-label="Message input"
              />

              <div className="composer-actions">
                <button
                  type="button"
                  className={`btn-voice-dictate ${isListening ? "listening" : ""}`}
                  onClick={toggleSpeechRecognition}
                  title={isListening ? "Listening... (click to stop)" : "Dictate with voice"}
                  aria-label="Dictate voice"
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>

                <button
                  type="submit"
                  className="btn-send-dock"
                  disabled={loading || !input.trim()}
                  aria-label="Send query"
                  title="Send (Enter)"
                >
                  <Send size={15} />
                </button>
              </div>
            </div>

            <div className="composer-footnote">
              <div className="composer-badges">
                <span className="mono-pill">
                  <span className="pill-dot" style={{ background: activePersonaData.color }} />
                  {activePersonaData.name}
                </span>
                {isListening && <span className="listening-pulse-tag">🎙️ Listening...</span>}
              </div>

              <div className="composer-guide">
                <span className="char-count">{input.length} / 4000</span>
                <span className="key-shortcut">
                  <kbd>Enter</kbd> to send • <kbd>Shift + Enter</kbd> newline
                </span>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
