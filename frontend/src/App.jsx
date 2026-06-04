import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Info, CheckCircle, XCircle, Unlock, UserPlus,
  ScanFace, Sun, Eye, EyeOff, LogOut,
  KeyRound, Plus, Copy, Trash2, Lock, Timer, BrainCircuit
} from 'lucide-react';
import Aurora from './Aurora';
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


function App() {
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

  // Spotlight GSAP Effect for all Glass Panels
  useEffect(() => {
    const handleMouseMove = (e) => {
      document.querySelectorAll('.glass-panel').forEach((panel) => {
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

  // ── Vault Security: Tab Visibility Purge ──
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

  // ── Vault Security: 2-Minute Idle Timeout ──
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
    setLlmAnalysis("Connecting to Qwen Local LLM... Analyzing logs...");
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
      if (res.ok && data.filter) {
        setActiveLogFilter(data.filter);
        showToast('Logs Filtered', 'AI filtered logs based on search.', 'success');
      } else {
        showToast('Search Failed', 'Could not parse query.', 'error');
      }
    } catch (err) {
      showToast('Network Error', 'Could not reach search API.', 'error');
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
        
        // Start processing frames sequentially
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
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setStreamActive(false);
    setIsProcessing(false);
  };

  // Frame Capture and Vector Processing
  // Offscreen canvas is created once and reused across frames for efficiency
  const captureCanvas = useRef(null);
  const captureCtx = useRef(null);

  const startFrameCapture = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    // Create offscreen canvas once
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

    intervalRef.current = setInterval(async () => {
      if (!videoRef.current || isProcessing) return;

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

            // Score alignment quality (Perfect=3, Tilted=2, Turned=1)
            const score = data.alignment === 'Perfect' ? 3 : data.alignment === 'Face Tilted' ? 2 : data.alignment === 'Face Turned' ? 1 : 0;
            if (score > bestScore) { bestScore = score; bestFrame = base64Image; }

            // Temporal blink detector
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
        setIsProcessing(true);
        setVerificationStatus('scanning');
        clearInterval(intervalRef.current);
        const finalFrame = bestFrame || lastFrame;
        const passedLiveness = localBlinkSuccess || blinkSuccess;
        if (activeMode === 'register') {
          await handleBiometricRegistration(finalFrame, passedLiveness);
        } else {
          await handleBiometricAuthentication(finalFrame, passedLiveness);
        }
      }
    }, 350);
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
    showToast('Session Terminated', 'Securely logged out from vault.', 'info');
  };

  // ── Vault Key-Store Functions ──

  const purgeVault = () => {
    // Overwrite secrets in memory with nulls then clear
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
      // Step 1: Get a challenge
      const challengeRes = await fetch(`${API_BASE}/vault/challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_name: loggedInUser }),
      });
      const challengeData = await challengeRes.json();

      // Step 2: Unlock with challenge
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
        // Re-unlock to refresh the list
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
    <div className="min-h-screen flex flex-col justify-between relative overflow-hidden font-sans selection:bg-cyan-500/30">
      
      {/* Cybernetic Aurora WebGL Background */}
      <Aurora
        colorStops={["#06B6D4", "#8B5CF6", "#06B6D4"]}
        blend={0.5}
        amplitude={1.0}
        speed={0.8}
      />

      {/* Global Toast System */}
      <AnimatePresence>
        {toast.show && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 pointer-events-none"
          >
            <div className="glass-panel flex items-center gap-3 px-5 py-4 rounded-2xl border border-white/10 shadow-2xl">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                toast.type === 'error' ? 'bg-rose-500/20 text-rose-400' : 'bg-cyan-500/20 text-cyan-400'
              }`}>
                {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> :
                 toast.type === 'error' ? <XCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
              </div>
              <div>
                <p className="font-bold text-sm text-white">{toast.title}</p>
                <p className="text-xs text-slate-400">{toast.desc}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="container mx-auto px-6 py-6 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.15)] overflow-hidden border border-white/10">
            <NeuralLogo size={32} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white glow-cyan">AEGIS CORE</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Neural Biometric Gateway</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {!isLoggedIn && (
            <button 
              id="dev-bypass-btn"
              onClick={() => {
                setIsLoggedIn(true);
                setLoggedInUser('DevAdmin');
                showToast('Dev Mode', 'Bypassed biometric check successfully.', 'success');
              }}
              className="px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-xs font-bold text-purple-400 hover:text-white hover:bg-purple-500/20 transition-all cursor-pointer animate-pulse"
            >
              Dev Bypass
            </button>
          )}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Engine Status: Active</span>
          </div>
        </div>
      </header>

      {/* Main Grid View */}
      <main className="container mx-auto px-6 py-8 flex-grow grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left: Video Feed Stream Component */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          <motion.div 
            animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="glass-panel rounded-3xl overflow-hidden p-6 relative flex flex-col items-center justify-center min-h-[460px]"
          >
            {/* Camera feed canvas container */}
            <div className="w-full relative rounded-2xl overflow-hidden bg-black/40 border border-white/5 aspect-video flex items-center justify-center">
              <video 
                ref={videoRef}
                className="w-full h-full object-cover scale-x-[-1]"
                autoPlay 
                playsInline 
                muted
              />

              {/* Processing Cloud Embeddings Overlay */}
              {isProcessing && (
                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 z-20">
                  {/* Face ID Icon Container with Apple style morphing checkmark and shake animation */}
                  <motion.div
                    animate={
                      verificationStatus === 'failed' ? { x: [-10, 10, -10, 10, -5, 5, 0] } : {}
                    }
                    transition={{ duration: 0.5 }}
                    className="mb-6 relative w-20 h-20 flex items-center justify-center"
                  >
                    {verificationStatus === 'scanning' && (
                      <>
                        <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-ping" />
                        <div className="absolute inset-2 rounded-full border border-cyan-400/10 animate-pulse" />
                        <ScanFace className="w-16 h-16 text-cyan-400 animate-pulse" />
                      </>
                    )}
                    {verificationStatus === 'success' && (
                      <motion.div
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400"
                      >
                        <CheckCircle className="w-10 h-10" />
                      </motion.div>
                    )}
                    {verificationStatus === 'failed' && (
                      <motion.div
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center text-rose-400"
                      >
                        <XCircle className="w-10 h-10" />
                      </motion.div>
                    )}
                  </motion.div>

                  <h3 className="text-lg font-bold text-white mb-2 tracking-wide uppercase glow-cyan">
                    {verificationStatus === 'scanning' ? 'Verifying Identity' :
                     verificationStatus === 'success' ? 'Access Granted' : 'Access Denied'}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm">
                    {verificationStatus === 'scanning' ? 'Matching topological face mesh vector coordinates...' :
                     verificationStatus === 'success' ? 'Biometric match success. Decrypting vault keys...' :
                     'Face ID mismatch or liveness verification failed.'}
                  </p>
                </div>
              )}


              {/* Scanning Active overlays */}
              {streamActive && <div className="laser-line" />}

              {streamActive && (
                <div className="absolute inset-8 border-2 border-dashed border-cyan-400/40 rounded-xl pointer-events-none flex items-center justify-center">
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-cyan-400" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-cyan-400" />
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-cyan-400" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-cyan-400" />
                </div>
              )}

              {/* Camera Offline Mock screen */}
              {!streamActive && (
                <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6">
                  <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4 text-cyan-400">
                    <ScanFace className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">SCANNER OFFLINE</h3>
                  <p className="text-xs text-slate-400 max-w-xs">Initiate biometric feed stream to start physiological liveness validation.</p>
                </div>
              )}
            </div>

            {/* Circular Blink / EAR Progress */}
            <div className="w-full mt-4 flex flex-col sm:flex-row items-center justify-between bg-white/5 border border-white/5 rounded-2xl p-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="24" cy="24" r="20" className="stroke-white/10" strokeWidth="3" fill="transparent" />
                    <circle 
                      cx="24" 
                      cy="24" 
                      r="20" 
                      className="stroke-cyan-400 transition-all duration-300" 
                      strokeWidth="3" 
                      fill="transparent" 
                      strokeDasharray="125.6" 
                      strokeDashoffset={125.6 - (blinkProgress / 100) * 125.6} 
                    />
                  </svg>
                  <div className="absolute text-[9px] font-bold text-cyan-400">EAR</div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Liveness Diagnostics</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-400">EAR: <span className="font-mono text-cyan-400 font-bold">{liveEar.toFixed(3)}</span></span>
                    <span className="text-slate-600">|</span>
                    <span className={`text-[10px] font-bold ${
                      alignmentStatus === 'Perfect' ? 'text-emerald-400 animate-pulse' :
                      alignmentStatus === 'No Face' ? 'text-slate-500' : 'text-yellow-400'
                    }`}>
                      {alignmentStatus === 'Perfect' ? 'Optimal Alignment' :
                       alignmentStatus === 'Face Turned' ? 'Center Your Face' :
                       alignmentStatus === 'Face Tilted' ? 'Hold Head Straight' : 'Position Face in Scanner'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 text-right">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  blinkSuccess ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' :
                  'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                }`}>
                  Blinks: {blinkCount}/1
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  alignmentStatus === 'Perfect' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' :
                  'bg-white/5 border border-white/5 text-slate-400'
                }`}>
                  {alignmentStatus === 'Perfect' ? 'Aligned' : 'Aligning'}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Enhancement Status Panel */}
          <div className="glass-panel rounded-2xl p-4 flex justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Algorithmic CLAHE & Gamma</p>
                <p className="text-[10px] text-slate-400">Automatic low-light compensation pipeline</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Status: <span className="text-emerald-400 font-bold">{enhancementStatus}</span></span>
            </div>
          </div>
        </section>

        {/* Right: Interaction Gateway & Dashboard logs */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {!isLoggedIn ? (
              
              /* Auth Panel Screens */
              <motion.div 
                key="auth"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="glass-panel rounded-3xl p-6 flex flex-col justify-between h-full min-h-[460px]"
              >
                <div>
                  <h2 className="text-lg font-bold text-white mb-2 tracking-wide">SECURE ACCESS GATEWAY</h2>
                  <p className="text-xs text-slate-400 mb-6">Choose biometric operation to start live authorization.</p>

                  {/* Mode Selector switches */}
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <motion.button 
                      whileHover={{ scale: 1.04, boxShadow: '0 0 24px rgba(6, 182, 212, 0.25)' }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { stopCamera(); setActiveMode('login'); }}
                      className={`py-4 px-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all duration-300 ${
                        activeMode === 'login' 
                        ? 'border-cyan-400 bg-cyan-400/10 text-white' 
                        : 'border-white/5 bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Unlock className="w-6 h-6" />
                      <span className="text-xs font-bold">Scan / Login</span>
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.04, boxShadow: '0 0 24px rgba(6, 182, 212, 0.25)' }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { stopCamera(); setActiveMode('register'); }}
                      className={`py-4 px-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all duration-300 ${
                        activeMode === 'register' 
                        ? 'border-cyan-400 bg-cyan-400/10 text-white' 
                        : 'border-white/5 bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      <UserPlus className="w-6 h-6" />
                      <span className="text-xs font-bold">Register User</span>
                    </motion.button>
                  </div>

                  {/* Contextual form inputs */}
                  <div className="space-y-4">
                    {activeMode === 'register' && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Enter Full Name</label>
                        <div className="relative">
                          <input 
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            type="text" 
                            placeholder="John Doe" 
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-400 transition-all duration-300"
                          />
                        </div>
                      </div>
                    )}

                    {/* Camera Control Action buttons */}
                    <div className="pt-4">
                      <button 
                        onClick={streamActive ? stopCamera : startCamera}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold text-sm tracking-wider uppercase transition-all duration-300 hover:opacity-90 shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2"
                      >
                        <ScanFace className="w-5 h-5" />
                        <span>{streamActive ? 'Terminate Session' : activeMode === 'register' ? 'Register Biometrics' : 'Initiate Scan'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Micro metrics card */}
                <div className="mt-8 border-t border-white/5 pt-6 grid grid-cols-3 gap-2 text-center">
                  <motion.div 
                    whileHover={{ scale: 1.08, borderColor: 'rgba(6, 182, 212, 0.4)' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="px-2 py-3 rounded-xl bg-white/5 border border-white/5 cursor-default"
                  >
                    <p className="text-xl font-bold text-white">{stats.logins}</p>
                    <p className="text-[8px] font-semibold text-slate-400 uppercase">Logins</p>
                  </motion.div>
                  <motion.div 
                    whileHover={{ scale: 1.08, borderColor: 'rgba(6, 182, 212, 0.4)' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="px-2 py-3 rounded-xl bg-white/5 border border-white/5 cursor-default"
                  >
                    <p className="text-xl font-bold text-white">{stats.registered}</p>
                    <p className="text-[8px] font-semibold text-slate-400 uppercase">Registered</p>
                  </motion.div>
                  <motion.div 
                    whileHover={{ scale: 1.08, borderColor: 'rgba(16, 185, 129, 0.5)' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="px-2 py-3 rounded-xl bg-white/5 border border-white/5 cursor-default"
                  >
                    <p className="text-xl font-bold text-emerald-400 glow-emerald">100%</p>
                    <p className="text-[8px] font-semibold text-slate-400 uppercase">Accuracy</p>
                  </motion.div>
                </div>
              </motion.div>
            ) : (
              
              /* SaaS Dashboard Panel welcome screens */
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                className="glass-panel rounded-3xl p-6 flex flex-col justify-between h-full min-h-[460px]"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <motion.h3 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <GradientText
                          colors={["#06B6D4", "#8B5CF6", "#06B6D4"]}
                          animationSpeed={5}
                          showBorder={false}
                          className="text-xl font-bold tracking-wide cursor-default"
                        >
                          Welcome back, {loggedInUser}!
                        </GradientText>
                      </motion.h3>


                      <p className="text-xs text-slate-400">Security Clearance Level: Standard</p>
                    </div>
                    <button 
                      onClick={logout}
                      className="p-2 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-rose-500 transition-all duration-300"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>

                  {/* AI Proactive Security Audit Banner */}
                  {(() => {
                    const audit = checkSecurityStatus();
                    return (
                      <div className={`mb-5 px-4 py-3 rounded-xl border flex items-center gap-2.5 text-xs transition-all ${
                        audit.status === 'warning'
                          ? 'bg-rose-500/10 border-rose-500/20 text-rose-300 animate-pulse'
                          : 'bg-emerald-500/5 border-emerald-500/10 text-emerald-300'
                      }`}>
                        <div className={`w-2 h-2 rounded-full shrink-0 ${
                          audit.status === 'warning' ? 'bg-rose-400' : 'bg-emerald-400 animate-pulse'
                        }`} />
                        <span className="flex-grow">{audit.message}</span>
                      </div>
                    );
                  })()}

                  {/* AI Engine & RAM Optimizer Card */}
                  {isLoggedIn && (
                    <div className="mb-5 p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BrainCircuit className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Engine & RAM Optimizer</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          aiCoreStatus.loaded 
                            ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400 animate-pulse' 
                            : 'bg-white/5 border-white/10 text-slate-400'
                        }`}>
                          {aiCoreStatus.loaded ? 'ACTIVE / LOADED' : 'STANDBY / IDLE'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className="space-y-0.5">
                          <span className="text-slate-400">RAM Status: </span>
                          <span className="font-bold text-white">
                            {aiCoreStatus.loaded ? '1.5 GB Allocated (8.0 GB Permitted)' : '0.0 GB (8.0 GB Permitted)'}
                          </span>
                        </div>
                        <div className="space-y-0.5 text-right">
                          <span className="text-slate-400">Execution Limit: </span>
                          <span className="font-bold text-white">9 Threads / 85% GPU (No Limits)</span>
                        </div>
                      </div>

                      {aiCoreStatus.loaded && (
                        <div className="text-[10px] bg-cyan-500/5 border border-cyan-500/10 px-3 py-1.5 rounded-lg flex justify-between items-center text-cyan-200">
                          <span>Automatic Auto-Unload:</span>
                          <span className="font-mono font-bold uppercase">
                            {aiCoreStatus.persistent ? 'Disabled (Persistent Mode)' : (() => {
                              const s = aiCoreStatus.idle_time_remaining_seconds;
                              const min = Math.floor(s / 60);
                              const sec = Math.floor(s % 60);
                              return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
                            })()}
                          </span>
                        </div>
                      )}


                      <div className="flex gap-2">
                        {aiCoreStatus.loaded ? (
                          <button
                            onClick={unloadLLM}
                            disabled={isControllingLLM}
                            className="flex-grow py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/25 hover:bg-rose-500/25 text-rose-300 text-[10px] font-bold transition-all disabled:opacity-50"
                          >
                            {isControllingLLM ? 'Reclaiming...' : 'Purge LLM from RAM'}
                          </button>
                        ) : (
                          <button
                            onClick={preloadLLM}
                            disabled={isControllingLLM}
                            className="flex-grow py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/25 hover:bg-cyan-500/25 text-cyan-300 text-[10px] font-bold transition-all disabled:opacity-50"
                          >
                            {isControllingLLM ? 'Preloading...' : 'Pre-warm AI Core'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* AI Security Score Circular Gauge Widget */}
                  {isLoggedIn && (
                    <div className="mb-6 p-5 rounded-2xl border border-white/5 bg-white/[0.01] flex flex-col sm:flex-row items-center gap-6">
                      {/* Circular Progress Gauge */}
                      <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                        {loadingScore ? (
                          <div className="w-10 h-10 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
                        ) : (
                          <>
                            <svg className="w-full h-full transform -rotate-90">
                              <circle cx="48" cy="48" r="40" className="stroke-white/5" strokeWidth="6" fill="transparent" />
                              <circle 
                                cx="48" 
                                cy="48" 
                                r="40" 
                                className={`transition-all duration-1000 ${
                                  securityScore !== null && securityScore >= 80 
                                    ? 'stroke-emerald-400' 
                                    : securityScore !== null && securityScore >= 50 
                                    ? 'stroke-yellow-400' 
                                    : 'stroke-rose-500'
                                }`} 
                                strokeWidth="6" 
                                fill="transparent" 
                                strokeDasharray="251.2" 
                                strokeDashoffset={securityScore !== null ? 251.2 - (securityScore / 100) * 251.2 : 251.2} 
                              />
                            </svg>
                            <div className="absolute flex flex-col items-center justify-center">
                              <span className="text-xl font-black text-white">{securityScore !== null ? securityScore : 'N/A'}</span>
                              <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Quality</span>
                            </div>
                          </>
                        )}
                      </div>
                      
                      {/* Recommendations List */}
                      <div className="flex-grow space-y-2 w-full text-left">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Biometric Health & Security Audit</span>

                          <button 
                            onClick={fetchSecurityScore}
                            disabled={loadingScore}
                            className="text-[9px] font-bold text-cyan-400 hover:underline disabled:opacity-50"
                          >
                            Refresh
                          </button>
                        </div>
                        {securityScoreTips.length > 0 ? (
                          <ul className="space-y-1 list-disc pl-4 text-xs text-slate-300">
                            {securityScoreTips.map((tip, idx) => (
                              <li key={idx} className="leading-relaxed">{tip}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-slate-500 italic">No recommendations yet. Refresh to trigger AI system audit.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Immutable Logs History */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Immutable System Logs</h4>
                      <button 
                        onClick={analyzeLogs}
                        disabled={isAnalyzing}
                        className="text-[10px] font-bold text-cyan-400 hover:text-white transition-colors bg-cyan-400/10 px-3 py-1.5 rounded-full border border-cyan-400/30 flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isAnalyzing ? (
                          <div className="w-3 h-3 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
                        ) : (
                          <BrainCircuit className="w-3.5 h-3.5" />
                        )}
                        AI Analysis
                      </button>
                    </div>

                    {/* Natural Language Log Search Bar */}
                    <form onSubmit={runLogSearch} className="flex gap-2 w-full bg-white/[0.02] border border-white/5 p-2 rounded-xl">
                      <input
                        value={logSearchQuery}
                        onChange={(e) => setLogSearchQuery(e.target.value)}
                        placeholder="Search logs with AI (e.g. 'show Jerome Prince success logins')..."
                        className="flex-grow bg-transparent border-0 outline-none text-xs text-white px-2 py-1 placeholder:text-slate-500 focus:ring-0 focus:outline-none"
                      />
                      {activeLogFilter && (
                        <button 
                          type="button"
                          onClick={clearLogFilter}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:text-white text-[10px] font-bold transition-all"
                        >
                          Clear
                        </button>
                      )}
                      <button 
                        type="submit"
                        disabled={isSearchingLogs}
                        className="px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:text-white text-[10px] font-bold transition-all disabled:opacity-50"
                      >
                        {isSearchingLogs ? 'Searching...' : 'Ask AI'}
                      </button>
                    </form>
                    
                    {llmAnalysis && (
                      <div className="bg-white/[0.03] border border-cyan-400/20 rounded-xl p-4 text-xs text-slate-300 mb-2 whitespace-pre-wrap leading-relaxed shadow-inner shadow-cyan-500/5">
                        {llmAnalysis}
                      </div>
                    )}

                    <div className="max-h-64 overflow-y-auto pr-1 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="sticky top-0 bg-[#0c101d] z-10 border-b border-white/10">
                          <tr className="text-slate-400">
                            <th className="py-2 font-semibold">Timestamp</th>
                            <th className="py-2 font-semibold">Event</th>
                            <th className="py-2 font-semibold text-right">Confidence</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-slate-300">
                          {logs
                            .filter(log => {
                              if (!activeLogFilter) return true;
                              let match = true;
                              const isValidFilterVal = (val) => {
                                if (val === undefined || val === null) return false;
                                const s = String(val).trim().toLowerCase();
                                return s !== '' && s !== '*' && s !== 'all' && s !== 'none' && s !== 'null' && s !== 'undefined';
                              };

                              if (isValidFilterVal(activeLogFilter.name) && !log.name.toLowerCase().includes(activeLogFilter.name.toLowerCase())) {
                                match = false;
                              }
                              if (isValidFilterVal(activeLogFilter.event) && !log.event.toLowerCase().includes(activeLogFilter.event.toLowerCase())) {
                                match = false;
                              }
                              if (activeLogFilter.success !== undefined && activeLogFilter.success !== null) {
                                const logSuccess = log.event.includes('Verified') || log.event.includes('Success');
                                if (logSuccess !== activeLogFilter.success) {
                                  match = false;
                                }
                              }
                              return match;
                            })
                            .map((log, idx) => (
                              <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-all duration-300">
                              <td className="py-3 font-mono text-[10px] text-slate-400">{log.timestamp}</td>
                              <td className="py-3">
                                <div className="flex flex-col">
                                  <span className="font-bold text-white">{log.name}</span>
                                  <span className="text-[10px] text-slate-400">{log.event}</span>
                                </div>
                              </td>
                              <td className={`py-3 text-right font-bold ${log.liveness ? 'text-emerald-400 glow-emerald' : 'text-rose-400'}`}>
                                {log.confidence}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ══════ Encrypted Key-Store Vault ══════ */}
                  <div className={`mt-6 p-5 rounded-2xl border ${vaultUnlocked ? 'vault-unlocked' : 'vault-locked'} bg-white/[0.02]`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <KeyRound className={`w-4 h-4 ${vaultUnlocked ? 'text-emerald-400' : 'text-slate-400'}`} />
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Encrypted Key-Store</h4>
                        {vaultUnlocked && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">LIVE</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {clipboardTTL > 0 && (
                          <span className="ttl-badge">
                            <Timer className="w-3 h-3" />
                            {clipboardTTL}s
                          </span>
                        )}
                        {vaultUnlocked ? (
                          <button onClick={purgeVault} className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-slate-400 hover:text-rose-400 transition-all" title="Lock Vault">
                            <Lock className="w-4 h-4" />
                          </button>
                        ) : (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={unlockVault}
                            disabled={vaultLoading}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/20 text-xs font-bold text-cyan-400 hover:text-white transition-all disabled:opacity-50"
                          >
                            {vaultLoading ? (
                              <div className="w-3 h-3 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
                            ) : (
                              <Unlock className="w-3 h-3" />
                            )}
                            Unlock
                          </motion.button>
                        )}
                      </div>
                    </div>

                    {!vaultUnlocked ? (
                      <div className="text-center py-6">
                        <Lock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-xs text-slate-500">Vault is locked. Biometric challenge required to decrypt secrets.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {vaultSecrets.length === 0 && !showAddSecret && (
                          <p className="text-xs text-slate-500 text-center py-4">No secrets stored yet. Add your first secret below.</p>
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
                              <button onClick={() => toggleReveal(secret.id)} className="p-1.5 rounded-md bg-white/5 text-slate-400 hover:text-cyan-400 transition-colors" title={revealedIds.has(secret.id) ? 'Hide' : 'Reveal'}>
                                {revealedIds.has(secret.id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button onClick={() => copyToClipboard(secret.value)} className="p-1.5 rounded-md bg-white/5 text-slate-400 hover:text-emerald-400 transition-colors" title="Copy (15s TTL)">
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => deleteSecretById(secret.id)} className="p-1.5 rounded-md bg-white/5 text-slate-400 hover:text-rose-400 transition-colors" title="Delete">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}

                        {showAddSecret ? (
                          <div className="mt-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
                            <input
                              value={newSecretLabel}
                              onChange={(e) => setNewSecretLabel(e.target.value)}
                              placeholder="Label (e.g. GitHub Token)"
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 transition-all"
                            />
                            <div className="flex gap-2">
                              <input
                                value={newSecretValue}
                                onChange={(e) => { setNewSecretValue(e.target.value); setAuditResult(''); }}
                                placeholder="Secret value (password/key)"
                                type="password"
                                className="flex-grow bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 transition-all"
                              />
                              <button 
                                onClick={auditPassword}
                                disabled={isAuditing}
                                type="button"
                                className="px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:text-white text-xs font-bold transition-all disabled:opacity-50"
                              >
                                {isAuditing ? 'Auditing...' : 'AI Audit'}
                              </button>
                            </div>

                            {/* Client-side Strength Meter */}
                            {newSecretValue && (
                              <div className="space-y-1">
                                <div className="flex justify-between items-center text-[9px]">
                                  <span className="text-slate-500">Local Strength Check:</span>
                                  <span className={`font-bold ${(() => {
                                    const rating = getPasswordStrength(newSecretValue);
                                    return rating.color;
                                  })()}`}>
                                    {(() => {
                                      const rating = getPasswordStrength(newSecretValue);
                                      return rating.text;
                                    })()}
                                  </span>
                                </div>
                                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full transition-all duration-500 ${(() => {
                                      const rating = getPasswordStrength(newSecretValue);
                                      return rating.barColor;
                                    })()}`}
                                    style={{
                                      width: `${(() => {
                                        const rating = getPasswordStrength(newSecretValue);
                                        const score = rating.text === 'Very Weak' ? 20 :
                                                      rating.text === 'Weak' ? 40 :
                                                      rating.text === 'Fair' ? 60 :
                                                      rating.text === 'Good' ? 80 : 100;
                                        return score;
                                      })()}%`
                                    }}
                                  />
                                </div>
                              </div>
                            )}

                            {auditResult && (
                              <div className="text-[10px] bg-white/[0.02] border border-cyan-500/10 p-2.5 rounded-lg text-slate-400 leading-relaxed whitespace-pre-wrap">
                                <span className="font-bold text-cyan-400">AI Audit: </span>
                                {auditResult}
                              </div>
                            )}

                            {/* AI Password Generator Drawer */}
                            <div className="pt-1">
                              {showPwGenDrawer ? (
                                <div className="p-2.5 rounded-lg bg-purple-500/5 border border-purple-500/10 space-y-2.5">
                                  <div className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">AI Passphrase Generator</div>
                                  
                                  {/* Quick Preset Chips */}
                                  <div className="flex flex-wrap gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setPwGenPrompt('Strong password for a secure web portal')}
                                      className="px-2 py-0.5 rounded-md bg-purple-500/10 hover:bg-purple-500/20 text-[9px] text-purple-300 border border-purple-500/10 transition-all"
                                    >
                                      + Web Portal
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setPwGenPrompt('High entropy random API credentials')}
                                      className="px-2 py-0.5 rounded-md bg-purple-500/10 hover:bg-purple-500/20 text-[9px] text-purple-300 border border-purple-500/10 transition-all"
                                    >
                                      + API Token
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setPwGenPrompt('An easy to remember mnemonic pass phrase')}
                                      className="px-2 py-0.5 rounded-md bg-purple-500/10 hover:bg-purple-500/20 text-[9px] text-purple-300 border border-purple-500/10 transition-all"
                                    >
                                      + Mnemonic
                                    </button>
                                  </div>

                                  <div className="flex gap-2">
                                    <input
                                      value={pwGenPrompt}
                                      onChange={(e) => setPwGenPrompt(e.target.value)}
                                      placeholder="Describe purpose (or choose preset)..."
                                      className="flex-grow bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-400 transition-all"
                                    />
                                    <button 
                                      onClick={generateMnemonicPassword}
                                      disabled={isGeneratingPw}
                                      type="button"
                                      className="px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:text-white text-xs font-bold transition-all disabled:opacity-50"
                                    >
                                      {isGeneratingPw ? 'Generating...' : 'Generate'}
                                    </button>
                                  </div>
                                  {pwGenExplanation && (
                                    <div className="text-[9px] text-slate-500 leading-normal italic">
                                      {pwGenExplanation}
                                    </div>
                                  )}
                                  <button 
                                    type="button" 
                                    onClick={() => { setShowPwGenDrawer(false); setPwGenPrompt(''); setPwGenExplanation(''); }}
                                    className="text-[9px] text-slate-400 hover:underline"
                                  >
                                    Close Generator
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  type="button"
                                  onClick={() => setShowPwGenDrawer(true)}
                                  className="text-[10px] text-purple-400 hover:text-purple-300 hover:underline flex items-center gap-1"
                                >
                                  <BrainCircuit className="w-3.5 h-3.5" />
                                  <span>Generate Secure Password with Local AI</span>
                                </button>
                              )}
                            </div>

                            <div className="flex gap-2">
                              <button onClick={addSecret} className="flex-1 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-xs font-bold hover:opacity-90 transition-all">
                                Encrypt & Store
                              </button>
                              <button onClick={() => { setShowAddSecret(false); setNewSecretLabel(''); setNewSecretValue(''); setAuditResult(''); setPwGenPrompt(''); setPwGenExplanation(''); setShowPwGenDrawer(false); }} className="px-3 py-2 rounded-lg bg-white/5 text-slate-400 text-xs hover:text-white transition-all">
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowAddSecret(true)}
                            className="w-full mt-2 py-2 rounded-lg border border-dashed border-white/10 text-xs text-slate-400 hover:text-cyan-400 hover:border-cyan-400/30 transition-all flex items-center justify-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Secret
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 px-8 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-4">
        <p>© 2026 AEGIS CORE. Neural Biometric Gateway.</p>
        <div className="flex gap-4">
          <a href="#" className="hover:text-cyan-400 transition-colors">Privacy Policy</a>
          <span>·</span>
          <a href="#" className="hover:text-cyan-400 transition-colors">Security Architecture</a>
        </div>
      </footer>

      {/* Floating AI Security Assistant Chatbot */}
      {isLoggedIn && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
          <AnimatePresence>
            {chatOpen && (
              <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.9 }}
                className="glass-panel w-80 sm:w-96 h-[450px] rounded-2xl border border-white/10 shadow-2xl flex flex-col mb-4 overflow-hidden"
              >
                {/* Chat Header */}
                <div className="p-4 bg-gradient-to-r from-cyan-950/40 to-purple-950/40 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-cyan-400 animate-pulse" />
                    <div>
                      <h4 className="font-bold text-sm text-white">AI Security Assistant</h4>
                      <p className="text-[10px] text-cyan-400 uppercase tracking-widest font-mono">Local Qwen 1.5B</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setChatOpen(false)}
                    className="text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg transition-all"
                  >
                    Close
                  </button>
                </div>

                {/* Messages Body */}
                <div className="flex-grow p-4 overflow-y-auto space-y-3 text-xs scrollbar-thin scrollbar-thumb-white/5">
                  {chatMessages.map((msg, idx) => (
                    <div 
                      key={idx} 
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] rounded-xl px-3.5 py-2.5 leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-cyan-500/20 text-cyan-100 border border-cyan-500/20' 
                          : 'bg-white/5 text-slate-300 border border-white/5'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isSendingChat && (
                    <div className="flex justify-start">
                      <div className="bg-white/5 border border-white/5 text-slate-400 rounded-xl px-3.5 py-2.5 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Quick Action Prompt Chips */}
                <div className="px-3 pb-2 pt-1 flex gap-1.5 overflow-x-auto scrollbar-none shrink-0 bg-slate-950/20">
                  <button
                    type="button"
                    onClick={() => setChatInput("Analyze recent system logs")}
                    className="px-2.5 py-1 rounded-full bg-white/5 border border-white/5 text-[9px] text-slate-300 hover:text-white hover:bg-white/10 shrink-0 transition-all"
                  >
                    🔍 Audit Logs
                  </button>
                  <button
                    type="button"
                    onClick={() => setChatInput("How can I improve the vault security score?")}
                    className="px-2.5 py-1 rounded-full bg-white/5 border border-white/5 text-[9px] text-slate-300 hover:text-white hover:bg-white/10 shrink-0 transition-all"
                  >
                    🛡️ Improve Score
                  </button>
                  <button
                    type="button"
                    onClick={() => setChatInput("Suggest optimization tips for local AI execution")}
                    className="px-2.5 py-1 rounded-full bg-white/5 border border-white/5 text-[9px] text-slate-300 hover:text-white hover:bg-white/10 shrink-0 transition-all"
                  >
                    ⚡ RAM Optimizer Tips
                  </button>
                </div>

                {/* Chat Input Footer */}
                <form 
                  onSubmit={sendChatMessage}
                  className="p-3 bg-slate-950/40 border-t border-white/5 flex gap-2"
                >
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about logs, security suggestions..."
                    className="flex-grow bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 transition-all"
                  />
                  <button 
                    type="submit"
                    disabled={isSendingChat || !chatInput.trim()}
                    className="px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:opacity-90 transition-all font-bold disabled:opacity-30"
                  >
                    Send
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Toggle Button */}
          <motion.button
            whileHover={{ scale: 1.08, boxShadow: '0 0 24px rgba(6, 182, 212, 0.4)' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setChatOpen(prev => !prev)}
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-500 text-white flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-white/10"
          >
            <BrainCircuit className="w-6 h-6" />
          </motion.button>
        </div>
      )}

    </div>
  );
}

export default App;
