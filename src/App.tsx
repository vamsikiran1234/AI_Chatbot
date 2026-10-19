
import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Plus,
  Send,
  Sparkles,
  UserRound,
  MessageCircle,
} from "lucide-react";
import "./index.css";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

const suggestions = [
  "What can an AI chatbot do?",
  "How can I add AI to my website?",
  "Explain React in simple words",
  "Give me ideas for a small business",
];

const makeId = () => crypto.randomUUID();

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(value = input) {
    const text = value.trim();

    if (!text || loading) return;

    const userMessage: Message = {
      id: makeId(),
      role: "user",
      text,
    };

    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages.map(({ role, text }) => ({
            role,
            text,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to get a response.");
      }

      if (typeof data.reply !== "string" || !data.reply.trim()) {
        throw new Error("The AI returned an empty response.");
      }

      setMessages([
        ...nextMessages,
        {
          id: makeId(),
          role: "assistant",
          text: data.reply,
        },
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function startNewChat() {
    setMessages([]);
    setInput("");
    setError("");
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon"><Bot size={24} /></span>
          <span>CampusBot</span>
        </div>

        <button className="new-chat" onClick={startNewChat}>
          <Plus size={18} /> New conversation
        </button>

        <div className="sidebar-note">
          <MessageCircle size={18} />
          <span>Your AI workspace</span>
        </div>

        <div className="sidebar-bottom">
          <span className="status-dot" />
          AI assistant demo
        </div>
      </aside>

      <section className="chat-area">
        <header className="topbar">
          <div>
            <span className="eyebrow">YOUR PERSONAL AI ASSISTANT</span>
            <h1>How can I help you today?</h1>
          </div>
          <div className="online-pill">
            <span className="status-dot" /> Ready to chat
          </div>
        </header>

        <div className="conversation">
          {messages.length === 0 ? (
            <div className="welcome">
              <div className="welcome-icon">
                <Sparkles size={30} />
              </div>
              <h2>Ideas start with a conversation.</h2>
              <p>
                Ask a question, explore an idea, or get help with your next
                project.
              </p>

              <div className="suggestions">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => sendMessage(suggestion)}
                    disabled={loading}
                  >
                    <Sparkles size={15} />
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="message-list">
              {messages.map((message) => (
                <article
                  className={`message-row ${message.role}`}
                  key={message.id}
                >
                  <div className="avatar">
                    {message.role === "assistant" ? (
                      <Bot size={19} />
                    ) : (
                      <UserRound size={19} />
                    )}
                  </div>
                  <div className="message-content">
                    <span className="message-label">
                      {message.role === "assistant" ? "AI Assistant" : "You"}
                    </span>
                    <div className="message-bubble">{message.text}</div>
                  </div>
                </article>
              ))}

              {loading && (
                <article className="message-row assistant">
                  <div className="avatar"><Bot size={19} /></div>
                  <div className="message-content">
                    <span className="message-label">AI Assistant</span>
                    <div className="message-bubble typing">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </article>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {error && (
          <div className="error-banner" role="alert">
            {error}
            <button onClick={() => setError("")} aria-label="Dismiss error">
              ×
            </button>
          </div>
        )}

        <form
          className="composer"
          onSubmit={(event) => {
            event.preventDefault();
            void sendMessage();
          }}
        >
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                void sendMessage();
              }
            }}
            placeholder="Message CampusBot..."
            aria-label="Write your message"
            rows={1}
            maxLength={4000}
            disabled={loading}
          />
          <button
            className="send-button"
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
        </form>

        <p className="disclaimer">
          AI can make mistakes. Verify important information.
        </p>
      </section>
    </main>
  );
}

export default App;
