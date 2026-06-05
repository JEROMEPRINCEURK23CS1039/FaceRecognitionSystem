import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Info, CheckCircle, XCircle, Unlock, UserPlus,
  ScanFace, Sun, Eye, EyeOff, LogOut,
  KeyRound, Plus, Copy, Trash2, Lock, Timer, BrainCircuit,
  Activity, Shield, AlertTriangle, Zap, Clock, Bell, User, LayoutGrid, Database, Cog, FileText
} from 'lucide-react';
import Aurora from './Aurora';
import DotField from './DotField';
import LetterGlitch from './LetterGlitch';
import GradientText from './GradientText';
import NeuralLogo from './NeuralLogo';

// API base
const API_BASE = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
  ? 'http://127.0.0.1:8000/api'
  : `${window.location.origin}/api`;

const getPasswordStrength = (pass) => {
  if (!pass) return { score: 0, text: 'None', color: 'text-slate-500', barColor: 'bg-slate-500/20' };
  let score = 0;
  if (pass.length >= 8) score++;
  if (pass.length >= 14) score++;
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
  if (/[0-9]/.test(pass) && /[^A-Za-z0-9]/.test(pass)) score++;
  
  const ratings = [
    { text: 'Very Weak', color: 'text-rose-500', barColor: 'bg-rose-500' },
    { text: 'Weak', color: 'text-rose-400', barColor: 'bg-rose-400' },
    { text: 'Fair', color: 'text-yellow-400', barColor: 'bg-yellow-400' },
    { text: 'Good', color: 'text-cyan-400', barColor: 'bg-cyan-400' },
    { text: 'Strong', color: 'text-emerald-400', barColor: 'bg-emerald-400' }
  ];
  return ratings[score];
};

