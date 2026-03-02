import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

  const db = new Database("easyoffer.db");

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS resumes (
    id TEXT PRIMARY KEY,
    user_email TEXT,
    data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Resume Persistence
  app.post("/api/resumes", (req, res) => {
    const { id, user_email, data } = req.body;
    const stmt = db.prepare("INSERT OR REPLACE INTO resumes (id, user_email, data) VALUES (?, ?, ?)");
    stmt.run(id, user_email, JSON.stringify(data));
    res.json({ success: true });
  });

  app.get("/api/resumes/:email", (req, res) => {
    const stmt = db.prepare("SELECT * FROM resumes WHERE user_email = ? ORDER BY created_at DESC");
    const rows = stmt.all(req.params.email);
    res.json(rows.map(r => ({ ...r, data: JSON.parse(r.data as string) })));
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
