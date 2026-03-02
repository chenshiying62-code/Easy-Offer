import React, { useState, useEffect } from 'react';
import { 
  User, Briefcase, GraduationCap, Code, 
  Sparkles, Download, Layout, FileText, 
  Trash2, Plus, ChevronRight, ChevronLeft,
  Target, MessageSquare, Shield, History,
  Mic, Send, Loader2, CheckCircle2, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResumeData, Experience, Education, Project, ResumeStyle } from './types';
import { GoogleGenAI, Type } from "@google/genai";

// --- AI Service ---
const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("未检测到 Gemini API Key。请在侧边栏的‘机密’面板中配置 GEMINI_API_KEY。");
  }
  return new GoogleGenAI({ apiKey });
};

const cleanJsonString = (str: string) => {
  // Remove markdown code blocks if present (case-insensitive)
  let cleaned = str.replace(/```(?:json)?\n?/gi, '').replace(/```\n?$/g, '').trim();
  // Sometimes AI adds text before or after the JSON block
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  }
  return cleaned;
};

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      active 
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
        : 'text-slate-500 hover:bg-slate-100'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

const InputField = ({ label, value, onChange, placeholder, type = "text" }: any) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
    />
  </div>
);

const TextAreaField = ({ label, value, onChange, placeholder, rows = 3 }: any) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</label>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none"
    />
  </div>
);

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('personal');
  const [style, setStyle] = useState<ResumeStyle>('professional');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showJDModal, setShowJDModal] = useState(false);
  const [jdText, setJdText] = useState('');
  const [jdAnalysis, setJdAnalysis] = useState<any>(null);
  const [isAnalyzingJD, setIsAnalyzingJD] = useState(false);
  const [showSmartInputModal, setShowSmartInputModal] = useState(false);
  const [smartInputText, setSmartInputText] = useState('');
  const [isParsingSmartInput, setIsParsingSmartInput] = useState(false);

  const [resume, setResume] = useState<ResumeData>({
    id: Math.random().toString(36).substr(2, 9),
    personalInfo: {
      fullName: '',
      email: '',
      phone: '',
      location: '',
      summary: ''
    },
    experience: [],
    education: [],
    skills: [],
    projects: []
  });

  const updatePersonalInfo = (field: string, value: string) => {
    setResume(prev => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, [field]: value }
    }));
  };

  const addExperience = () => {
    const newExp: Experience = {
      id: Math.random().toString(36).substr(2, 9),
      company: '',
      position: '',
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      description: ['']
    };
    setResume(prev => ({ ...prev, experience: [...prev.experience, newExp] }));
  };

  const addEducation = () => {
    const newEdu: Education = {
      id: Math.random().toString(36).substr(2, 9),
      school: '',
      degree: '',
      field: '',
      location: '',
      startDate: '',
      endDate: ''
    };
    setResume(prev => ({ ...prev, education: [...prev.education, newEdu] }));
  };

  const updateEducation = (id: string, field: string, value: string) => {
    setResume(prev => ({
      ...prev,
      education: prev.education.map(edu => edu.id === id ? { ...edu, [field]: value } : edu)
    }));
  };

  const addProject = () => {
    const newProj: Project = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      description: ''
    };
    setResume(prev => ({ ...prev, projects: [...prev.projects, newProj] }));
  };

  const updateProject = (id: string, field: string, value: string) => {
    setResume(prev => ({
      ...prev,
      projects: prev.projects.map(p => p.id === id ? { ...p, [field]: value } : p)
    }));
  };

  const updateSkills = (skillsString: string) => {
    setResume(prev => ({
      ...prev,
      skills: skillsString.split(',').map(s => s.trim()).filter(s => s !== '')
    }));
  };

  const updateExperience = (id: string, field: string, value: any) => {
    setResume(prev => ({
      ...prev,
      experience: prev.experience.map(exp => exp.id === id ? { ...exp, [field]: value } : exp)
    }));
  };

  const optimizeBullet = async (expId: string, bulletIndex: number) => {
    const exp = resume.experience.find(e => e.id === expId);
    if (!exp) return;
    
    const text = exp.description[bulletIndex];
    if (!text || text.length < 5) return;

    setIsOptimizing(true);
    try {
      const ai = getAI();
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

      if (response.text) {
        const newDesc = [...exp.description];
        newDesc[bulletIndex] = response.text;
        updateExperience(expId, 'description', newDesc);
      }
    } catch (err) {
      console.error("AI Optimization Error:", err);
      alert("AI 优化失败，请稍后再试。");
    } finally {
      setIsOptimizing(false);
    }
  };

  const analyzeJD = async () => {
    if (!jdText) return;
    setIsAnalyzingJD(true);
    setJdAnalysis(null);
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `根据以下职位描述（JD）分析此简历。
        1. 识别缺失的关键技能/关键词。
        2. 提出 3 条具体的改进建议，使简历更好地匹配 JD。
        3. 给出 ATS 兼容性评分（0-100）。
        请务必使用中文回复。
        
        简历内容: ${JSON.stringify(resume)}
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

      if (response.text) {
        const cleaned = cleanJsonString(response.text);
        console.log("JD Analysis Response:", cleaned);
        const data = JSON.parse(cleaned);
        setJdAnalysis(data);
      } else {
        throw new Error("AI 未返回有效内容");
      }
    } catch (err) {
      console.error("JD Analysis Error:", err);
      alert("JD 分析失败：" + (err instanceof Error ? err.message : "未知错误"));
    } finally {
      setIsAnalyzingJD(false);
    }
  };

  const parseSmartInput = async () => {
    if (!smartInputText) return;
    setIsParsingSmartInput(true);
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `将以下关于个人经历的非结构化文本解析并提取为结构化的简历数据。
        文本可能包含个人信息、工作经历、教育背景、技能和项目。
        请尽可能详细地提取信息，并使用专业术语进行润色。
        
        输入文本: "${smartInputText}"`,
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

      if (response.text) {
        const cleaned = cleanJsonString(response.text);
        console.log("Smart Input Response:", cleaned);
        const data = JSON.parse(cleaned);
        
        // Map IDs to the parsed data
        const structuredData: ResumeData = {
          ...resume,
          personalInfo: data.personalInfo || resume.personalInfo,
          experience: (data.experience || []).map((exp: any) => ({
            ...exp,
            id: Math.random().toString(36).substr(2, 9),
            current: exp.endDate === '至今' || exp.endDate === 'Present'
          })),
          education: (data.education || []).map((edu: any) => ({
            ...edu,
            id: Math.random().toString(36).substr(2, 9)
          })),
          skills: data.skills || resume.skills,
          projects: (data.projects || []).map((proj: any) => ({
            ...proj,
            id: Math.random().toString(36).substr(2, 9)
          }))
        };
        
        setResume(structuredData);
        setShowSmartInputModal(false);
        setSmartInputText('');
      } else {
        throw new Error("AI 未返回有效内容");
      }
    } catch (err) {
      console.error("Smart Input Parsing Error:", err);
      alert("智能解析失败：" + (err instanceof Error ? err.message : "未知错误"));
    } finally {
      setIsParsingSmartInput(false);
    }
  };

  const downloadPDF = () => {
    window.print();
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8F9FA]">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 p-6 flex flex-col gap-8 no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <Sparkles size={24} />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Easy Offer</h1>
            <p className="text-xs text-slate-400 font-medium">AI Resume Builder</p>
          </div>
        </div>

        <nav className="flex flex-col gap-2">
          <SidebarItem icon={User} label="个人信息" active={activeTab === 'personal'} onClick={() => setActiveTab('personal')} />
          <SidebarItem icon={Briefcase} label="工作经历" active={activeTab === 'experience'} onClick={() => setActiveTab('experience')} />
          <SidebarItem icon={GraduationCap} label="教育背景" active={activeTab === 'education'} onClick={() => setActiveTab('education')} />
          <SidebarItem icon={Code} label="技能与项目" active={activeTab === 'skills'} onClick={() => setActiveTab('skills')} />
        </nav>

        <div className="mt-auto space-y-4">
          <button 
            onClick={() => setShowSmartInputModal(true)}
            className="w-full flex items-center justify-center gap-2 bg-indigo-50 text-indigo-600 py-3 rounded-xl font-bold hover:bg-indigo-100 transition-all border border-indigo-200"
          >
            <Sparkles size={18} />
            智能一键生成
          </button>

          <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
            <h3 className="text-sm font-bold text-indigo-900 mb-1">专业功能</h3>
            <p className="text-xs text-indigo-700 mb-3">解锁 JD 匹配和 AI 面试准备。</p>
            <button 
              onClick={() => setShowJDModal(true)}
              className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              <Target size={14} />
              匹配 JD
            </button>
          </div>
          
          <button 
            onClick={downloadPDF}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
          >
            <Download size={18} />
            导出 PDF
          </button>
        </div>
      </aside>

      {/* Main Editor Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 no-print">
        <div className="max-w-3xl mx-auto">
          <header className="mb-8 flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                {activeTab === 'personal' && '个人信息'}
                {activeTab === 'experience' && '工作经历'}
                {activeTab === 'education' && '教育背景'}
                {activeTab === 'skills' && '技能与项目'}
              </h2>
              <p className="text-slate-500">填写您的详细信息，让 AI 完成繁重的工作。</p>
            </div>
            <div className="flex gap-2">
              {[
                { id: 'professional', label: '专业' },
                { id: 'modern', label: '现代' },
                { id: 'creative', label: '创意' }
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id as ResumeStyle)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    style === s.id ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </header>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {activeTab === 'personal' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                  <InputField label="姓名" value={resume.personalInfo.fullName} onChange={(v: string) => updatePersonalInfo('fullName', v)} placeholder="张三" />
                  <InputField label="邮箱" value={resume.personalInfo.email} onChange={(v: string) => updatePersonalInfo('email', v)} placeholder="zhangsan@example.com" type="email" />
                  <InputField label="电话" value={resume.personalInfo.phone} onChange={(v: string) => updatePersonalInfo('phone', v)} placeholder="138 0000 0000" />
                  <InputField label="城市" value={resume.personalInfo.location} onChange={(v: string) => updatePersonalInfo('location', v)} placeholder="上海" />
                  <div className="md:col-span-2">
                    <TextAreaField label="个人总结" value={resume.personalInfo.summary} onChange={(v: string) => updatePersonalInfo('summary', v)} placeholder="拥有多年经验的软件工程师，专注于..." />
                  </div>
                </div>
              )}

              {activeTab === 'experience' && (
                <div className="space-y-6">
                  {resume.experience.map((exp) => (
                    <div key={exp.id} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 relative group">
                      <button 
                        onClick={() => setResume(prev => ({ ...prev, experience: prev.experience.filter(e => e.id !== exp.id) }))}
                        className="absolute top-6 right-6 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <InputField label="公司" value={exp.company} onChange={(v: string) => updateExperience(exp.id, 'company', v)} placeholder="阿里巴巴" />
                        <InputField label="职位" value={exp.position} onChange={(v: string) => updateExperience(exp.id, 'position', v)} placeholder="高级工程师" />
                        <InputField label="开始日期" value={exp.startDate} onChange={(v: string) => updateExperience(exp.id, 'startDate', v)} placeholder="2020年1月" />
                        <InputField label="结束日期" value={exp.endDate} onChange={(v: string) => updateExperience(exp.id, 'endDate', v)} placeholder="至今" />
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">职责与成就</label>
                          <button 
                            onClick={() => {
                              const newDesc = [...exp.description, ''];
                              updateExperience(exp.id, 'description', newDesc);
                            }}
                            className="text-indigo-600 text-xs font-bold flex items-center gap-1 hover:underline"
                          >
                            <Plus size={14} /> 添加要点
                          </button>
                        </div>
                        
                        {exp.description.map((bullet, idx) => (
                          <div key={idx} className="flex gap-3 items-start">
                            <div className="flex-1 relative">
                              <textarea
                                value={bullet}
                                onChange={(e) => {
                                  const newDesc = [...exp.description];
                                  newDesc[idx] = e.target.value;
                                  updateExperience(exp.id, 'description', newDesc);
                                }}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none text-sm"
                                rows={2}
                                placeholder="描述你做了什么..."
                              />
                              <button
                                onClick={() => optimizeBullet(exp.id, idx)}
                                disabled={isOptimizing || bullet.length < 5}
                                className="absolute bottom-2 right-2 p-1.5 bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                title="使用 AI STAR 法则优化"
                              >
                                {isOptimizing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                              </button>
                            </div>
                            <button 
                              onClick={() => {
                                const newDesc = exp.description.filter((_, i) => i !== idx);
                                updateExperience(exp.id, 'description', newDesc);
                              }}
                              className="mt-2 text-slate-300 hover:text-red-500"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  <button 
                    onClick={addExperience}
                    className="w-full py-4 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-bold hover:border-indigo-400 hover:text-indigo-500 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={20} />
                    添加工作经历
                  </button>
                </div>
              )}

              {activeTab === 'education' && (
                <div className="space-y-6">
                  {resume.education.map((edu) => (
                    <div key={edu.id} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 relative group">
                      <button 
                        onClick={() => setResume(prev => ({ ...prev, education: prev.education.filter(e => e.id !== edu.id) }))}
                        className="absolute top-6 right-6 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputField label="学校" value={edu.school} onChange={(v: string) => updateEducation(edu.id, 'school', v)} placeholder="清华大学" />
                        <InputField label="学位" value={edu.degree} onChange={(v: string) => updateEducation(edu.id, 'degree', v)} placeholder="学士" />
                        <InputField label="专业" value={edu.field} onChange={(v: string) => updateEducation(edu.id, 'field', v)} placeholder="计算机科学" />
                        <InputField label="城市" value={edu.location} onChange={(v: string) => updateEducation(edu.id, 'location', v)} placeholder="北京" />
                        <InputField label="开始日期" value={edu.startDate} onChange={(v: string) => updateEducation(edu.id, 'startDate', v)} placeholder="2016年9月" />
                        <InputField label="结束日期" value={edu.endDate} onChange={(v: string) => updateEducation(edu.id, 'endDate', v)} placeholder="2020年6月" />
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={addEducation}
                    className="w-full py-4 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-bold hover:border-indigo-400 hover:text-indigo-500 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={20} />
                    添加教育背景
                  </button>
                </div>
              )}

              {activeTab === 'skills' && (
                <div className="space-y-8">
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                    <TextAreaField 
                      label="技能（逗号分隔）" 
                      value={resume.skills.join(', ')} 
                      onChange={updateSkills} 
                      placeholder="React, TypeScript, Node.js, Python, AWS..." 
                    />
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-slate-900">项目经历</h3>
                    {resume.projects.map((proj) => (
                      <div key={proj.id} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 relative group">
                        <button 
                          onClick={() => setResume(prev => ({ ...prev, projects: prev.projects.filter(p => p.id !== proj.id) }))}
                          className="absolute top-6 right-6 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                        <div className="space-y-6">
                          <InputField label="项目名称" value={proj.name} onChange={(v: string) => updateProject(proj.id, 'name', v)} placeholder="电商平台" />
                          <TextAreaField label="项目描述" value={proj.description} onChange={(v: string) => updateProject(proj.id, 'description', v)} placeholder="使用...构建了一个全栈平台" />
                        </div>
                      </div>
                    ))}
                    <button 
                      onClick={addProject}
                      className="w-full py-4 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-bold hover:border-indigo-400 hover:text-indigo-500 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={20} />
                      添加项目
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Live Preview Panel */}
      <section className="hidden xl:block w-[500px] bg-slate-100 p-8 overflow-y-auto border-l border-slate-200 no-print">
        <div className="sticky top-0">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Layout size={18} />
              实时预览
            </h3>
            <span className="text-[10px] font-bold px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full uppercase tracking-widest">
              自动保存中
            </span>
          </div>
          
          <div className="scale-[0.55] origin-top shadow-2xl rounded-sm overflow-hidden">
            <ResumePreview data={resume} style={style} />
          </div>
        </div>
      </section>

      {/* Print View (Hidden normally) */}
      <div className="hidden print:block">
        <ResumePreview data={resume} style={style} />
      </div>

      {/* JD Modal */}
      {showJDModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-900">JD 目标优化器</h3>
                <p className="text-sm text-slate-500">粘贴职位描述以分析简历匹配度。</p>
              </div>
              <button onClick={() => setShowJDModal(false)} className="text-slate-400 hover:text-slate-600">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <TextAreaField 
                label="职位描述 (JD)" 
                value={jdText} 
                onChange={setJdText} 
                placeholder="在此处粘贴完整的 JD 内容..." 
                rows={8} 
              />
              
              {jdAnalysis && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                    <div className="w-16 h-16 rounded-full border-4 border-indigo-600 flex items-center justify-center text-xl font-bold text-indigo-600">
                      {jdAnalysis.atsScore}%
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">ATS 匹配分数</h4>
                      <p className="text-xs text-slate-500">基于关键词密度和经历匹配度。</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                      <h5 className="text-xs font-bold text-red-700 uppercase mb-2 flex items-center gap-1">
                        <AlertCircle size={12} /> 缺失关键词
                      </h5>
                      <div className="flex flex-wrap gap-1">
                        {jdAnalysis.missingKeywords.map((k: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 bg-white text-red-600 text-[10px] font-bold rounded-md border border-red-200">{k}</span>
                        ))}
                      </div>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <h5 className="text-xs font-bold text-emerald-700 uppercase mb-2 flex items-center gap-1">
                        <CheckCircle2 size={12} /> 改进建议
                      </h5>
                      <ul className="text-[10px] text-emerald-800 space-y-1 list-disc pl-3">
                        {jdAnalysis.suggestions.map((s: string, i: number) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setShowJDModal(false)}
                className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900"
              >
                取消
              </button>
              <button 
                onClick={analyzeJD}
                disabled={isAnalyzingJD || !jdText}
                className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isAnalyzingJD ? <Loader2 size={18} className="animate-spin" /> : <Target size={18} />}
                开始分析
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Smart Input Modal */}
      {showSmartInputModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-900">智能一键生成 (Lazy Mode)</h3>
                <p className="text-sm text-slate-500">粘贴您的旧简历、LinkedIn 简介或一段口述经历。</p>
              </div>
              <button onClick={() => setShowSmartInputModal(false)} className="text-slate-400 hover:text-slate-600">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <TextAreaField 
                label="非结构化经历信息" 
                value={smartInputText} 
                onChange={setSmartInputText} 
                placeholder="例如：我叫张三，在腾讯实习过3个月，负责公众号运营，涨粉2万。本科毕业于清华大学..." 
                rows={10} 
              />
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                <AlertCircle className="text-amber-600 shrink-0" size={20} />
                <p className="text-xs text-amber-800 leading-relaxed">
                  提示：您可以直接粘贴整份简历内容。AI 将自动识别个人信息、工作、教育和技能，并按照专业格式进行重构。
                </p>
              </div>
            </div>

            <div className="p-8 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setShowSmartInputModal(false)}
                className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900"
              >
                取消
              </button>
              <button 
                onClick={parseSmartInput}
                disabled={isParsingSmartInput || !smartInputText}
                className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isParsingSmartInput ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                开始解析并生成
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// --- Resume Preview Component ---

const ResumePreview = ({ data, style }: { data: ResumeData, style: ResumeStyle }) => {
  const { personalInfo, experience } = data;

  return (
    <div className={`resume-page ${style === 'modern' ? 'font-sans' : style === 'creative' ? 'font-serif' : 'font-sans'}`}>
      {/* Header */}
      <header className={`mb-8 ${style === 'modern' ? 'border-l-8 border-indigo-600 pl-6' : 'text-center'}`}>
        <h1 className={`text-4xl font-bold text-slate-900 mb-2 ${style === 'creative' ? 'font-serif italic' : 'tracking-tight'}`}>
          {personalInfo.fullName || '您的姓名'}
        </h1>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-slate-500 text-sm">
          {personalInfo.email && <span>{personalInfo.email}</span>}
          {personalInfo.phone && <span>{personalInfo.phone}</span>}
          {personalInfo.location && <span>{personalInfo.location}</span>}
        </div>
      </header>

      {/* Summary */}
      {personalInfo.summary && (
        <section className="mb-8">
          <h2 className={`text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1`}>
            个人总结
          </h2>
          <p className="text-slate-700 text-sm leading-relaxed">
            {personalInfo.summary}
          </p>
        </section>
      )}

      {/* Experience */}
      <section className="mb-8">
        <h2 className={`text-xs font-bold text-indigo-600 uppercase tracking-widest mb-4 border-b border-slate-100 pb-1`}>
          工作经历
        </h2>
        <div className="space-y-6">
          {experience.length > 0 ? experience.map((exp) => (
            <div key={exp.id}>
              <div className="flex justify-between items-baseline mb-1">
                <h3 className="font-bold text-slate-900">{exp.position || '职位'}</h3>
                <span className="text-xs text-slate-500 font-medium">{exp.startDate} — {exp.endDate}</span>
              </div>
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-sm font-semibold text-slate-700">{exp.company || '公司'}</span>
                <span className="text-xs text-slate-400">{exp.location}</span>
              </div>
              <ul className="list-disc pl-4 space-y-1.5">
                {exp.description.map((bullet, i) => (
                  <li key={i} className="text-sm text-slate-600 leading-snug">
                    {bullet || '成就或职责描述...'}
                  </li>
                ))}
              </ul>
            </div>
          )) : (
            <p className="text-slate-300 text-sm italic">添加工作经历以在此处查看预览。</p>
          )}
        </div>
      </section>

      {/* Education */}
      {data.education.length > 0 && (
        <section className="mb-8">
          <h2 className={`text-xs font-bold text-indigo-600 uppercase tracking-widest mb-4 border-b border-slate-100 pb-1`}>
            教育背景
          </h2>
          <div className="space-y-4">
            {data.education.map((edu) => (
              <div key={edu.id}>
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-bold text-slate-900">{edu.school || '学校'}</h3>
                  <span className="text-xs text-slate-500 font-medium">{edu.startDate} — {edu.endDate}</span>
                </div>
                <div className="text-sm text-slate-700">
                  {edu.degree} · {edu.field}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {data.skills.length > 0 && (
        <section className="mb-8">
          <h2 className={`text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1`}>
            技能
          </h2>
          <div className="flex flex-wrap gap-2">
            {data.skills.map((skill, i) => (
              <span key={i} className="px-2 py-1 bg-slate-50 text-slate-700 text-xs rounded-md border border-slate-100">
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      {data.projects.length > 0 && (
        <section>
          <h2 className={`text-xs font-bold text-indigo-600 uppercase tracking-widest mb-4 border-b border-slate-100 pb-1`}>
            项目经历
          </h2>
          <div className="space-y-4">
            {data.projects.map((proj) => (
              <div key={proj.id}>
                <h3 className="font-bold text-slate-900 text-sm mb-1">{proj.name || '项目名称'}</h3>
                <p className="text-sm text-slate-600 leading-snug">{proj.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
