import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(express.json({ limit: "20kb" }));

// Enable CORS only for the local frontend origin.
// The Vite proxy is used for normal local development.
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

app.get("/", (_req, res) => {
  res.json({
    message: "CampusBot API is running!",
    endpoints: {
      health: "/api/health",
      chat: "POST /api/chat"
    },
    frontend: "http://localhost:5173"
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    aiConfigured: Boolean(ai),
    model,
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({
        error: "Gemini API is not configured on the server.",
      });
    }

    const { message, history = [] } = req.body ?? {};

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Please enter a message.",
      });
    }

    if (message.length > 4000) {
      return res.status(400).json({
        error: "Messages must be 4000 characters or fewer.",
      });
    }

    if (!Array.isArray(history) || history.length > 20) {
      return res.status(400).json({
        error: "Chat history is invalid or too long. Start a new chat.",
      });
    }

    const validHistory = history.every(
      (item) =>
        item &&
        ["user", "assistant"].includes(item.role) &&
        typeof item.text === "string" &&
        item.text.length <= 4000
    );

    if (!validHistory) {
      return res.status(400).json({
        error: "Invalid conversation history.",
      });
    }

    const contents = [
      ...history.map((item) => ({
        role: item.role === "assistant" ? "model" : "user",
        parts: [{ text: item.text }],
      })),
      {
        role: "user",
        parts: [{ text: message.trim() }],
      },
    ];

    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction:
          "You are CampusBot, a friendly and helpful website AI assistant. " +
          "Give clear, accurate, concise answers. If you are uncertain, say so. " +
          "Never claim to have performed an action you did not perform.",
        maxOutputTokens: 800,
      },
    });

    const reply = response.text?.trim();

    if (!reply) {
      return res.status(502).json({
        error: "The AI returned no text. Please try again.",
      });
    }

    return res.json({ reply });
  } catch (error) {
    console.error(
      "Gemini request failed:",
      error?.message || "Unknown error"
    );

    const status = error?.status;

    if (status === 429) {
      return res.status(429).json({
        error: "The AI request limit may have been reached. Please try later.",
      });
    }

    if (status === 401 || status === 403) {
      return res.status(502).json({
        error: "The AI API key or model access may be invalid.",
      });
    }

    return res.status(502).json({
      error: "The AI service is temporarily unavailable. Please try again.",
    });
  }
});

app.listen(port, () => {
  console.log(`CampusBot API running at http://localhost:${port}`);
});
