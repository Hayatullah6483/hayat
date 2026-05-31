import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Enable JSON bodies with limit for base64 file payloads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Path for server-side persistence
const DB_DIR = path.join(process.cwd(), "db");
const DB_FILE = path.join(DB_DIR, "state.json");

// Ensure db directory and file exist
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// In-memory cache synced with state.json
interface DBState {
  users: any[];
  conversations: any[];
}

let dbState: DBState = { users: [], conversations: [] };

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      dbState = JSON.parse(data);
    } else {
      saveDB();
    }
  } catch (err) {
    console.error("Error loading DB state, resetting:", err);
    dbState = { users: [], conversations: [] };
  }
}

function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving DB state:", err);
  }
}

// Initialize database
loadDB();

// Lazy initialize Google GenAI SDK
let aiClient: GoogleGenAI | null = null;
function getGeminiAI(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "MY_GEMINI_API_KEY" || key === "") {
    console.warn("GEMINI_API_KEY is not configured or placeholder. System will run in warning response/fallback mode.");
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Simple standard authentication helper (using a header for mock session/token)
// In production, we find users matching header "Authorization". In dev, we can fallback to first user or header.
function getAuthenticatedUser(req: express.Request): any | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const userId = authHeader.replace("Bearer ", "").trim();
  const user = dbState.users.find(u => u.id === userId);
  return user || null;
}

// --- API Endpoints ---

// Check server status
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString(), hasApiKey: !!process.env.GEMINI_API_KEY });
});

// Authentication: Sign Up
app.post("/api/auth/signup", (req, res) => {
  const { fullName, email, password, preferences } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const existing = dbState.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: "Email address is already registered" });
  }

  const defaultPreferences = {
    languages: ["English"],
    professions: ["Computer Science & Programming"],
    theme: "dark",
    responseStyle: "balanced",
    voiceResponses: false,
    notificationsEnabled: true,
    privacyMode: false,
    ...preferences
  };

  const newUser = {
    id: "user_" + Math.random().toString(36).substring(2, 11),
    fullName,
    email: email.toLowerCase(),
    password, // Storing password straight for simplicity in this fullstack showcase
    preferences: defaultPreferences,
    createdAt: new Date().toISOString()
  };

  dbState.users.push(newUser);
  saveDB();

  res.status(201).json({
    user: {
      id: newUser.id,
      fullName: newUser.fullName,
      email: newUser.email,
      preferences: newUser.preferences,
      createdAt: newUser.createdAt
    }
  });
});

// Authentication: Login
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = dbState.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  res.json({
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      preferences: user.preferences,
      createdAt: user.createdAt
    }
  });
});

// Get/Sync current authenticated user data
app.get("/api/auth/me", (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.json({
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      preferences: user.preferences,
      createdAt: user.createdAt
    }
  });
});

// Update user preferences
app.put("/api/auth/preferences", (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  user.preferences = {
    ...user.preferences,
    ...req.body
  };
  saveDB();

  res.json({ preferences: user.preferences });
});

// --- Conversation Endpoints ---

// Get all conversations for active user
app.get("/api/conversations", (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userConvs = dbState.conversations
    .filter(c => c.userId === user.id)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  res.json({ conversations: userConvs });
});

