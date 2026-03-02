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

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  // AI Optimization Endpoint
  app.post("/api/ai/optimize", async (req, res) => {
    const { text, style = "professional" } = req.body;
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `使用 STAR（情境、任务、行动、结果）法则重写以下简历描述。
        使其专业、注重影响力，并使用强有力的动词。
        风格：${style}
        输入： "${text}"`,
        config: {
          systemInstruction: "你是一位世界级的职业教练和简历专家。你的目标是将模糊的描述转化为高影响力的、数据驱动的 STAR 简历要点。请务必使用中文回复。",
        }
      });

      res.json({ optimized: response.text });
    } catch (error) {
      console.error("AI Error:", error);
      res.status(500).json({ error: "Failed to optimize text" });
    }
  });

  // JD Matching Endpoint
  app.post("/api/ai/match-jd", async (req, res) => {
    const { resumeText, jdText } = req.body;
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `根据以下职位描述（JD）分析此简历。
        1. 识别缺失的关键技能/关键词。
        2. 提出 3 条具体的改进建议，使简历更好地匹配 JD。
        3. 给出 ATS 兼容性评分（0-100）。
        请务必使用中文回复。
        
        简历内容: ${resumeText}
        职位描述 (JD): ${jdText}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "缺失的关键技能或关键词" },
              suggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "改进建议" },
              atsScore: { type: Type.NUMBER, description: "ATS 匹配分数" }
            },
            required: ["missingKeywords", "suggestions", "atsScore"]
          }
        }
      });

      res.json(JSON.parse(response.text || "{}"));
    } catch (error) {
      console.error("AI Error:", error);
      res.status(500).json({ error: "Failed to match JD" });
    }
  });

  // Interview Prep Endpoint
  app.post("/api/ai/interview-prep", async (req, res) => {
    const { resumeData } = req.body;
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `根据这份简历，生成 5 个可能的面试问题以及高质量的参考回答。请务必使用中文回复。
        简历数据: ${JSON.stringify(resumeData)}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING, description: "面试问题" },
                answer: { type: Type.STRING, description: "参考回答" }
              },
              required: ["question", "answer"]
            }
          }
        }
      });

      res.json(JSON.parse(response.text || "[]"));
    } catch (error) {
      console.error("AI Error:", error);
      res.status(500).json({ error: "Failed to generate interview prep" });
    }
  });

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

  // Unstructured Text Parsing Endpoint
  app.post("/api/ai/parse-unstructured", async (req, res) => {
    const { text } = req.body;
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `将以下关于个人经历的非结构化文本解析并提取为结构化的简历数据。
        文本可能包含个人信息、工作经历、教育背景、技能和项目。
        请尽可能详细地提取信息，并使用专业术语进行润色。
        
        输入文本: "${text}"`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              personalInfo: {
                type: Type.OBJECT,
                properties: {
                  fullName: { type: Type.STRING },
                  email: { type: Type.STRING },
                  phone: { type: Type.STRING },
                  location: { type: Type.STRING },
                  summary: { type: Type.STRING }
                }
              },
              experience: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    company: { type: Type.STRING },
                    position: { type: Type.STRING },
                    location: { type: Type.STRING },
                    startDate: { type: Type.STRING },
                    endDate: { type: Type.STRING },
                    description: { type: Type.ARRAY, items: { type: Type.STRING } }
                  }
                }
              },
              education: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    school: { type: Type.STRING },
                    degree: { type: Type.STRING },
                    field: { type: Type.STRING },
                    location: { type: Type.STRING },
                    startDate: { type: Type.STRING },
                    endDate: { type: Type.STRING }
                  }
                }
              },
              skills: { type: Type.ARRAY, items: { type: Type.STRING } },
              projects: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      });

      res.json(JSON.parse(response.text || "{}"));
    } catch (error) {
      console.error("AI Error:", error);
      res.status(500).json({ error: "Failed to parse text" });
    }
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