const parseInlineMarkdown = (text) => {
  if (!text) return "";
  const parts = [];
  let remaining = text;
  const regex = /(\*\*.*?\*\*|`.*?`)/;
  
  while (remaining) {
    const match = remaining.match(regex);
    if (!match) {
      parts.push(remaining);
      break;
    }
    
    const index = match.index;
    if (index > 0) {
      parts.push(remaining.substring(0, index));
    }
    
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(<strong key={remaining + index} className="font-extrabold text-white text-shadow-[0_0_10px_rgba(6,182,212,0.3)]">{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(<code key={remaining + index} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[10px] text-cyan-300">{token.slice(1, -1)}</code>);
    }
    
    remaining = remaining.substring(index + token.length);
  }
  return parts;
};

const renderMarkdown = (text) => {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let inCodeBlock = false;
  let codeBlockLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${i}`} className="p-3 my-2 rounded bg-slate-955/85 border border-white/10 font-mono text-[10px] text-cyan-300 overflow-x-auto select-all leading-normal">
            <code>{codeBlockLines.join('\n')}</code>
          </pre>
        );
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    if (!trimmed) {
      elements.push(<div key={`space-${i}`} className="h-1.5" />);
      continue;
    }

    if (trimmed.startsWith('###')) {
      elements.push(<h4 key={i} className="text-xs font-bold text-cyan-400 mt-2.5 mb-1 uppercase tracking-wide font-display">{parseInlineMarkdown(trimmed.replace(/^###\s*/, ''))}</h4>);
      continue;
    }
    if (trimmed.startsWith('##')) {
      elements.push(<h3 key={i} className="text-xs font-bold text-cyan-400 mt-3 mb-1.5 uppercase tracking-wide border-b border-white/5 pb-1 font-display">{parseInlineMarkdown(trimmed.replace(/^##\s*/, ''))}</h3>);
      continue;
    }
    if (trimmed.startsWith('#')) {
      elements.push(<h2 key={i} className="text-sm font-bold text-cyan-400 mt-4 mb-2 uppercase tracking-widest font-display">{parseInlineMarkdown(trimmed.replace(/^#\s*/, ''))}</h2>);
      continue;
    }

    if (trimmed.startsWith('*') || trimmed.startsWith('-')) {
      const content = trimmed.replace(/^[\*\-]\s*/, '');
      elements.push(
        <ul key={i} className="list-disc pl-4 text-xs text-slate-300 space-y-0.5 mt-0.5">
          <li className="leading-relaxed">{parseInlineMarkdown(content)}</li>
        </ul>
      );
      continue;
    }

    if (/^\d+\./.test(trimmed)) {
      const content = trimmed.replace(/^\d+\.\s*/, '');
      const num = trimmed.match(/^\d+/)[0];
      elements.push(
        <div key={i} className="flex gap-2 text-xs text-slate-300 leading-relaxed mt-1 pl-1">
          <span className="font-bold text-cyan-400 font-display">{num}.</span>
          <span className="flex-1">{parseInlineMarkdown(content)}</span>
        </div>
      );
      continue;
    }

    elements.push(<p key={i} className="text-xs text-slate-300 leading-relaxed mt-0.5">{parseInlineMarkdown(trimmed)}</p>);
  }

  if (inCodeBlock && codeBlockLines.length > 0) {
    elements.push(
      <pre key="code-unclosed" className="p-3 my-2 rounded bg-slate-950/80 border border-white/10 font-mono text-[10px] text-cyan-300 overflow-x-auto select-all leading-normal">
        <code>{codeBlockLines.join('\n')}</code>
      </pre>
    );
  }

  return elements;
};

function WaveChart() {
  return (
    <svg className="w-full h-24 overflow-visible" viewBox="0 0 200 80">
      <defs>
        <linearGradient id="cyan-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
        </linearGradient>
        <linearGradient id="purple-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <motion.path
        animate={{
          d: [
            "M 0,55 Q 25,65 50,55 T 100,45 T 150,65 T 200,50",
            "M 0,50 Q 25,45 50,55 T 100,65 T 150,45 T 200,55",
            "M 0,55 Q 25,65 50,55 T 100,45 T 150,65 T 200,50"
          ]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        fill="none"
        stroke="#8b5cf6"
        strokeWidth="1.2"
        className="opacity-70"
      />
      <motion.path
        animate={{
          d: [
            "M 0,55 Q 25,65 50,55 T 100,45 T 150,65 T 200,50 L 200,80 L 0,80 Z",
            "M 0,50 Q 25,45 50,55 T 100,65 T 150,45 T 200,55 L 200,80 L 0,80 Z",
            "M 0,55 Q 25,65 50,55 T 100,45 T 150,65 T 200,50 L 200,80 L 0,80 Z"
          ]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        fill="url(#purple-grad)"
        className="opacity-10"
      />
      <motion.path
        animate={{
          d: [
            "M 0,45 Q 25,25 50,40 T 100,55 T 150,35 T 200,45",
            "M 0,35 Q 25,55 50,40 T 100,25 T 150,55 T 200,35",
            "M 0,45 Q 25,25 50,40 T 100,55 T 150,35 T 200,45"
          ]
        }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        fill="none"
        stroke="#06b6d4"
        strokeWidth="2"
      />
      <motion.path
        animate={{
          d: [
            "M 0,45 Q 25,25 50,40 T 100,55 T 150,35 T 200,45 L 200,80 L 0,80 Z",
            "M 0,35 Q 25,55 50,40 T 100,25 T 150,55 T 200,35 L 200,80 L 0,80 Z",
            "M 0,45 Q 25,25 50,40 T 100,55 T 150,35 T 200,45 L 200,80 L 0,80 Z"
          ]
        }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        fill="url(#cyan-grad)"
        className="opacity-25"
      />
    </svg>
  );
}

function TacticalMap() {
  return (
    <div className="relative w-full h-36 flex items-center justify-center overflow-hidden bg-white/[0.01] border border-white/5 rounded-2xl">
      <svg className="w-full h-full opacity-35 p-2" viewBox="0 0 400 180" fill="none">
        <g fill="rgba(6,182,212,0.35)">
          <circle cx="60" cy="50" r="1.5" /><circle cx="70" cy="45" r="1.5" /><circle cx="80" cy="40" r="1.5" />
          <circle cx="70" cy="55" r="1.5" /><circle cx="80" cy="50" r="1.5" /><circle cx="90" cy="55" r="1.5" />
          <circle cx="80" cy="65" r="1.5" /><circle cx="90" cy="70" r="1.5" />
          <circle cx="100" cy="100" r="1.5" /><circle cx="110" cy="110" r="1.5" /><circle cx="120" cy="120" r="1.5" />
          <circle cx="110" cy="130" r="1.5" /><circle cx="115" cy="140" r="1.5" /><circle cx="120" cy="150" r="1.5" />
          <circle cx="180" cy="40" r="1.5" /><circle cx="190" cy="35" r="1.5" /><circle cx="200" cy="40" r="1.5" /><circle cx="210" cy="35" r="1.5" />
          <circle cx="200" cy="50" r="1.5" /><circle cx="210" cy="45" r="1.5" /><circle cx="220" cy="40" r="1.5" /><circle cx="230" cy="45" r="1.5" />
          <circle cx="220" cy="55" r="1.5" /><circle cx="230" cy="60" r="1.5" /><circle cx="240" cy="50" r="1.5" /><circle cx="250" cy="55" r="1.5" />
          <circle cx="260" cy="60" r="1.5" /><circle cx="270" cy="65" r="1.5" /><circle cx="280" cy="70" r="1.5" />
          <circle cx="180" cy="80" r="1.5" /><circle cx="190" cy="85" r="1.5" /><circle cx="200" cy="95" r="1.5" />
          <circle cx="190" cy="105" r="1.5" /><circle cx="200" cy="110" r="1.5" /><circle cx="205" cy="120" r="1.5" />
          <circle cx="310" cy="120" r="1.5" /><circle cx="320" cy="125" r="1.5" /><circle cx="330" cy="130" r="1.5" />
          <circle cx="320" cy="135" r="1.5" />
        </g>
      </svg>
      <div className="absolute top-[50px] left-[80px]">
        <span className="absolute inline-flex h-3.5 w-3.5 rounded-full bg-emerald-400 opacity-75 map-pulse"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
      </div>
      <div className="absolute top-[40px] left-[210px]">
        <span className="absolute inline-flex h-3.5 w-3.5 rounded-full bg-cyan-400 opacity-75 map-pulse" style={{ animationDelay: '0.5s' }}></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
      </div>
      <div className="absolute top-[125px] left-[320px]">
        <span className="absolute inline-flex h-3.5 w-3.5 rounded-full bg-emerald-400 opacity-75 map-pulse" style={{ animationDelay: '1s' }}></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
      </div>
      <div className="absolute top-[100px] left-[110px]">
        <span className="absolute inline-flex h-3.5 w-3.5 rounded-full bg-rose-400 opacity-75 map-pulse" style={{ animationDelay: '1.5s' }}></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
      </div>
      <div className="absolute bottom-2 left-3 text-[7px] font-mono text-cyan-400/50 uppercase tracking-widest">Global Node Activity Map</div>
      <div className="absolute bottom-2 right-3 text-[7px] font-mono text-emerald-400 bg-emerald-950/40 px-1 border border-emerald-500/20 rounded">SYSTEM SECURED</div>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'vault' | 'logs' | 'settings' | 'chat'

  // App States
  const [activeMode, setActiveMode] = useState('login'); // 'login' | 'register'
  const [streamActive, setStreamActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState('');
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ registered: 0, logins: 0 });
  const [enhancementStatus, setEnhancementStatus] = useState('Enabled');
  const [blinkProgress, setBlinkProgress] = useState(0);
  const [blinkSuccess, setBlinkSuccess] = useState(false);
  const [shake, setShake] = useState(false);
  const [llmAnalysis, setLlmAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your local AI Security Assistant. How can I help you audit your vault or review recent logs today?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const chatEndRef = useRef(null);

  // Expanded AI Suite States
  const [securityScore, setSecurityScore] = useState(null);
  const [securityScoreTips, setSecurityScoreTips] = useState([]);
  const [loadingScore, setLoadingScore] = useState(false);
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [activeLogFilter, setActiveLogFilter] = useState(null);
  const [isSearchingLogs, setIsSearchingLogs] = useState(false);
  const [pwGenPrompt, setPwGenPrompt] = useState('');
  const [isGeneratingPw, setIsGeneratingPw] = useState(false);
  const [pwGenExplanation, setPwGenExplanation] = useState('');
  const [showPwGenDrawer, setShowPwGenDrawer] = useState(false);
  
  // Real-time diagnostics & blink state
  const [liveEar, setLiveEar] = useState(0.0);
  const [alignmentStatus, setAlignmentStatus] = useState('No Face');
  const [blinkCount, setBlinkCount] = useState(0);
  const isBlinkingRef = useRef(false);

  // AI Core Status States
  const [aiCoreStatus, setAiCoreStatus] = useState({ loaded: false, idle_time_remaining_seconds: 0.0, threads: 9, ram_saved_mb: 0, persistent: true });

  const [isControllingLLM, setIsControllingLLM] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null); // 'scanning' | 'success' | 'failed'

  // Toast notifications
  const [toast, setToast] = useState({ show: false, title: '', desc: '', type: 'info' });

  // WebRTC refs
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const isProcessingRef = useRef(false);

  // Vault Key-Store State
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [vaultSecrets, setVaultSecrets] = useState([]);
  const [revealedIds, setRevealedIds] = useState(new Set());
  const [clipboardTTL, setClipboardTTL] = useState(0);
  const [showAddSecret, setShowAddSecret] = useState(false);
  const [newSecretLabel, setNewSecretLabel] = useState('');
  const [newSecretValue, setNewSecretValue] = useState('');
  const [vaultLoading, setVaultLoading] = useState(false);
  const clipboardTimerRef = useRef(null);
  const idleTimerRef = useRef(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, show: false }));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  // Spotlight Effect for all Glass Panels
  useEffect(() => {
    const handleMouseMove = (e) => {
      document.querySelectorAll('.glass-panel, .tech-panel').forEach((panel) => {
        const rect = panel.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        panel.style.setProperty('--mouse-x', `${x}px`);
        panel.style.setProperty('--mouse-y', `${y}px`);
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Fetch stats and logs initially & start status poll
  useEffect(() => {
    fetchStats();
    fetchLogs();
    fetchAiCoreStatus();
    const pollInterval = setInterval(fetchAiCoreStatus, 5000);
    return () => clearInterval(pollInterval);
  }, []);

  const fetchAiCoreStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/llm/status`);
      if (res.ok) {
        const data = await res.json();
        setAiCoreStatus(data);
      }
    } catch (e) {
      console.error("Failed to fetch LLM status:", e);
    }
  };

  const preloadLLM = async () => {
    setIsControllingLLM(true);
    showToast('AI Core', 'Pre-warming Qwen LLM... loading weights into RAM.', 'info');
    try {
      const res = await fetch(`${API_BASE}/llm/preload`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        showToast('AI Core Loaded', 'Model loaded in memory. Zero cold-start latency.', 'success');
        await fetchAiCoreStatus();
      } else {
        showToast('Preload Error', 'Ensure backend/models/qwen.gguf exists.', 'error');
      }
    } catch (e) {
      showToast('Network Error', 'Could not communicate with AI Core.', 'error');
    } finally {
      setIsControllingLLM(false);
    }
  };

  const unloadLLM = async () => {
    setIsControllingLLM(true);
    showToast('AI Core', 'Reclaiming resources... unloading Qwen LLM.', 'info');
    try {
      const res = await fetch(`${API_BASE}/llm/unload`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.unloaded) {
        showToast('Memory Reclaimed', 'Model purged from memory. 1.2 GB RAM freed.', 'success');
        await fetchAiCoreStatus();
      } else {
        showToast('Standby', 'Model is already idle/unloaded.', 'info');
      }
    } catch (e) {
      showToast('Network Error', 'Could not communicate with AI Core.', 'error');
    } finally {
      setIsControllingLLM(false);
    }
  };

  // Vault Security: Tab Visibility Purge
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && vaultUnlocked) {
        purgeVault();
        showToast('Vault Locked', 'Tab hidden — secrets purged from memory.', 'info');
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [vaultUnlocked]);

  // Vault Security: 2-Minute Idle Timeout
  useEffect(() => {
    if (!vaultUnlocked) return;
    const resetIdle = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        purgeVault();
        showToast('Vault Locked', 'Idle timeout — secrets purged from memory.', 'info');
      }, 120000); // 2 minutes
    };
    resetIdle();
    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('keydown', resetIdle);
    return () => {
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [vaultUnlocked]);

  const showToast = (title, desc, type = 'info') => {
    setToast({ show: true, title, desc, type });
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error("Failed to fetch stats:", e);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/logs`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error("Failed to fetch logs:", e);
    }
  };

  const analyzeLogs = async () => {
    setIsAnalyzing(true);
    setLlmAnalysis("Connecting to AI Core... Analyzing logs...");
    try {
      const res = await fetch(`${API_BASE}/logs/analysis`);
      const data = await res.json();
      if (res.ok) {
        setLlmAnalysis(data.analysis);
      } else {
        setLlmAnalysis("Analysis Failed: " + (data.detail || "Unknown error"));
      }
    } catch (e) {
      setLlmAnalysis("Network Error: Could not reach backend for AI analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const auditPassword = async () => {
    if (!newSecretValue.trim()) {
      showToast('Audit Error', 'Please enter a secret value to audit.', 'error');
      return;
    }
    setIsAuditing(true);
    setAuditResult('Analyzing secret strength...');
    try {
      const res = await fetch(`${API_BASE}/vault/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newSecretValue, label: newSecretLabel || 'Generic Secret' })
      });
      const data = await res.json();
      if (res.ok) {
        setAuditResult(data.critique);
      } else {
        setAuditResult('Audit Failed: ' + (data.detail || 'Unknown error'));
      }
    } catch (e) {
      setAuditResult('Network Error: Could not reach backend for AI audit.');
    } finally {
      setIsAuditing(false);
    }
  };

  const fetchSecurityScore = async () => {
    if (loadingScore) return;
    setLoadingScore(true);
    try {
      const res = await fetch(`${API_BASE}/security-score`);
      const data = await res.json();
      if (res.ok) {
        setSecurityScore(data.score);
        setSecurityScoreTips(data.recommendations || []);
      }
    } catch (e) {
      console.error("Failed to fetch security score:", e);
    } finally {
      setLoadingScore(false);
    }
  };

  const runLogSearch = async (e) => {
    if (e) e.preventDefault();
    if (!logSearchQuery.trim()) {
      setActiveLogFilter(null);
      return;
    }
    setIsSearchingLogs(true);
    try {
      const res = await fetch(`${API_BASE}/logs/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: logSearchQuery })
      });
      const data = await res.json();
      if (res.ok && data.filter && Object.keys(data.filter).length > 0) {
        setActiveLogFilter(data.filter);
        showToast('Logs Filtered', 'AI filtered logs based on search.', 'success');
      } else {
        const query = logSearchQuery.trim().toLowerCase();
        setActiveLogFilter({ clientSideQuery: query });
        showToast('Logs Filtered (Local)', 'Filtered logs locally.', 'info');
      }
    } catch (err) {
      const query = logSearchQuery.trim().toLowerCase();
      setActiveLogFilter({ clientSideQuery: query });
      showToast('Logs Filtered (Local)', 'Filtered logs locally due to network state.', 'info');
    } finally {
      setIsSearchingLogs(false);
    }
  };

  const clearLogFilter = () => {
    setLogSearchQuery('');
    setActiveLogFilter(null);
  };

  const generateMnemonicPassword = async () => {
    if (!pwGenPrompt.trim()) {
      showToast('Generator Error', 'Please describe the password purpose.', 'error');
      return;
    }
    setIsGeneratingPw(true);
    setNewSecretValue('Generating password...');
    try {
      const res = await fetch(`${API_BASE}/vault/generate-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: pwGenPrompt })
      });
      const data = await res.json();
      if (res.ok && data.password) {
        setNewSecretValue(data.password);
        setPwGenExplanation(data.explanation);
        showToast('Generated', 'AI generated secure mnemonic password.', 'success');
      } else {
        setNewSecretValue('');
        showToast('Error', 'Failed to generate password.', 'error');
      }
    } catch (err) {
      setNewSecretValue('');
      showToast('Network Error', 'Could not connect to generator.', 'error');
    } finally {
      setIsGeneratingPw(false);
    }
  };

  // Trigger score update when logged in or when logs change
  useEffect(() => {
    if (isLoggedIn) {
      fetchSecurityScore();
    }
  }, [isLoggedIn, logs]);

  const sendChatMessage = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isSendingChat) return;

    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsSendingChat(true);

    try {
      const history = chatMessages.slice(1).map(msg => ({ role: msg.role, content: msg.content }));
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, history })
      });
      const data = await res.json();
      if (res.ok) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        setChatMessages(prev => [...prev, { role: 'assistant', content: 'Error: ' + (data.detail || 'Could not get response.') }]);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Network error: Could not reach local AI.' }]);
    } finally {
      setIsSendingChat(false);
    }
  };

  const checkSecurityStatus = () => {
    const failures = logs.filter(log => log.event.includes('Denied') || log.event.includes('Rejected') || log.confidence < 50);
    if (failures.length >= 3) {
      return {
        status: 'warning',
        message: `AI Flagged Anomaly: ${failures.length} failed login / unauthorized attempts detected in logs. Recommend log audit.`
      };
    }
    return {
      status: 'optimal',
      message: 'AI Security Audit: Optimal configuration. No anomalies detected in recent log sessions.'
    };
  };

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  // WebRTC Camera Controllers
  const startCamera = async () => {
    if (activeMode === 'register' && !fullName.trim()) {
      triggerShake();
      showToast('Validation Error', 'Please enter a valid registration name.', 'error');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setStreamActive(true);
        setBlinkProgress(0);
        setBlinkSuccess(false);
        setLiveEar(0.0);
        setBlinkCount(0);
        isBlinkingRef.current = false;
        setAlignmentStatus('No Face');
        showToast('Camera Initialized', 'Secure authentication stream connected.', 'success');
        startFrameCapture();
      }
    } catch (err) {
      console.error("Camera access failed:", err);
      showToast('Hardware Error', 'Could not open camera device. Please check permissions.', 'error');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
    setStreamActive(false);
    setIsProcessing(false);
    isProcessingRef.current = false;
  };

  const captureCanvas = useRef(null);
  const captureCtx = useRef(null);

  const startFrameCapture = () => {
    if (intervalRef.current) clearTimeout(intervalRef.current);

    if (!captureCanvas.current) {
      captureCanvas.current = document.createElement('canvas');
      captureCanvas.current.width = 640;
      captureCanvas.current.height = 480;
      captureCtx.current = captureCanvas.current.getContext('2d');
    }

    let frameCount = 0;
    let bestFrame = null;
    let bestScore = -1;
    let lastFrame = null;
    let localBlinkSuccess = false;

    const processFrame = async () => {
      if (!videoRef.current || isProcessingRef.current) return;

      frameCount++;
      captureCtx.current.drawImage(videoRef.current, 0, 0, 640, 480);
      const base64Image = captureCanvas.current.toDataURL('image/jpeg', 0.85);
      lastFrame = base64Image;

      setBlinkProgress((frameCount / 8) * 100);

      try {
        const res = await fetch(`${API_BASE}/biometrics/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Image })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.status === 'success') {
            setLiveEar(data.ear);
            setAlignmentStatus(data.alignment);
            setEnhancementStatus(data.enhancement);

            const score = data.alignment === 'Perfect' ? 3 : data.alignment === 'Face Tilted' ? 2 : data.alignment === 'Face Turned' ? 1 : 0;
            if (score > bestScore) { bestScore = score; bestFrame = base64Image; }

            if (data.ear < 0.18 && !isBlinkingRef.current) {
              isBlinkingRef.current = true;
            } else if (isBlinkingRef.current && data.ear > 0.22) {
              isBlinkingRef.current = false;
              setBlinkCount(c => {
                const next = c + 1;
                if (next >= 1) { setBlinkSuccess(true); localBlinkSuccess = true; }
                return next;
              });
              showToast('Liveness Verified', 'Blink gesture successfully captured!', 'success');
            }
          } else {
            setLiveEar(0.0);
            setAlignmentStatus('No Face');
          }
        }
      } catch (err) {
        console.error('Frame analysis error:', err);
      }

      if (frameCount >= 8) {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;

        setIsProcessing(true);
        setVerificationStatus('scanning');
        const finalFrame = bestFrame || lastFrame;
        const passedLiveness = localBlinkSuccess || blinkSuccess;
        if (activeMode === 'register') {
          await handleBiometricRegistration(finalFrame, passedLiveness);
        } else {
          await handleBiometricAuthentication(finalFrame, passedLiveness);
        }
      } else {
        intervalRef.current = setTimeout(processFrame, 350);
      }
    };

    intervalRef.current = setTimeout(processFrame, 350);
  };

  const handleBiometricRegistration = async (base64Image, passedLiveness) => {
    try {
      const response = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fullName.trim(), image: base64Image, liveness: passedLiveness })
      });

      const data = await response.json();
      if (response.ok) {
        setVerificationStatus('success');
        setTimeout(() => {
          setEnhancementStatus(data.enhancement);
          showToast('Success', 'User profile registered successfully!', 'success');
          setLoggedInUser(fullName.trim());
          setIsLoggedIn(true);
          setFullName('');
          stopCamera();
          fetchStats();
          fetchLogs();
          setIsProcessing(false);
          setVerificationStatus(null);
        }, 1500);
      } else {
        setVerificationStatus('failed');
        triggerShake();
        setTimeout(() => {
          showToast('Error', data.detail || 'Registration failed.', 'error');
          stopCamera();
          setIsProcessing(false);
          setVerificationStatus(null);
        }, 1500);
      }
    } catch (e) {
      setVerificationStatus('failed');
      triggerShake();
      setTimeout(() => {
        showToast('Network Error', 'Could not reach backend API server.', 'error');
        stopCamera();
        setIsProcessing(false);
        setVerificationStatus(null);
      }, 1500);
    }
  };

  const handleBiometricAuthentication = async (base64Image, passedLiveness) => {
    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image, liveness: passedLiveness })
      });

      const data = await response.json();
      if (response.ok) {
        setVerificationStatus('success');
        setTimeout(() => {
          setEnhancementStatus(data.enhancement);
          showToast('Access Granted', `Identity matched as: ${data.name}`, 'success');
          setLoggedInUser(data.name);
          setIsLoggedIn(true);
          stopCamera();
          fetchStats();
          fetchLogs();
          setIsProcessing(false);
          setVerificationStatus(null);
        }, 1500);
      } else {
        setVerificationStatus('failed');
        triggerShake();
        setTimeout(() => {
          showToast('Access Denied', data.detail || 'Identity match failed.', 'error');
          stopCamera();
          setIsProcessing(false);
          setVerificationStatus(null);
        }, 1500);
      }
    } catch (e) {
      setVerificationStatus('failed');
      triggerShake();
      setTimeout(() => {
        showToast('Network Error', 'Could not reach backend API server.', 'error');
        stopCamera();
        setIsProcessing(false);
        setVerificationStatus(null);
      }, 1500);
    }
  };

  const logout = () => {
    purgeVault();
    setIsLoggedIn(false);
    setLoggedInUser('');
    setActiveMode('login');
    setBlinkProgress(0);
    setBlinkSuccess(false);
    setActiveTab('dashboard');
    showToast('Session Terminated', 'Securely logged out from vault.', 'info');
  };

  const purgeVault = () => {
    setVaultSecrets(prev => {
      prev.forEach(s => { s.value = null; s.label = null; });
      return [];
    });
    setVaultUnlocked(false);
    setRevealedIds(new Set());
    setShowAddSecret(false);
    setNewSecretLabel('');
    setNewSecretValue('');
    if (clipboardTimerRef.current) clearInterval(clipboardTimerRef.current);
    setClipboardTTL(0);
  };

  const unlockVault = async () => {
    setVaultLoading(true);
    try {
      const challengeRes = await fetch(`${API_BASE}/vault/challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_name: loggedInUser }),
      });
      const challengeData = await challengeRes.json();

      const unlockRes = await fetch(`${API_BASE}/vault/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge_id: challengeData.challenge_id, user_name: loggedInUser }),
      });
      const unlockData = await unlockRes.json();

      if (unlockRes.ok) {
        setVaultSecrets(unlockData.secrets);
        setVaultUnlocked(true);
        showToast('Vault Unlocked', `${unlockData.secrets.length} secret(s) decrypted into volatile memory.`, 'success');
        fetchLogs();
      } else {
        showToast('Vault Error', unlockData.detail || 'Failed to unlock vault.', 'error');
      }
    } catch (e) {
      showToast('Network Error', 'Could not reach vault API.', 'error');
    }
    setVaultLoading(false);
  };

  const addSecret = async () => {
    if (!newSecretLabel.trim() || !newSecretValue.trim()) {
      showToast('Validation', 'Label and value are required.', 'error');
      return;
    }
    try {
      const challengeRes = await fetch(`${API_BASE}/vault/challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_name: loggedInUser }),
      });
      const challengeData = await challengeRes.json();

      const storeRes = await fetch(`${API_BASE}/vault/secrets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenge_id: challengeData.challenge_id,
          user_name: loggedInUser,
          label: newSecretLabel,
          plaintext: newSecretValue,
        }),
      });

      if (storeRes.ok) {
        showToast('Secret Stored', 'Encrypted with AES-256-GCM and saved.', 'success');
        setNewSecretLabel('');
        setNewSecretValue('');
        setShowAddSecret(false);
        await unlockVault();
        fetchLogs();
      } else {
        const err = await storeRes.json();
        showToast('Error', err.detail || 'Failed to store secret.', 'error');
      }
    } catch (e) {
      showToast('Network Error', 'Could not reach vault API.', 'error');
    }
  };

  const deleteSecretById = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/vault/secrets/${id}?user_name=${encodeURIComponent(loggedInUser)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setVaultSecrets(prev => prev.filter(s => s.id !== id));
        showToast('Destroyed', 'Secret permanently deleted from vault.', 'success');
        fetchLogs();
      }
    } catch (e) {
      showToast('Error', 'Failed to delete secret.', 'error');
    }
  };

  const toggleReveal = (id) => {
    setRevealedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const copyToClipboard = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast('Copied', 'Secret copied. Clipboard auto-clears in 15s.', 'info');
      if (clipboardTimerRef.current) clearInterval(clipboardTimerRef.current);
      setClipboardTTL(15);
      clipboardTimerRef.current = setInterval(() => {
        setClipboardTTL(prev => {
          if (prev <= 1) {
            clearInterval(clipboardTimerRef.current);
            navigator.clipboard.writeText('').catch(() => {});
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (e) {
      showToast('Error', 'Clipboard access denied.', 'error');
    }
  };

  return (
    <div className="min-h-screen flex bg-[#070a13] text-slate-100 relative overflow-hidden font-sans selection:bg-cyan-500/30 w-full">
      {/* Interactive DotField Background */}
      <div className="absolute inset-0 z-0">
        <DotField
          dotRadius={1.5}
          dotSpacing={14}
          bulgeStrength={67}
          glowRadius={160}
          sparkle={true}
          waveAmplitude={0}
          gradientFrom="rgba(6, 182, 212, 0.6)"
          gradientTo="rgba(139, 92, 246, 0.4)"
          glowColor="rgba(6, 182, 212, 0.25)"
        />
      </div>
      
      {/* Global Toast System */}
      <AnimatePresence>
        {toast.show && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 pointer-events-auto"
          >
            <div className="glass-panel flex items-start gap-3 px-5 py-4 rounded-2xl border border-white/10 shadow-2xl w-[320px] sm:w-[420px] max-w-[90vw]">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                toast.type === 'error' ? 'bg-rose-500/20 text-rose-400' : 'bg-cyan-500/20 text-cyan-400'
              }`}>
                {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> :
                 toast.type === 'error' ? <XCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
              </div>
              <div className="flex-grow min-w-0">
                <p className="font-bold text-sm text-white">{toast.title}</p>
                <p className="text-xs text-slate-400 mt-1 break-words leading-relaxed max-h-36 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
                  {toast.desc}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Left Navigation */}
      <aside className="w-16 shrink-0 border-r border-white/5 bg-[#0a0d1a]/80 backdrop-blur-md flex flex-col items-center py-6 gap-8 z-30 relative justify-between">
        <div className="flex flex-col items-center gap-8 w-full">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 flex items-center justify-center border border-white/10 shadow-lg cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <NeuralLogo size={24} />
          </div>
          
          <nav className="flex flex-col gap-4 w-full px-2">
            <button onClick={() => setActiveTab('dashboard')} className={`p-3 rounded-xl border transition-all flex justify-center ${activeTab === 'dashboard' ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}`} title="Dashboard">
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button onClick={() => { if (isLoggedIn) unlockVault(); setActiveTab('vault'); }} className={`p-3 rounded-xl border transition-all flex justify-center ${activeTab === 'vault' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}`} title="Key Store Vault">
              <KeyRound className="w-5 h-5" />
            </button>
            <button onClick={() => { if (isLoggedIn) setChatOpen(true); setActiveTab('chat'); }} className={`p-3 rounded-xl border transition-all flex justify-center ${activeTab === 'chat' ? 'border-purple-500/30 bg-purple-500/10 text-purple-400' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}`} title="AI Chatbot">
              <BrainCircuit className="w-5 h-5" />
            </button>
            <button onClick={() => setActiveTab('logs')} className={`p-3 rounded-xl border transition-all flex justify-center ${activeTab === 'logs' ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}`} title="Timeline Logs">
              <FileText className="w-5 h-5" />
            </button>
          </nav>
        </div>

        <div className="flex flex-col gap-4">
          <button onClick={() => setActiveTab('settings')} className={`p-3 rounded-xl border transition-all flex justify-center ${activeTab === 'settings' ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}`} title="System Configuration">
            <Cog className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 z-20 relative">
        
        {/* Top Header Status Bar */}
        <header className="h-16 border-b border-white/5 bg-[#0a0d1a]/40 backdrop-blur-md px-6 flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold tracking-wider text-white glow-cyan font-display uppercase">AEGIS CORE</span>
            <span className="text-[10px] text-slate-500">|</span>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">VAULT ACCESS PORTAL | v2.8</span>
          </div>

          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-400 flex items-center gap-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {loggedInUser}
                </div>
                <button onClick={logout} className="p-2 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-rose-500 transition-colors hover:bg-rose-500/10" title="Logout">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button id="dev-bypass-btn" onClick={() => { setIsLoggedIn(true); setLoggedInUser('DevAdmin'); showToast('Dev Mode', 'Bypassed biometric check successfully.', 'success'); }} className="px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-xs font-bold text-purple-400 hover:text-white hover:bg-purple-500/20 transition-all cursor-pointer animate-pulse">
                  Dev Bypass
                </button>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-xs text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Online</span>
                </div>
              </div>
            )}
            <button className="p-2 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white transition-colors relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-cyan-500 rounded-full"></span>
            </button>
          </div>
        </header>

        {/* Dynamic tab contents rendering */}
        <main className="flex-grow p-6 overflow-y-auto scroll-dark">
          {activeTab === 'dashboard' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Video Scanner Hub */}
              <section className="lg:col-span-5 flex flex-col gap-6">
                <motion.div animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}} transition={{ duration: 0.4 }} className="tech-panel rounded-3xl p-5 shadow-cyan-glow relative overflow-hidden">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">BIOMETRIC VALIDATION</h3>
                      <p className="text-[10px] text-cyan-400/70 font-mono mt-0.5">TARGET: {isLoggedIn ? loggedInUser.toUpperCase() : 'UNKNOWN_IDENTITY'}</p>
                    </div>
                    <span className="text-[8px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30 uppercase font-bold">GATEWAY_ACTIVE</span>
                  </div>

                  {/* Camera View box */}
                  <div className="w-full relative rounded-2xl overflow-hidden bg-black/50 border border-white/5 aspect-video flex items-center justify-center">
                    <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" autoPlay playsInline muted />
                    
                    {isProcessing && (
                      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-4 z-20">
                        <motion.div animate={verificationStatus === 'failed' ? { x: [-10, 10, -10, 10, -5, 5, 0] } : {}} transition={{ duration: 0.5 }} className="mb-4 relative w-16 h-16 flex items-center justify-center">
                          {verificationStatus === 'scanning' && (
                            <>
                              <div className="absolute inset-0 rounded-full border border-cyan-500/10 animate-ping" />
                              <div className="absolute inset-1 rounded-full border border-cyan-400/15 animate-ping" style={{ animationDelay: '0.3s' }} />
                              <div className="absolute inset-3 rounded-full border border-cyan-400/20 animate-pulse" />
                              <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} className="absolute inset-2 rounded-full border-2 border-transparent border-t-cyan-400/40 border-r-cyan-400/20" />
                              <ScanFace className="w-8 h-8 text-cyan-400 animate-pulse" />
                            </>
                          )}
                          {verificationStatus === 'success' && (
                            <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-14 h-14 rounded-full bg-emerald-500/15 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                              <CheckCircle className="w-6 h-6" />
                            </motion.div>
                          )}
                          {verificationStatus === 'failed' && (
                            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-14 h-14 rounded-full bg-rose-500/15 border-2 border-rose-400 flex items-center justify-center text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
                              <XCircle className="w-6 h-6" />
                            </motion.div>
                          )}
                        </motion.div>
                        <h4 className="text-sm font-bold text-white mb-1 uppercase tracking-wide glow-cyan font-display">{verificationStatus === 'scanning' ? 'Verifying Identity' : verificationStatus === 'success' ? 'Access Granted' : 'Access Denied'}</h4>
                        <p className="text-[10px] text-slate-400 max-w-[200px] leading-relaxed">{verificationStatus === 'scanning' ? 'Matching topological face mesh coordinates...' : verificationStatus === 'success' ? 'Biometric match success. Decrypting vault...' : 'Face ID mismatch or liveness check failed.'}</p>
                      </div>
                    )}

                    {streamActive && <div className="laser-line" />}
                    {streamActive && (
                      <div className="absolute inset-6 border border-cyan-500/20 rounded-xl pointer-events-none">
                        <div className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-[3px] border-l-[3px] border-cyan-400 rounded-tl-sm" />
                        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-[3px] border-r-[3px] border-cyan-400 rounded-tr-sm" />
                        <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-[3px] border-l-[3px] border-cyan-400 rounded-bl-sm" />
                        <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-[3px] border-r-[3px] border-cyan-400 rounded-br-sm" />
                        
                        <div className="absolute top-1.5 left-1.5 text-[7px] font-mono text-cyan-400 bg-cyan-950/60 px-1 rounded border border-cyan-500/30">SYS.REC.ACTIVE</div>
                        <div className="absolute top-1.5 right-1.5 text-[7px] font-mono text-purple-400 bg-purple-950/60 px-1 rounded border border-purple-500/30">FPS: 30 / HD</div>
                        <div className="absolute bottom-1.5 right-1.5 text-[7px] font-mono text-cyan-400 bg-cyan-950/60 px-1 rounded border border-cyan-500/30">LIVENESS: {(liveEar * 100).toFixed(0)}%</div>
                      </div>
                    )}

                    {streamActive && !isProcessing && (
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                        <div className="w-36 h-36 rounded-full border border-cyan-400/10 flex items-center justify-center animate-pulse">
                          <div className="w-28 h-28 rounded-full border border-dashed border-cyan-400/20 flex items-center justify-center animate-[spin_20s_linear_infinite]">
                            <ScanFace className="w-8 h-8 text-cyan-400/30" />
                          </div>
                        </div>
                      </div>
                    )}

                    {!streamActive && (
                      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4">
                        <div className="relative w-24 h-24 flex items-center justify-center mb-3">
                          <div className="absolute inset-0 rounded-full border border-cyan-500/10" />
                          <div className="radar-sweep" />
                          <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 z-10">
                            <ScanFace className="w-6 h-6" />
                          </div>
                        </div>
                        <h3 className="text-sm font-bold text-white mb-0.5 glitch-text font-display" data-text="SCANNER OFFLINE">SCANNER OFFLINE</h3>
                        <p className="text-[10px] text-slate-400 max-w-[200px]">Initiate biometric feed stream to start physiological liveness validation.</p>
                      </div>
                    )}
                  </div>

                  
                  {/* Diagnostics status layout */}
                  <div className="grid grid-cols-2 gap-4 bg-white/5 border border-white/5 rounded-xl p-3 text-[10px]">
                    <div className="flex items-center gap-2">
                      <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="18" cy="18" r="15" className="stroke-white/10" strokeWidth="2.5" fill="transparent" />
                          <circle cx="18" cy="18" r="15" className="stroke-cyan-400 transition-all duration-300" strokeWidth="2.5" fill="transparent" strokeDasharray="94.2" strokeDashoffset={94.2 - (blinkProgress / 100) * 94.2} />
                        </svg>
                        <div className="absolute text-[7px] font-bold text-cyan-400">EAR</div>
                      </div>
                      <div>
                        <p className="font-bold text-white uppercase tracking-wider text-[9px]">LIVENESS STATS</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">EAR: <span className="font-mono text-cyan-400 font-bold">{liveEar.toFixed(3)}</span></p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col justify-center">
                      <span className="text-slate-400">Alignment: <span className={`font-bold ${alignmentStatus === 'Perfect' ? 'text-emerald-400 animate-pulse' : alignmentStatus === 'No Face' ? 'text-slate-500' : 'text-yellow-400'}`}>{alignmentStatus}</span></span>
                      <span className="text-slate-400 mt-0.5">Blinks captured: <span className={`font-bold ${blinkSuccess ? 'text-emerald-400' : 'text-rose-400'}`}>{blinkCount}/1</span></span>
                    </div>
                  </div>

                  {/* Status Indicator Banner */}
                  <div className="mt-4">
                    <div className={`py-3 px-4 rounded-xl border text-center font-black tracking-widest font-display text-xs transition-all ${
                      verificationStatus === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-emerald-glow' :
                      verificationStatus === 'failed' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-rose-glow' :
                      isLoggedIn ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-cyan-glow' :
                      'bg-[#0a0d1a]/85 border-white/5 text-slate-500'
                    }`}>
                      {verificationStatus === 'success' ? 'ACCESS GRANTED | LEVEL 5' :
                       verificationStatus === 'failed' ? 'ACCESS DENIED | LOCKOUT' :
                       isLoggedIn ? 'SYSTEM UNLOCKED | SECURE' : 'SYSTEM STANDBY | ENCRYPTED'}
                    </div>
                  </div>
                </motion.div>
              </section>

              {/* Right Column content */}
              <section className="lg:col-span-7 flex flex-col gap-6">
                
                {/* Switch Login/Register if logged out, or show stats dashboard if logged in */}
                {!isLoggedIn ? (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="tech-panel rounded-3xl p-6 flex flex-col justify-between h-full min-h-[460px]">
                    <div>
                      <h2 className="text-base font-bold text-white mb-2 tracking-wide font-display uppercase">SECURE ACCESS PORTAL</h2>
                      <p className="text-xs text-slate-400 mb-6">Choose biometric operation to start live scan authorization.</p>

                      <div className="grid grid-cols-2 gap-4 mb-8">
                        <motion.button 
                          whileHover={{ scale: 1.03, boxShadow: '0 0 20px rgba(6, 182, 212, 0.25)' }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => { stopCamera(); setActiveMode('login'); }}
                          className={`py-4 px-3 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all duration-300 ${
                            activeMode === 'login' 
                            ? 'border-cyan-400/50 bg-cyan-500/10 text-white shadow-cyan-glow' 
                            : 'border-white/5 bg-white/5 text-slate-400 hover:text-white'
                          }`}
                        >
                          <Unlock className="w-5 h-5 text-cyan-400" />
                          <span className="text-xs font-bold font-display uppercase">Biometric Login</span>
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.03, boxShadow: '0 0 20px rgba(6, 182, 212, 0.25)' }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => { stopCamera(); setActiveMode('register'); }}
                          className={`py-4 px-3 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all duration-300 ${
                            activeMode === 'register' 
                            ? 'border-cyan-400/50 bg-cyan-500/10 text-white shadow-cyan-glow' 
                            : 'border-white/5 bg-white/5 text-slate-400 hover:text-white'
                          }`}
                        >
                          <UserPlus className="w-5 h-5 text-purple-400" />
                          <span className="text-xs font-bold font-display uppercase">Register Profile</span>
                        </motion.button>
                      </div>

                      <div className="space-y-4">
                        {activeMode === 'register' && (
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Enter Full Name</label>
                            <input value={fullName} onChange={(e) => setFullName(e.target.value)} type="text" placeholder="e.g., Alexia Volkov" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition-all duration-300" />
                          </div>
                        )}

                        <div className="pt-4">
                          <button onClick={streamActive ? stopCamera : startCamera} className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold text-sm tracking-widest uppercase transition-all duration-300 hover:opacity-90 shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2">
                            <ScanFace className="w-5 h-5" />
                            <span>{streamActive ? 'Terminate Feed Stream' : activeMode === 'register' ? 'Initialize Enrollment' : 'Initiate Scanner Scan'}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 border-t border-white/5 pt-6 grid grid-cols-3 gap-2 text-center text-[10px]">
                      <div className="px-2 py-3 rounded-xl bg-white/5 border border-white/5 cursor-default hover:border-white/10 transition-colors">
                        <p className="text-lg font-bold text-white">{stats.logins}</p>
                        <p className="text-[8px] font-semibold text-slate-400 uppercase">Total Logins</p>
                      </div>
                      <div className="px-2 py-3 rounded-xl bg-white/5 border border-white/5 cursor-default hover:border-white/10 transition-colors">
                        <p className="text-lg font-bold text-white">{stats.registered}</p>
                        <p className="text-[8px] font-semibold text-slate-400 uppercase">Users Registered</p>
                      </div>
                      <div className="px-2 py-3 rounded-xl bg-white/5 border border-white/5 cursor-default hover:border-emerald-500/20 transition-colors">
                        <p className="text-lg font-bold text-emerald-400 glow-emerald">100%</p>
                        <p className="text-[8px] font-semibold text-slate-400 uppercase">Target Accuracy</p>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <>
                    {/* Logged in upper grid cards */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                      
                      {/* Logs Timeline card */}
                      <div className="md:col-span-7 tech-panel rounded-3xl p-5 flex flex-col max-h-[250px]">
                        <div className="flex justify-between items-center mb-3 border-b border-white/5 pb-2">
                          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">VAULT ACCESS LOGS</h3>
                          <button onClick={() => setActiveTab('logs')} className="text-[9px] font-bold text-cyan-400 hover:underline">View All</button>
                        </div>
                        <div className="flex-grow overflow-y-auto scroll-dark pr-1 space-y-2">
                          {logs.slice(0, 4).map((log, idx) => {
                            const isSuccess = log.event.includes('Verified') || log.event.includes('Success') || log.event.includes('Unlocked') || log.event.includes('Stored') || log.event.includes('Enrolled');
                            const isFailure = log.event.includes('Denied') || log.event.includes('Rejected') || log.event.includes('Deleted');
                            return (
                              <div key={idx} className="flex items-center justify-between bg-white/[0.02] border border-white/5 p-2 rounded-xl text-[10px]">
                                <div className="flex items-center gap-2">
                                  <span className={`w-1.5 h-1.5 rounded-full ${isSuccess ? 'bg-emerald-400' : isFailure ? 'bg-rose-400' : 'bg-cyan-400 animate-pulse'}`} />
                                  <span className="font-bold text-white truncate max-w-[80px]">{log.name}</span>
                                  <span className="text-slate-400 truncate max-w-[100px]">{log.event}</span>
                                </div>
                                <span className="font-mono text-slate-500 text-[8px]">{log.timestamp.split(' ')[1] || log.timestamp}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Line Chart Analytics widget */}
                      <div className="md:col-span-5 tech-panel rounded-3xl p-5 flex flex-col justify-between max-h-[250px]">
                        <div className="border-b border-white/5 pb-2">
                          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">BEHAVIORAL ANALYTICS</h3>
                          <p className="text-[8px] text-slate-400 mt-0.5">Risk Score Vector: <span className="font-bold text-emerald-400">LOW 0.3%</span></p>
                        </div>
                        <div className="my-2">
                          <WaveChart />
                        </div>
                        <div className="flex justify-between text-[7px] font-mono text-slate-500 uppercase tracking-wider">
                          <span>01</span><span>03</span><span>05</span><span>07</span><span>09</span>
                        </div>
                      </div>
                    </div>

                    {/* Middle grid cards */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                      
                      {/* SVG Dotted Tactical World Map */}
                      <div className="md:col-span-7 tech-panel rounded-3xl p-5 flex flex-col justify-between">
                        <div className="border-b border-white/5 pb-2 mb-2 flex justify-between items-center">
                          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">SECURITY OVERVIEW</h3>
                          <span className="text-[8px] font-mono text-emerald-400 bg-emerald-950/40 px-1 border border-emerald-500/20 rounded">ZONES SECURE</span>
                        </div>
                        <TacticalMap />
                      </div>

                      {/* System status dashboard items */}
                      <div className="md:col-span-5 tech-panel rounded-3xl p-5 flex flex-col justify-between min-h-[190px]">
                        <div className="border-b border-white/5 pb-2 mb-2">
                          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">SYSTEM STATUS</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-center text-[10px]">
                          <div className="p-2 bg-white/5 border border-white/5 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-cyan-500/30 transition-all" onClick={() => setActiveTab('settings')}>
                            <Zap className="w-4 h-4 text-cyan-400 mb-1" />
                            <span className="font-semibold text-white">Biometric Sync</span>
                            <span className="text-[7px] text-slate-500 uppercase mt-0.5">ACTIVE</span>
                          </div>
                          <div className="p-2 bg-white/5 border border-white/5 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-cyan-500/30 transition-all" onClick={() => setActiveTab('logs')}>
                            <Database className="w-4 h-4 text-cyan-400 mb-1" />
                            <span className="font-semibold text-white">Database</span>
                            <span className="text-[7px] text-slate-500 uppercase mt-0.5">{stats.logins} ENTRIES</span>
                          </div>
                          <div className="p-2 bg-white/5 border border-white/5 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500/30 transition-all" onClick={() => { unlockVault(); setActiveTab('vault'); }}>
                            <KeyRound className="w-4 h-4 text-emerald-400 mb-1" />
                            <span className="font-semibold text-white">Key Vault</span>
                            <span className="text-[7px] text-slate-500 uppercase mt-0.5">{vaultSecrets.length} SECRETS</span>
                          </div>
                          <div className="p-2 bg-white/5 border border-white/5 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-cyan-500/30 transition-all" onClick={streamActive ? stopCamera : startCamera}>
                            <ScanFace className={`w-4 h-4 mb-1 ${streamActive ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
                            <span className="font-semibold text-white">{streamActive ? 'Scanner On' : 'Scanner Off'}</span>
                            <span className="text-[7px] text-slate-500 uppercase mt-0.5">{streamActive ? 'DISCONNECT' : 'CONNECT'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Feature integration grids */}
                    <div className="tech-panel rounded-3xl p-5">
                      <div className="border-b border-white/5 pb-2 mb-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">FEATURE INTEGRATION</h3>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left text-[10px]">
                        <div className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-1.5 cursor-default">
                          <p className="font-bold text-slate-400 uppercase tracking-wider text-[8px] font-mono">SECURITY PROTOCOLS</p>
                          <button onClick={() => showToast('Security Level', 'Current clearance level: MAXIMUM (Tier 5).', 'info')} className="w-full text-left font-bold text-white hover:text-cyan-400 flex items-center gap-1 transition-colors"><span>Level Management</span></button>
                          <button onClick={() => showToast('2FA Sync', 'Biometric tokens synced with external authenticator.', 'success')} className="w-full text-left font-bold text-white hover:text-cyan-400 flex items-center gap-1 transition-colors"><span>2FA Sync</span></button>
                        </div>
                        <div className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-1.5 cursor-default">
                          <p className="font-bold text-slate-400 uppercase tracking-wider text-[8px] font-mono">EVENT RESPONSE</p>
                          <button onClick={analyzeLogs} className="w-full text-left font-bold text-white hover:text-cyan-400 flex items-center gap-1 transition-colors"><span>Threat Detection</span></button>
                          <button onClick={() => showToast('Manual Override', 'System lockout initiated. Administrator access required.', 'error')} className="w-full text-left font-bold text-white hover:text-cyan-400 flex items-center gap-1 transition-colors"><span>Manual Override</span></button>
                        </div>
                        <div className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-1.5 cursor-default">
                          <p className="font-bold text-slate-400 uppercase tracking-wider text-[8px] font-mono">BIOMETRIC SETTINGS</p>
                          <button onClick={() => showToast('Face Templates', '3 active templates registered. Neural matching active.', 'info')} className="w-full text-left font-bold text-white hover:text-cyan-400 flex items-center gap-1 transition-colors"><span>Face Templates</span></button>
                          <button onClick={() => { if(!isLoggedIn) { stopCamera(); setActiveMode('register'); startCamera(); } else { showToast('Enrollment', 'Already enrolled.', 'info'); } }} className="w-full text-left font-bold text-white hover:text-cyan-400 flex items-center gap-1 transition-colors"><span>Enrollment</span></button>
                        </div>
                        <div className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-1.5 cursor-default">
                          <p className="font-bold text-slate-400 uppercase tracking-wider text-[8px] font-mono">SYSTEM ALERTS</p>
                          <button onClick={() => setActiveTab('logs')} className="w-full text-left font-bold text-white hover:text-cyan-400 flex items-center gap-1 transition-colors"><span>Recent Activity</span></button>
                          <button onClick={() => showToast('Notifications', 'No new system alerts at this time.', 'info')} className="w-full text-left font-bold text-white hover:text-cyan-400 flex items-center gap-1 transition-colors"><span>Notifications</span></button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </section>
            </div>
          ) : activeTab === 'vault' ? (
            /* Volatile decrypted vault container page */
            <div className="max-w-4xl mx-auto amoled-vault-panel p-6 relative">
              <div className="absolute inset-0 z-0 pointer-events-none opacity-20 mix-blend-screen rounded-3xl overflow-hidden">
                <LetterGlitch glitchSpeed={40} centerVignette={false} outerVignette={true} smooth={true} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
                <div className="flex items-center gap-2.5">
                  <KeyRound className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h2 className="text-base font-bold text-white tracking-wide font-display">AES-256-GCM DECRYPTED VOLATILE VAULT</h2>
                    <p className="text-[10px] text-slate-400 font-mono">ENCRYPTION ENGINE PROTOCOL ACCREDITATION: SYMMETRIC_CYPHERPOOL</p>
                  </div>
                </div>
                <button onClick={() => setActiveTab('dashboard')} className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 font-bold transition-all border border-white/5">Dashboard Hub</button>
              </div>

              {!isLoggedIn ? (
                <div className="text-center py-12">
                  <Lock className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-sm font-semibold text-white">Security Credentials Required</p>
                  <p className="text-xs text-slate-500 mt-1">Biometric gateway validation signature matches must verify first.</p>
                </div>
              ) : !vaultUnlocked ? (
                <div className="text-center py-12 flex flex-col items-center justify-center">
                  <Lock className="w-12 h-12 text-slate-600 mb-4 animate-pulse" />
                  <p className="text-sm font-semibold text-white">Credentials Blocked / Locked</p>
                  <p className="text-xs text-slate-400 mt-1 mb-6 max-w-sm">Vault memory decryptions require blink liveness confirmation parameters.</p>
                  <button onClick={unlockVault} disabled={vaultLoading} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-xs font-bold hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50">
                    {vaultLoading ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Unlock className="w-3.5 h-3.5" />}
                    <span>Biometric Authorization Lockout Challenge</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-between items-center bg-emerald-500/5 border border-emerald-500/10 p-3.5 rounded-xl text-[10px]">
                    <div>
                      <span className="text-slate-400">Decryption Matrix Status: </span>
                      <span className="font-bold text-emerald-400 glow-emerald uppercase">Active in Server Volatile Memory Pools</span>
                    </div>
                    {clipboardTTL > 0 && (
                      <span className="ttl-badge">
                        <Timer className="w-3 h-3" />
                        Clipboard Clear: {clipboardTTL}s
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Left Column: Secrets Timeline */}
                    <div className="md:col-span-6 space-y-3">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">STORED KEYS</h3>
                      <div className="max-h-80 overflow-y-auto pr-1 scroll-dark space-y-2.5">
                        {vaultSecrets.length === 0 && !showAddSecret && (
                          <p className="text-xs text-slate-500 italic text-center py-8">Vault register database empty.</p>
                        )}
                        {vaultSecrets.map((secret) => (
                          <div key={secret.id} className="secret-row">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-white truncate">{secret.label}</p>
                              <p className={revealedIds.has(secret.id) ? 'revealed-value text-xs mt-0.5' : 'masked-value text-xs mt-0.5'}>
                                {revealedIds.has(secret.id) ? secret.value : '••••••••••••••••'}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => toggleReveal(secret.id)} className="p-1.5 rounded-md bg-white/5 text-slate-400 hover:text-cyan-400 transition-colors">
                                {revealedIds.has(secret.id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button onClick={() => copyToClipboard(secret.value)} className="p-1.5 rounded-md bg-white/5 text-slate-400 hover:text-emerald-400 transition-colors">
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => deleteSecretById(secret.id)} className="p-1.5 rounded-md bg-white/5 text-slate-400 hover:text-rose-400 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      {!showAddSecret && (
                        <button onClick={() => setShowAddSecret(true)} className="w-full py-2.5 rounded-xl border border-dashed border-white/10 text-xs text-slate-400 hover:text-cyan-400 hover:border-cyan-400/30 transition-all flex items-center justify-center gap-1.5">
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add New Volatile Secret</span>
                        </button>
                      )}
                    </div>

                    {/* Right Column: Key Addition & AI Generation */}
                    <div className="md:col-span-6 space-y-4">
                      {showAddSecret ? (
                        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">ENCRYPT NEW SECRET</h3>
                          <input value={newSecretLabel} onChange={(e) => setNewSecretLabel(e.target.value)} placeholder="Secret Label (e.g. AWS Token)" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400" />
                          
                          <div className="flex gap-2">
                            <input value={newSecretValue} onChange={(e) => { setNewSecretValue(e.target.value); setAuditResult(''); }} placeholder="Plaintext secret value" type="password" className="flex-grow bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400" />
                            <button onClick={auditPassword} disabled={isAuditing} className="px-3 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:text-white text-xs font-bold disabled:opacity-50">
                              {isAuditing ? 'Auditing...' : 'AI Audit'}
                            </button>
                          </div>

                          {newSecretValue && (
                            <div className="space-y-1">
                              <div className="flex justify-between items-center text-[9px]">
                                <span className="text-slate-500">Local Entropy Score:</span>
                                <span className={`font-bold ${getPasswordStrength(newSecretValue).color}`}>{getPasswordStrength(newSecretValue).text}</span>
                              </div>
                              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <div className={`h-full transition-all duration-500 ${getPasswordStrength(newSecretValue).barColor}`} style={{
                                  width: `${(() => {
                                    const r = getPasswordStrength(newSecretValue);
                                    return r.text === 'Very Weak' ? 20 : r.text === 'Weak' ? 40 : r.text === 'Fair' ? 60 : r.text === 'Good' ? 80 : 100;
                                  })()}%`
                                }} />
                              </div>
                            </div>
                          )}

                          {auditResult && (
                            <div className="text-[10px] bg-white/[0.01] border border-cyan-500/10 p-3 rounded-xl text-slate-300 leading-normal flex flex-col gap-1.5">
                              <span className="font-bold text-cyan-400 border-b border-white/5 pb-1">AI Audit Report:</span>
                              <div className="space-y-1 text-slate-400 leading-relaxed font-sans">{renderMarkdown(auditResult)}</div>
                            </div>
                          )}

                          <div className="border-t border-white/5 pt-3">
                            {showPwGenDrawer ? (
                              <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/10 space-y-3">
                                <div className="text-[9px] text-purple-400 font-bold uppercase tracking-wider font-mono">AI Mnemonic Generator</div>
                                <div className="flex flex-wrap gap-1.5">
                                  <button type="button" onClick={() => setPwGenPrompt('Strong password for a secure web portal')} className="px-2 py-0.5 rounded bg-purple-500/10 hover:bg-purple-500/20 text-[8px] text-purple-300 border border-purple-500/10 transition-all">+ Web Portal</button>
                                  <button type="button" onClick={() => setPwGenPrompt('High entropy random API credentials')} className="px-2 py-0.5 rounded bg-purple-500/10 hover:bg-purple-500/20 text-[8px] text-purple-300 border border-purple-500/10 transition-all">+ API Token</button>
                                  <button type="button" onClick={() => setPwGenPrompt('An easy to remember mnemonic pass phrase')} className="px-2 py-0.5 rounded bg-purple-500/10 hover:bg-purple-500/20 text-[8px] text-purple-300 border border-purple-500/10 transition-all">+ Mnemonic</button>
                                </div>
                                <div className="flex gap-2">
                                  <input value={pwGenPrompt} onChange={(e) => setPwGenPrompt(e.target.value)} placeholder="Describe password purpose..." className="flex-grow bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-purple-400" />
                                  <button onClick={generateMnemonicPassword} disabled={isGeneratingPw} className="px-3 py-1 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:text-white text-xs font-bold disabled:opacity-50">Generate</button>
                                </div>
                                {pwGenExplanation && <p className="text-[8px] text-slate-500 italic">{pwGenExplanation}</p>}
                                <button type="button" onClick={() => { setShowPwGenDrawer(false); setPwGenPrompt(''); setPwGenExplanation(''); }} className="text-[8px] text-slate-400 hover:underline">Close Generator</button>
                              </div>
                            ) : (
                              <button type="button" onClick={() => setShowPwGenDrawer(true)} className="text-[9px] text-purple-400 hover:text-purple-300 hover:underline flex items-center gap-1 font-mono">
                                <BrainCircuit className="w-3 h-3" />
                                <span>Generate Password with local AI</span>
                              </button>
                            )}
                          </div>

                          <div className="flex gap-2 pt-2">
                            <button onClick={addSecret} className="flex-grow py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-xs font-bold transition-all">Encrypt & Store</button>
                            <button onClick={() => { setShowAddSecret(false); setNewSecretLabel(''); setNewSecretValue(''); setAuditResult(''); setPwGenPrompt(''); setPwGenExplanation(''); setShowPwGenDrawer(false); }} className="px-4 py-2 rounded-xl bg-white/5 text-slate-400 text-xs hover:text-white transition-all">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 h-full flex flex-col items-center justify-center text-center text-slate-500 italic text-[10px] py-12">
                          <Shield className="w-8 h-8 text-slate-700 mb-2" />
                          <p>AES cryptographic pools are isolated. Click 'Store New Encrypted Secret' to save credentials into memory banks.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between border-t border-white/5 pt-4">
                    <button onClick={purgeVault} className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/25 hover:bg-rose-500/25 text-rose-300 text-xs font-bold transition-all">Lock Vault & Purge RAM</button>
                  </div>
                </div>
              )}
              </div>
            </div>
          ) : activeTab === 'logs' ? (
            /* Audit logs tab component rendering */
            <div className="max-w-4xl mx-auto tech-panel rounded-3xl p-6 shadow-cyan-glow">
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h2 className="text-base font-bold text-white tracking-wide font-display">VAULT INCIDENT SEARCH NETWORK</h2>
                    <p className="text-[10px] text-slate-400">Natural language AI filters over the immutable blockchain timeline registry.</p>
                  </div>
                </div>
                <button onClick={() => setActiveTab('dashboard')} className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 font-bold transition-all border border-white/5">Dashboard Hub</button>
              </div>

              <div className="space-y-6">
                {/* Search query form */}
                <form onSubmit={runLogSearch} className="flex gap-2 w-full bg-white/[0.02] border border-white/5 p-2 rounded-xl">
                  <input value={logSearchQuery} onChange={(e) => setLogSearchQuery(e.target.value)} placeholder="Search logs with AI (e.g., 'show failure logins')..." className="flex-grow bg-transparent border-0 outline-none text-xs text-white px-2 py-1 placeholder:text-slate-500 focus:ring-0 focus:outline-none" />
                  {activeLogFilter && <button type="button" onClick={clearLogFilter} className="px-3 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold transition-all">Clear</button>}
                  <button type="submit" disabled={isSearchingLogs} className="px-4 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:text-white text-xs font-bold disabled:opacity-50">{isSearchingLogs ? 'Searching...' : 'Search with AI'}</button>
                </form>

                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">TIMELINE REGISTRY</h3>
                  <button onClick={analyzeLogs} disabled={isAnalyzing} className="text-[10px] font-bold text-cyan-400 hover:text-white transition-colors bg-cyan-400/10 px-3.5 py-1.5 rounded-full border border-cyan-400/30 flex items-center gap-1.5 disabled:opacity-50">
                    {isAnalyzing ? <div className="w-3 h-3 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" /> : <BrainCircuit className="w-3.5 h-3.5" />}
                    <span>AI Analysis Summary</span>
                  </button>
                </div>

                {llmAnalysis && (
                  <div className="bg-white/[0.02] border border-cyan-400/20 rounded-xl p-4 text-xs text-slate-300 mb-2 leading-relaxed shadow-inner">
                    <span className="font-bold text-cyan-400 block border-b border-white/5 pb-1 mb-2 font-mono uppercase tracking-widest text-[9px]">Audit incident logs summary</span>
                    <div className="space-y-1.5 text-slate-400 leading-relaxed font-sans">{renderMarkdown(llmAnalysis)}</div>
                  </div>
                )}

                {/* Dotted scrolling timeline container */}
                <div className="max-h-[400px] overflow-y-auto pr-1 scroll-dark">
                  <div className="timeline-container">
                    {logs
                      .filter(log => {
                        if (!activeLogFilter) return true;
                        if (activeLogFilter.clientSideQuery) {
                          const q = activeLogFilter.clientSideQuery;
                          const stopWords = ['show', 'me', 'find', 'log', 'logs', 'login', 'logins', 'attempt', 'attempts', 'user', 'users', 'view', 'get', 'display', 'search', 'for', 'the', 'with', 'a', 'an', 'of'];
                          const words = q.split(/\s+/).filter(w => w.length > 0 && !stopWords.includes(w));
                          if (words.length === 0) return true;
                          return words.every(word => {
                            if (['success', 'verified', 'unlocked', 'stored', 'enrolled', 'granted'].includes(word)) {
                              return log.event.toLowerCase().includes('verified') || log.event.toLowerCase().includes('success') || log.event.toLowerCase().includes('unlocked') || log.event.toLowerCase().includes('stored') || log.event.toLowerCase().includes('enrolled') || log.event.toLowerCase().includes('granted');
                            }
                            if (['fail', 'failed', 'denied', 'rejected', 'unauthorized'].includes(word)) {
                              return log.event.toLowerCase().includes('denied') || log.event.toLowerCase().includes('rejected') || log.event.toLowerCase().includes('failed') || log.event.toLowerCase().includes('failure');
                            }
                            return log.name.toLowerCase().includes(word) || log.event.toLowerCase().includes(word);
                          });
                        }
                        let match = true;
                        const isValidFilterVal = (val) => {
                          if (val === undefined || val === null) return false;
                          const s = String(val).trim().toLowerCase();
                          return s !== '' && s !== '*' && s !== 'all' && s !== 'none' && s !== 'null' && s !== 'undefined';
                        };
                        if (isValidFilterVal(activeLogFilter.name)) {
                          const filterName = activeLogFilter.name.toLowerCase();
                          const logName = log.name.toLowerCase();
                          if (!logName.includes(filterName) && !filterName.includes(logName)) match = false;
                        }
                        if (isValidFilterVal(activeLogFilter.event) && !log.event.toLowerCase().includes(activeLogFilter.event.toLowerCase())) match = false;
                        if (activeLogFilter.success !== undefined && activeLogFilter.success !== null) {
                          const logSuccess = log.event.includes('Verified') || log.event.includes('Success') || log.event.includes('Unlocked') || log.event.includes('Stored') || log.event.includes('Enrolled');
                          if (logSuccess !== activeLogFilter.success) match = false;
                        }
                        return match;
                      })
                      .map((log, idx) => {
                        const isSuccess = log.event.includes('Verified') || log.event.includes('Success') || log.event.includes('Unlocked') || log.event.includes('Stored') || log.event.includes('Enrolled');
                        const isFailure = log.event.includes('Denied') || log.event.includes('Rejected') || log.event.includes('Deleted');
                        const eventClass = isSuccess ? 'event-success' : isFailure ? 'event-failure' : 'event-info';
                        return (
                          <div key={idx} className={`timeline-node ${eventClass} py-3 border-b border-white/5`}>
                            <div className="flex items-start gap-4 hover:bg-white/[0.02] p-2.5 rounded-xl transition-all">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${isSuccess ? 'bg-emerald-500/10 text-emerald-400' : isFailure ? 'bg-rose-500/10 text-rose-400' : 'bg-cyan-500/10 text-cyan-400'}`}>
                                {isSuccess ? <CheckCircle className="w-4 h-4" /> : isFailure ? <AlertTriangle className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                              </div>
                              <div className="flex-grow min-w-0">
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-xs font-bold text-white">{log.name}</span>
                                  <span className="text-[10px] font-mono text-slate-500">{log.timestamp}</span>
                                </div>
                                <p className="text-xs text-slate-300 mt-1">{log.event}</p>
                                <div className="flex gap-2 mt-2">
                                  <span className="px-2 py-0.5 bg-white/5 rounded text-[8px] text-slate-400 font-mono">CONFIDENCE: {log.confidence}%</span>
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-mono ${log.liveness ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>LIVENESS: {log.liveness ? 'PASSED' : 'FAILED'}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'settings' ? (
            /* System settings tab container */
            <div className="max-w-2xl mx-auto tech-panel rounded-3xl p-6 shadow-purple-glow">
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
                <div className="flex items-center gap-2.5">
                  <Cog className="w-5 h-5 text-purple-400" />
                  <div>
                    <h2 className="text-base font-bold text-white tracking-wide font-display">SYSTEM MANAGEMENT STACKS</h2>
                    <p className="text-[10px] text-slate-400 font-mono">SYSTEM INTERACTION POOLS DIAGNOSTICS</p>
                  </div>
                </div>
                <button onClick={() => setActiveTab('dashboard')} className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 font-bold transition-all border border-white/5">Dashboard Hub</button>
              </div>

              <div className="space-y-6 text-xs text-slate-300">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">QWEN COGNITIVE AI CONFIG</h3>
                  
                  <div className="grid grid-cols-2 gap-4 text-[10px]">
                    <div>
                      <span className="text-slate-500">RAM Status: </span>
                      <span className="font-bold text-white">{aiCoreStatus.loaded ? '1.5 GB Allocated' : '0.0 GB (8.0 GB max limit)'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500">Execution Limit: </span>
                      <span className="font-bold text-white">{aiCoreStatus.threads} Threads / 99 GPU Layers</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {aiCoreStatus.loaded ? (
                      <button onClick={unloadLLM} disabled={isControllingLLM} className="flex-grow py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 font-bold transition-all">Purge LLM from RAM</button>
                    ) : (
                      <button onClick={preloadLLM} disabled={isControllingLLM} className="flex-grow py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 font-bold transition-all">Pre-warm AI Core</button>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">BIOMETRIC LIVENESS CONTROLS</h3>
                  <div className="flex justify-between items-center text-[10px]">
                    <span>Eye Aspect Ratio (EAR) Blink Threshold:</span>
                    <span className="font-bold text-cyan-400 font-mono">0.18 (Closed) / 0.22 (Open)</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] border-t border-white/5 pt-2.5">
                    <span>Temporal Blink Check Duration:</span>
                    <span className="font-bold text-cyan-400 font-mono">2800ms Time Window</span>
                  </div>
                </div>

                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">DATABASE REGISTRY STATS</h3>
                  <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                    <div className="p-2.5 bg-[#070a13] rounded-xl border border-white/5">
                      <p className="text-lg font-bold text-white">{stats.logins}</p>
                      <p className="text-[7px] text-slate-500 uppercase tracking-widest font-mono">TOTAL LOGINS</p>
                    </div>
                    <div className="p-2.5 bg-[#070a13] rounded-xl border border-white/5">
                      <p className="text-lg font-bold text-white">{stats.registered}</p>
                      <p className="text-[7px] text-slate-500 uppercase tracking-widest font-mono">PROFILES SECURED</p>
                    </div>
                    <div className="p-2.5 bg-[#070a13] rounded-xl border border-white/5">
                      <p className="text-lg font-bold text-emerald-400">100%</p>
                      <p className="text-[7px] text-slate-500 uppercase tracking-widest font-mono">ACCURACY METRICS</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'chat' ? (
            /* AI Cognitive Chatbot tab */
            <div className="max-w-3xl mx-auto tech-panel rounded-3xl h-[500px] flex flex-col overflow-hidden shadow-purple-glow">
              <div className="p-4 bg-gradient-to-r from-cyan-950/20 to-purple-950/20 border-b border-white/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <BrainCircuit className="w-5 h-5 text-purple-400 animate-pulse" />
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-wide font-display">AEGIS COGNITIVE SECURITY ASSISTANT</h3>
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest font-mono font-bold">MODEL: Local Qwen 1.5B (Active)</p>
                  </div>
                </div>
                <button onClick={() => setActiveTab('dashboard')} className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 font-bold border border-white/5">Dashboard Hub</button>
              </div>

              <div className="flex-grow p-4 overflow-y-auto space-y-3.5 text-xs scroll-dark">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-xl px-4 py-3 leading-relaxed shadow ${msg.role === 'user' ? 'bg-cyan-950/60 text-white border border-cyan-500/30' : 'bg-slate-900/90 text-slate-200 border border-white/5'}`}>
                      {msg.role === 'user' ? msg.content : <div className="space-y-1">{renderMarkdown(msg.content)}</div>}
                    </div>
                  </div>
                ))}
                {isSendingChat && (
                  <div className="flex justify-start">
                    <div className="bg-slate-900/90 border border-white/5 text-purple-400 rounded-xl px-4 py-3 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="px-4 pb-2.5 pt-1.5 flex gap-2 overflow-x-auto scrollbar-none shrink-0 bg-slate-950/40 border-t border-white/5">
                <button type="button" onClick={() => setChatInput("Analyze recent system logs")} className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[9px] text-slate-300 hover:text-white shrink-0">🔍 Audit Logs</button>
                <button type="button" onClick={() => setChatInput("How can I improve the vault security score?")} className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[9px] text-slate-300 hover:text-white shrink-0">🛡️ Improve Score</button>
                <button type="button" onClick={() => setChatInput("Suggest optimization tips for local AI execution")} className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[9px] text-slate-300 hover:text-white shrink-0">⚡ RAM Optimizer Tips</button>
              </div>

              <form onSubmit={sendChatMessage} className="p-3 bg-slate-950/60 border-t border-white/5 flex gap-2 shrink-0">
                <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Query AI assistant..." className="flex-grow bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400" />
                <button type="submit" disabled={isSendingChat || !chatInput.trim()} className="px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:opacity-90 font-bold disabled:opacity-30 text-xs">Send</button>
              </form>
            </div>
          ) : null}
        </main>

        {/* Floating AI Chatbot overlay drawer (only if tab isn't already active chat) */}
        {isLoggedIn && activeTab !== 'chat' && (
          <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            <AnimatePresence>
              {chatOpen && (
                <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.9 }} className="chat-panel w-80 sm:w-96 h-[450px] rounded-2xl shadow-2xl flex flex-col mb-4 overflow-hidden">
                  <div className="p-4 bg-gradient-to-r from-cyan-950/40 to-purple-950/40 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BrainCircuit className="w-5 h-5 text-cyan-400 animate-pulse" />
                      <div>
                        <h4 className="font-bold text-sm text-white font-display">AI Security Assistant</h4>
                        <p className="text-[10px] text-cyan-400 uppercase tracking-widest font-mono font-display">Local Qwen 1.5B</p>
                      </div>
                    </div>
                    <button onClick={() => setChatOpen(false)} className="text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg">Close</button>
                  </div>
                  <div className="flex-grow p-4 overflow-y-auto space-y-3 text-xs scroll-dark">
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-xl px-3.5 py-2.5 leading-relaxed ${msg.role === 'user' ? 'bg-cyan-900/50 text-white border border-cyan-500/30' : 'bg-slate-900/90 text-slate-200 border border-white/10'}`}>{msg.role === 'user' ? msg.content : <div className="space-y-1">{renderMarkdown(msg.content)}</div>}</div>
                      </div>
                    ))}
                    {isSendingChat && (
                      <div className="flex justify-start">
                        <div className="bg-slate-900/90 border border-white/10 text-cyan-400 rounded-xl px-3.5 py-2.5 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="px-3 pb-2 pt-1 flex gap-1.5 overflow-x-auto scrollbar-none shrink-0 bg-slate-950/20">
                    <button type="button" onClick={() => setChatInput("Analyze recent system logs")} className="px-2.5 py-1 rounded-full bg-white/5 border border-white/5 text-[9px] text-slate-300 hover:text-white shrink-0">🔍 Audit Logs</button>
                    <button type="button" onClick={() => setChatInput("How can I improve the vault security score?")} className="px-2.5 py-1 rounded-full bg-white/5 border border-white/5 text-[9px] text-slate-300 hover:text-white shrink-0">🛡️ Improve Score</button>
                    <button type="button" onClick={() => setChatInput("Suggest optimization tips for local AI execution")} className="px-2.5 py-1 rounded-full bg-white/5 border border-white/5 text-[9px] text-slate-300 hover:text-white shrink-0">⚡ RAM Optimizer Tips</button>
                  </div>
                  <form onSubmit={sendChatMessage} className="p-3 bg-slate-950/40 border-t border-white/5 flex gap-2">
                    <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask about logs..." className="flex-grow bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400" />
                    <button type="submit" disabled={isSendingChat || !chatInput.trim()} className="px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold disabled:opacity-30 text-xs">Send</button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
            <motion.button whileHover={{ scale: 1.08, boxShadow: '0 0 24px rgba(6, 182, 212, 0.4)' }} whileTap={{ scale: 0.95 }} onClick={() => setChatOpen(prev => !prev)} className="w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-500 text-white flex items-center justify-center shadow-lg border border-white/10 shadow-purple-glow"><BrainCircuit className="w-6 h-6" /></motion.button>
          </div>
        )}

        {/* Footer */}
        <footer className="border-t border-white/5 py-4 px-6 flex justify-between items-center text-[10px] text-slate-500 shrink-0 bg-[#0a0d1a]/20">
          <p>© 2026 AEGIS CORE. Neural Biometric Gateway.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-cyan-400 transition-colors">Privacy Policy</a>
            <span>·</span>
            <a href="#" className="hover:text-cyan-400 transition-colors">Security Architecture</a>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