// Create new conversation
app.post("/api/conversations", (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { title, profession, language } = req.body;

  const newConv = {
    id: "conv_" + Math.random().toString(36).substring(2, 11),
    title: title || "New Dialogue",
    userId: user.id,
    pinned: false,
    messages: [],
    profession: profession || (user.preferences.professions[0] || "General"),
    language: language || (user.preferences.languages[0] || "English"),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  dbState.conversations.push(newConv);
  saveDB();

  res.status(201).json({ conversation: newConv });
});

// Update conversation details (e.g. rename, pin status)
app.put("/api/conversations/:id", (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const conv = dbState.conversations.find(c => c.id === req.params.id && c.userId === user.id);
  if (!conv) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  const { title, pinned, profession, language } = req.body;

  if (title !== undefined) conv.title = title;
  if (pinned !== undefined) conv.pinned = pinned;
  if (profession !== undefined) conv.profession = profession;
  if (language !== undefined) conv.language = language;

  conv.updatedAt = new Date().toISOString();
  saveDB();

  res.json({ conversation: conv });
});

// Delete conversation
app.delete("/api/conversations/:id", (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const convIndex = dbState.conversations.findIndex(c => c.id === req.params.id && c.userId === user.id);
  if (convIndex === -1) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  dbState.conversations.splice(convIndex, 1);
  saveDB();

  res.json({ success: true, message: "Dialogue deleted successfully" });
});

// Send message to conversation and get AI response
app.post("/api/conversations/:id/messages", async (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const conv = dbState.conversations.find(c => c.id === req.params.id && c.userId === user.id);
  if (!conv) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  const { content, files } = req.body;
  if (!content && (!files || files.length === 0)) {
    return res.status(400).json({ error: "Message content or files required" });
  }

  // Create and append User Message
  const userMessage = {
    id: "msg_" + Math.random().toString(36).substring(2, 11),
    role: "user" as const,
    content,
    timestamp: new Date().toISOString(),
    files: files || []
  };

  conv.messages.push(userMessage);
  conv.updatedAt = new Date().toISOString();

  // If title was "New Dialogue", rename it dynamically based on the first query
  if (conv.title === "New Dialogue" || conv.title === "New Chat") {
    conv.title = content.substring(0, 32) + (content.length > 32 ? "..." : "");
  }

  saveDB();

  // Handle Gemini response generation
  const activeProfession = conv.profession || user.preferences.professions[0] || "General";
  const activeLanguage = conv.language || user.preferences.languages[0] || "English";
  const responseStyle = user.preferences.responseStyle || "balanced";

  // Build the dynamic instruction to tailor replies to the field and language
  const instructionPrompt = `
You are "Hayat AI", a personalized intellectual assistant and professional companion.
Tagline: "Your Personalized AI Assistant for Every Field."

The user is engaging with you under specific contexts. You MUST adapt:
1. Target Professional Context: ${activeProfession}.
   - Use language, technical detail, examples, and terminology relevant to an expert or learner in ${activeProfession}.
   - If Healthcare/Medical: Ensure medical precision, emphasize accurate healthcare principles, and format appropriately.
   - If Programming/Computer Science: Write clean, perfectly commented code snippets, explain algorithms clearly, and output production-ready code.
   - If Business/Finance: Use relevant financial models, corporate jargon, and focus on strategy or economics.
   - If Engineering: Ground explanations in technical, scientific, or mathematical frameworks.
   - If Design: Accent creative approaches, visual spacing, color schemes, or user experience.
   
2. Preferred Response Language: ${activeLanguage}.
   - You MUST write the complete response in ${activeLanguage}.
   - If the language is Urdu, write beautiful, readable text using Urdu script/characters.
   - If Pashto, write in Pashto.
   - If Turkish, write in Turkish, etc.
   - Align the grammatical tone properly to ${activeLanguage}.

3. Response Style Selection: ${responseStyle}.
   - "concise": keep responses brief, summary-oriented, direct, and under 3-4 bullet points.
   - "detailed": offer in-depth analyses, thorough walk-throughs, complete diagrams/code, and architectural notes.
   - "balanced": average paragraphs containing exact instructions with simple clear conclusions.
   - "creative": leverage metaphorical explanations, expansive suggestions, and engaging prompts.
   - "academic": present concepts using critical methodology, structured hypotheses, and logical rigor.

Formulate your response as fully rendered, beautiful GitHub-flavored markdown. Do not include meta comments or reference these context rules directly to the user. Maintain your professional assistant persona.
  `;

  // Collect previous messages for conversation history (limit to last 12 messages to fit context limits)
  const conversationHistory = conv.messages.slice(-12, -1).map((msg: any) => {
    return {
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }]
    };
  });

  // Prepare input contents
  const inputParts: any[] = [];
  
  // Set content prompt
  inputParts.push({ text: content || "Review these attachments:" });

  // Convert uploaded image files to inlineData parts for multimodal support
  if (files && files.length > 0) {
    for (const f of files) {
      if (f.dataUrl && f.dataUrl.includes(";base64,")) {
        const parts = f.dataUrl.split(";base64,");
        const mimeType = parts[0].split(":")[1] || f.type;
        const data = parts[1];
        
        // Ensure we only feed mime-types Gemini expects (images, PDFs)
        if (mimeType.startsWith("image/") || mimeType === "application/pdf") {
          inputParts.push({
            inlineData: {
              mimeType,
              data
            }
          });
        }
      }
    }
  }

  conversationHistory.push({
    role: "user",
    parts: inputParts
  });

  const aiClientInstance = getGeminiAI();

  let aiResponseText = "";

  if (aiClientInstance) {
    try {
      // Call Gemini 3.5 Flash server-side
      const response = await aiClientInstance.models.generateContent({
        model: "gemini-3.5-flash",
        contents: conversationHistory as any,
        config: {
          systemInstruction: instructionPrompt,
          temperature: responseStyle === "creative" ? 0.95 : responseStyle === "academic" ? 0.3 : 0.7,
        },
      });

      aiResponseText = response.text || "I was unable to synthesize a clean response. Please try sending your message again.";
    } catch (err: any) {
      console.error("Gemini API server-side call failed:", err);
      aiResponseText = `⚠️ **Gemini API Error:** ${err.message || "An unexpected issue occurred on the network server."}\n\n*If you are previewing this workspace, ensure your **GEMINI_API_KEY** secret has been properly defined in Settings > Secrets.*`;
    }
  } else {
    // Elegant fallback mode for early stage deployment / empty keys
    aiResponseText = `👋 **Welcome to Hayat AI (Demo Mode)**

This app requires a **GEMINI_API_KEY** secret to power advanced conversational adaptivity. Currently running in elegant simulation.

### Context Configuration Set:
* **Custom Field Context**: ${activeProfession}
* **Active Output Language**: ${activeLanguage}
* **Response Style**: ${responseStyle}

### Tailored Response Sample:
*Here is a simulated, high-quality professional advice tailored to your selected field:*

As an expert operating in **${activeProfession}**, addressing any general request requires integrating core principles of structure, clarity, and localized language preferences. Under the **${activeLanguage}** dialect guideline:

> "Success in ${activeProfession} requires continuous inquiry, modular execution patterns, and clear feedback loops."

*To unlock authentic human-like conversational intelligence, please add a valid **GEMINI_API_KEY** under your **Settings (Click the gear) > Secrets** menu.*`;
  }

  // Create and append AI Response Message
  const modelMessage = {
    id: "msg_" + Math.random().toString(36).substring(2, 11),
    role: "model" as const,
    content: aiResponseText,
    timestamp: new Date().toISOString(),
    isVoice: false
  };

  conv.messages.push(modelMessage);
  conv.updatedAt = new Date().toISOString();
  saveDB();

  res.json({ userMessage, modelMessage, conversation: conv });
});

// Start active development server & wire up Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Hayat AI Server] running on http://localhost:${PORT} under environment: ${process.env.NODE_ENV || "development"}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start fullstack server:", err);
});
