'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import {
  MessageSquare,
  Monitor,
  Brain,
  Sprout,
  Zap,
  Flame,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  SkipForward,
  Square,
  Clock,
  Target,
  XCircle,
  Bot,
} from 'lucide-react';
import { saveInterview } from '@/lib/interview-store';
import type { InterviewRecord } from '@/lib/interview-store';
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';

const TypewriterText = ({ text }: { text: string }) => {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    let i = 0;
    setDisplayed('');
    const timer = setInterval(() => {
      setDisplayed(text.substring(0, i));
      i++;
      if (i > text.length) clearInterval(timer);
    }, 30);
    return () => clearInterval(timer);
  }, [text]);
  return <>{displayed}</>;
};

const questions = [
  'Tell me about yourself and why you chose this role.',
  'Walk me through a time you handled a tight deadline. What was the result?',
  'Describe a conflict in a team project and how you resolved it.',
  "What's your biggest weakness, and what are you doing about it?",
  'Why should we hire you over other candidates with similar profiles?',
  'Where do you see yourself in five years?',
  'Do you have any questions for me?',
];

const interviewTypes = [
  { id: 'hr', label: 'HR Round', icon: MessageSquare, sub: 'Soft skills & fit' },
  { id: 'tech', label: 'Technical', icon: Monitor, sub: 'Domain knowledge' },
  { id: 'behav', label: 'Behavioral', icon: Brain, sub: 'STAR responses' },
];

const difficulties = [
  { id: 'fresher', label: 'Fresher', icon: Sprout, sub: '0-1 years' },
  { id: 'mid', label: 'Intermediate', icon: Zap, sub: '2-5 years' },
  { id: 'adv', label: 'Advanced', icon: Flame, sub: '5+ years' },
];

const roles = [
  'Product Manager',
  'Frontend Developer',
  'Data Analyst',
  'Business Analyst',
  'Marketing Associate',
  'Management Trainee',
  'Custom Job Description',
];

const industries = [
  'Technology / Software',
  'Finance & Banking',
  'Healthcare',
  'E-commerce & Retail',
  'Manufacturing',
  'Consulting',
  'Other'
];

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

// Auto-advance silence timeout in ms
const SILENCE_TIMEOUT_MS = 8000;

export default function InterviewPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Setup state
  const [inRoom, setInRoom] = useState(false);
  const [selectedType, setSelectedType] = useState('hr');
  const [selectedDiff, setSelectedDiff] = useState('mid');
  const [selectedRole, setSelectedRole] = useState('Product Manager');
  const [customJD, setCustomJD] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState('');
  const [demoStrikes, setDemoStrikes] = useState(0);

  // Room state
  const [seconds, setSeconds] = useState(0);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [transcript, setTranscript] = useState<{ who: 'ai' | 'me'; text: string }[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // AI features state

  const [showSetup, setShowSetup] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [tabWarning, setTabWarning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [ariaSpeaking, setAriaSpeaking] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [micActive, setMicActive] = useState(true);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  // HeyGen state
  const [heygenSessionId, setHeygenSessionId] = useState<string | null>(null);
  const [heygenStreamUrl, setHeygenStreamUrl] = useState<string | null>(null);
  const [heygenReady, setHeygenReady] = useState(false);

  // Refs for cleanup
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dgSocketRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heygenVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const questionIdxRef = useRef(questionIdx);
  const faceDetectorRef = useRef<FaceDetector | null>(null);
  const detectionLoopRef = useRef<number | null>(null);
  const micActiveRef = useRef(micActive);
  const inRoomRef = useRef(inRoom);
  const transcriptRef2 = useRef(transcript);
  const secondsRef = useRef(seconds);
  const selectedTypeRef = useRef(selectedType);
  const selectedRoleRef = useRef(selectedRole);
  const selectedDiffRef = useRef(selectedDiff);
  const customJDRef = useRef(customJD);
  const selectedIndustryRef = useRef(selectedIndustry);
  const resumeTextRef = useRef(resumeText);
  const speakQuestionRef = useRef<((t: string) => Promise<void>) | null>(null);

  // Keep refs in sync
  useEffect(() => { questionIdxRef.current = questionIdx; }, [questionIdx]);
  useEffect(() => { micActiveRef.current = micActive; }, [micActive]);
  useEffect(() => { inRoomRef.current = inRoom; }, [inRoom]);
  useEffect(() => { transcriptRef2.current = transcript; }, [transcript]);
  useEffect(() => { secondsRef.current = seconds; }, [seconds]);
  useEffect(() => { selectedTypeRef.current = selectedType; }, [selectedType]);
  useEffect(() => { selectedRoleRef.current = selectedRole; }, [selectedRole]);
  useEffect(() => { selectedDiffRef.current = selectedDiff; }, [selectedDiff]);
  useEffect(() => { customJDRef.current = customJD; }, [customJD]);
  useEffect(() => { selectedIndustryRef.current = selectedIndustry; }, [selectedIndustry]);
  useEffect(() => { resumeTextRef.current = resumeText; }, [resumeText]);

  // Timer
  useEffect(() => {
    if (inRoom) {
      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [inRoom]);

  // Scroll transcript
  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' });
  }, [transcript, liveTranscript]);

  // ─── Deepgram TTS ───
  const speakWithTTS = useCallback(async (text: string) => {
    setAriaSpeaking(true);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'TTS request failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setAriaSpeaking(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setAriaSpeaking(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };

      await audio.play();
    } catch (error: any) {
      console.warn("Deepgram TTS failed, falling back to native browser voice:", error.message);
      toast("Deepgram TTS failed. Falling back to native browser voice.");
      
      // Fallback to browser's native speech synthesis if Deepgram fails
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        
        // Try to find a female English voice
        const voices = window.speechSynthesis.getVoices();
        const femaleVoice = voices.find(v => v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Google US English'));
        if (femaleVoice) utterance.voice = femaleVoice;

        utterance.onend = () => setAriaSpeaking(false);
        utterance.onerror = () => setAriaSpeaking(false);
        window.speechSynthesis.speak(utterance);
      } else {
        setAriaSpeaking(false);
      }
    }
  }, [toast]);

  // ─── HeyGen: speak via avatar ───
  const speakWithHeygen = useCallback(async (text: string) => {
    if (!heygenSessionId) return false;
    try {
      const res = await fetch('/api/heygen/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: heygenSessionId, text }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, [heygenSessionId]);

  // Combined speak function: try HeyGen first, fall back to ElevenLabs TTS
  const speakQuestion = useCallback(async (text: string) => {
    if (heygenReady && heygenSessionId) {
      const ok = await speakWithHeygen(text);
      if (ok) {
        setAriaSpeaking(true);
        // HeyGen handles its own audio; set a timeout to reset speaking state
        setTimeout(() => setAriaSpeaking(false), Math.max(3000, text.length * 80));
        return;
      }
    }
    // Fall back to Deepgram TTS
    await speakWithTTS(text);
  }, [heygenReady, heygenSessionId, speakWithHeygen, speakWithTTS]);

  useEffect(() => { speakQuestionRef.current = speakQuestion; }, [speakQuestion]);

  // ─── HeyGen: create streaming session ───
  const initHeygen = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch('/api/heygen', { method: 'POST' });
      if (!res.ok) throw new Error('HeyGen session failed');
      const data = await res.json();
      if (data.session_id) {
        setHeygenSessionId(data.session_id);
        if (data.stream_url) {
          setHeygenStreamUrl(data.stream_url);
        }
        setHeygenReady(true);
      }
    } catch {
      // HeyGen unavailable — fall back to Bot icon + TTS
      setHeygenReady(false);
    }
  }, []);

  // ─── HeyGen: stop session ───
  const stopHeygen = useCallback(async () => {
    if (!heygenSessionId) return;
    try {
      await fetch('/api/heygen/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: heygenSessionId }),
      });
    } catch {
      // ignore
    }
    setHeygenSessionId(null);
    setHeygenReady(false);
    setHeygenStreamUrl(null);
  }, [heygenSessionId]);

  // ─── HeyGen: attach video stream ───
  useEffect(() => {
    if (heygenStreamUrl && heygenVideoRef.current) {
      heygenVideoRef.current.src = heygenStreamUrl;
      heygenVideoRef.current.play().catch(() => {});
    }
  }, [heygenStreamUrl]);

  // Auto-advance helper — only advances between questions, never ends the interview
  const autoAdvance = useCallback(async () => {
    const currentTranscript = transcriptRef2.current;
    setIsThinking(true);
    try {
      const diffLabel = difficulties.find(d => d.id === selectedDiffRef.current)?.label || 'Intermediate';
      const res = await fetch('/api/interview/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: currentTranscript,
          role: selectedRoleRef.current,
          difficulty: diffLabel,
          customJD: customJDRef.current,
          resumeText: resumeTextRef.current
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.reply) {
          setTranscript((t) => [...t, { who: 'ai', text: data.reply }]);
          setQuestionIdx((q) => q + 1); // increment count
          setLiveTranscript('');
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          if (speakQuestionRef.current) speakQuestionRef.current(data.reply);
        }
      }
    } catch(e) {
      console.error(e);
    } finally {
      setIsThinking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── End Interview with cleanup ───
  const endInterviewCleanup = useCallback(async () => {
    // Stop timer
    if (timerRef.current) clearInterval(timerRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (dgSocketRef.current && dgSocketRef.current.readyState === WebSocket.OPEN) dgSocketRef.current.close();
    dgSocketRef.current = null;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
    mediaRecorderRef.current = null;
    if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach((track) => track.stop()); }
    mediaStreamRef.current = null;
    if (cameraStreamRef.current) { cameraStreamRef.current.getTracks().forEach((track) => track.stop()); }
    cameraStreamRef.current = null;

    if (videoRecorderRef.current && videoRecorderRef.current.state !== 'inactive') {
      videoRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `Interview_Recording_${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      };
      videoRecorderRef.current.stop();
    }

    stopHeygen();

    const currentTranscript = transcriptRef2.current;
    const currentSeconds = secondsRef.current;
    const currentQuestionIdx = questionIdxRef.current;
    const currentType = selectedTypeRef.current;
    const currentRole = selectedRoleRef.current;
    const currentDiff = selectedDiffRef.current;

    const typeLabel = interviewTypes.find((t) => t.id === currentType)?.label ?? 'HR Round';
    const diffLabel = difficulties.find((d) => d.id === currentDiff)?.label ?? 'Intermediate';
    const questionsAsked = currentQuestionIdx + 1;

    try {
      setIsThinking(true);
      const res = await fetch('/api/interview/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: currentTranscript,
          role: currentRole,
          difficulty: diffLabel,
        }),
      });

      let score = 70;
      let metrics = {
        communication: 8, confidence: 8, clarity: 8, bodyLanguage: 8, eyeContact: 8,
        appearance: 8, posture: 8, technicalKnowledge: 8, problemSolving: 8, leadership: 8,
      };
      let feedback = { strengths: 'Good effort.', improvements: 'Keep practicing.', nextStep: 'Do more interviews.' };

      if (res.ok) {
        const data = await res.json();
        score = data.score || score;
        metrics = data.metrics || metrics;
        feedback = data.feedback || feedback;
      }

      const interviewId = `iv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const record: InterviewRecord = {
        id: interviewId,
        type: typeLabel,
        role: currentRole,
        difficulty: diffLabel,
        date: new Date().toISOString(),
        duration: currentSeconds,
        questionsCount: questionsAsked,
        score,
        transcript: currentTranscript,
        metrics,
        feedback,
      };

      saveInterview(record);
      setTimeout(() => {
        router.push(`/dashboard/analysis?id=${interviewId}`);
      }, 500);
    } catch(err) {
      setIsThinking(false);
    }
  }, [stopHeygen, router]);

  // ─── Deepgram STT ───
  const initDeepgram = useCallback(async () => {
    try {
      // Get API key
      const tokenRes = await fetch('/api/stt/token');
      if (!tokenRes.ok) throw new Error('Failed to get Deepgram token');
      const { key } = await tokenRes.json();

      // Get mic access
      let stream = mediaStreamRef.current;
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
      }

      // Audio analyser for wave
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          const analyser = audioCtx.createAnalyser();
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);
          analyser.fftSize = 256;
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          
          let wasSpeaking = false;
          const checkVolume = () => {
            if (!micActiveRef.current) {
              if (wasSpeaking) {
                setUserSpeaking(false);
                wasSpeaking = false;
              }
            } else {
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
              const avg = sum / dataArray.length;
              const isSpeaking = avg > 5;
              if (isSpeaking !== wasSpeaking) {
                setUserSpeaking(isSpeaking);
                wasSpeaking = isSpeaking;
              }
            }
            if (dgSocketRef.current) {
              requestAnimationFrame(checkVolume);
            }
          };
          checkVolume();
        }
      } catch (e) {
        console.error('Audio analyzer error', e);
      }

      // Connect to Deepgram WebSocket
      const dgUrl = `wss://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&language=en`;
      const socket = new WebSocket(dgUrl, ['token', key]);
      dgSocketRef.current = socket;

      socket.onopen = () => {
        // Start streaming audio via MediaRecorder using only audio tracks to avoid mimeType mismatch
        const audioStream = new MediaStream(stream.getAudioTracks());
        const recorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0 && socket.readyState === WebSocket.OPEN && micActiveRef.current) {
            socket.send(event.data);
          }
        };

        recorder.start(250); // Send chunks every 250ms
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const alt = data?.channel?.alternatives?.[0];
          if (!alt) return;

          const text = alt.transcript || '';
          const isFinal = data.is_final;

          if (text) {
            if (isFinal) {
              // Final transcript — add to transcript panel
              setTranscript((t) => {
                const last = t[t.length - 1];
                if (last && last.who === 'me') {
                  return [...t.slice(0, -1), { who: 'me', text: last.text + ' ' + text }];
                }
                return [...t, { who: 'me', text }];
              });
              setLiveTranscript('');
              // Reset silence timer for auto-advance
              if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = setTimeout(() => {
                // Auto-advance after silence
                if (inRoomRef.current) {
                  autoAdvance();
                }
              }, SILENCE_TIMEOUT_MS);
            } else {
              // Interim transcript — show live
              setLiveTranscript(text);
            }
          }
        } catch {
          // Ignore parse errors
        }
      };

      socket.onerror = () => {
        toast('Speech recognition encountered an error. You can still use the Next button.');
      };

      socket.onclose = () => {
        // Cleanup recorder if socket closes
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      };
    } catch (err) {
      toast('Could not access microphone. Please check permissions.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);


  // Push initial AI question + speak it when entering room or advancing question
  useEffect(() => {
    if (inRoom && transcriptRef2.current.length === 0) {
      autoAdvance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inRoom]);

  // ─── Start Interview ───
  const startInterview = async () => {
    if (!selectedType || !selectedDiff || !selectedRole) {
      toast('Please complete all selections before starting.');
      return;
    }
    if (!resumeFile) {
      toast('Please upload your resume to personalize the interview.');
      return;
    }
    setShowSetup(true);
  };

  const handleJoinAfterSetup = async () => {
    setShowSetup(false);
    setConnecting(true);

    if (resumeFile) {
      try {
        const formData = new FormData();
        formData.append('file', resumeFile);
        const res = await fetch('/api/resume/extract', { method: 'POST', body: formData });
        if (res.ok) {
          const { text } = await res.json();
          if (text) setResumeText(text);
        }
      } catch(e) {
        console.error('Resume extract error', e);
      }
    }

    // Initialize HeyGen (non-blocking)
    initHeygen();

    // Show "Connecting..." for 2 seconds before entering room
    setTimeout(() => {
      setConnecting(false);
      setInRoom(true);
    }, 2000);
  };

  // Initialize Deepgram when entering room
  useEffect(() => {
    if (inRoom) {
      initDeepgram();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inRoom]);

  // ─── Advance Question ───
  const advanceQuestion = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    if (questionIdx < questions.length - 1) {
      setQuestionIdx((q) => q + 1);
    } else {
      endInterviewCleanup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionIdx]);



  const endInterview = () => {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(e => console.log(e));
    }
    endInterviewCleanup();
  };

  // ─── Cleanup on unmount ───
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (dgSocketRef.current && dgSocketRef.current.readyState === WebSocket.OPEN) {
        dgSocketRef.current.close();
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (videoRecorderRef.current && videoRecorderRef.current.state !== 'inactive') {
        videoRecorderRef.current.stop();
      }
    };
  }, []);

  // ─── Mic toggle ───
  const toggleMic = useCallback(() => {
    if (inRoom) {
      toast("Microphone cannot be turned off during the interview. Strike added.");
      setStrikes((s) => s + 1);
      return;
    }
    setMicActive((prev) => {
      const next = !prev;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = next;
        });
      }
      if (!next) {
        setLiveTranscript('');
      }
      return next;
    });
  }, [inRoom, toast]);
  // ─── Camera button ───
  const handleCameraClick = async () => {
    if (inRoom) {
      toast("Camera cannot be turned off during the interview. Strike added.");
      setStrikes((s) => s + 1);
      return;
    }
    if (cameraOn) {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(t => t.stop());
      }
      cameraStreamRef.current = null;
      setCameraOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        cameraStreamRef.current = stream;
        setCameraOn(true);
      } catch {
        toast('Camera access denied');
      }
    }
  };

  const handleDemoStrike = () => {
    setDemoStrikes((s) => (s + 1) % 4);
  };


  // ─── Tab Switch Warning & 3-Strike System ───
  useEffect(() => {
    if (!inRoom) return;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabWarning(true);
        setStrikes((s) => s + 1);
      }
    };
    const handleBlur = () => {
      setTabWarning(true);
      setStrikes((s) => s + 1);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [inRoom]);

  // ─── Face Detection Initialization ───
  useEffect(() => {
    let active = true;
    const initDetector = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        const detector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
            delegate: "GPU"
          },
          runningMode: "VIDEO"
        });
        if (active) faceDetectorRef.current = detector;
      } catch (err) {
        console.error("Face detector failed to init", err);
      }
    };
    initDetector();
    return () => {
      active = false;
      if (faceDetectorRef.current) {
        faceDetectorRef.current.close();
        faceDetectorRef.current = null;
      }
    };
  }, []);

  // ─── Face Detection Loop ───
  useEffect(() => {
    if (!inRoom) return;
    let lastVideoTime = -1;
    let noFaceStartTime: number | null = null;
    let strikeGiven = false;

    const detectFace = () => {
      if (faceDetectorRef.current && cameraVideoRef.current && cameraVideoRef.current.readyState >= 2) {
        const video = cameraVideoRef.current;
        const currentTime = performance.now();
        if (video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          const detections = faceDetectorRef.current.detectForVideo(video, currentTime);
          if (detections.detections.length === 0) {
            if (noFaceStartTime === null) {
              noFaceStartTime = currentTime;
            } else if (currentTime - noFaceStartTime > 5000 && !strikeGiven) {
              // 5 seconds without face
              toast("Face not detected for 5 seconds. Please stay in the frame! Strike added.");
              setStrikes((s) => s + 1);
              strikeGiven = true;
            }
          } else {
            noFaceStartTime = null;
            strikeGiven = false;
          }
        }
      }
      detectionLoopRef.current = requestAnimationFrame(detectFace);
    };
    detectFace();
    return () => {
      if (detectionLoopRef.current) cancelAnimationFrame(detectionLoopRef.current);
    };
  }, [inRoom, toast]);

  useEffect(() => {
    if (strikes >= 3 && inRoomRef.current) {
      toast('Maximum strikes reached. Interview terminated.');
      endInterview();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strikes]);

  const formattedTime = `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;

  // ─── SETUP MODAL ───
  const requestPermissions = async () => {
    try {
      setSetupError('');

      // Unlock audio context for TTS
      const unlockAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
      unlockAudio.play().catch(() => {});
      
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch((e) => console.log('fs', e));
      } else if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch((e) => console.log('fs', e));
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      cameraStreamRef.current = stream;
      mediaStreamRef.current = stream;
      setCameraOn(true);
      setMicActive(true);
      
      const vRec = new MediaRecorder(stream, { mimeType: 'video/webm' });
      vRec.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      videoRecorderRef.current = vRec;
      vRec.start(1000);

      setTimeout(() => {
        handleJoinAfterSetup();
      }, 500);
    } catch (err) {
      setSetupError('Please allow camera and microphone access to continue.');
    }
  };

  // ─── FULLSCREEN WRAPPER ───
  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflowY: 'auto' }}>
      {tabWarning && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.95)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface-solid)', padding: '3rem', borderRadius: 'var(--r-lg)', border: '1px solid #ef4444', textAlign: 'center', maxWidth: 500 }}>
            <h2 style={{ marginBottom: '1rem', color: '#ef4444' }}>Interview Paused</h2>
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '0.8rem', borderRadius: 'var(--r-md)', fontWeight: 'bold', marginBottom: '1.5rem', display: 'inline-block' }}>
              {strikes >= 3 ? "INTERVIEW TERMINATED" : `STRIKE ${strikes} OF 3`}
            </div>
            <p style={{ color: 'var(--text-1)', marginBottom: '2rem' }}>You must stay on the interview screen. Switching tabs or windows is a violation. 3 strikes will immediately terminate the interview.</p>
            {strikes < 3 && (
              <button className="btn btn-primary" onClick={() => { setTabWarning(false); if (containerRef.current?.requestFullscreen) containerRef.current.requestFullscreen().catch(()=>console.log('fs error')); }} style={{ background: '#ef4444', border: 'none', margin: '0 auto' }}>
                Acknowledge Warning & Return
              </button>
            )}
          </div>
        </div>
      )}

      {connecting ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem', flex: 1 }}>
          <h3 style={{ margin: 0 }}>Connecting to your interviewer...</h3>
          <p style={{ color: 'var(--text-2)', margin: 0 }}>Setting up your session</p>
        </div>
      ) : !inRoom ? (
        <>
          {showSetup && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ background: 'var(--surface-solid)', padding: '2rem', borderRadius: 'var(--r-lg)', border: '1px solid var(--line)', maxWidth: 400, width: '100%', textAlign: 'center' }}>
                <h3 style={{ marginBottom: '1rem' }}>Device Setup</h3>
                <p style={{ color: 'var(--text-2)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>We need access to your camera and microphone to conduct the interview.</p>
                {setupError && <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.85rem' }}>{setupError}</div>}
                <button className="btn btn-primary" onClick={requestPermissions} style={{ width: '100%', justifyContent: 'center' }}>
                  Enable Camera & Mic
                </button>
                <button className="btn btn-ghost" onClick={() => setShowSetup(false)} style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
          <div className="app-head">
            <div>
              <h2>Set up your mock interview</h2>
              <p>Configure your session and enter the interview room.</p>
            </div>
          </div>
<div className="setup-grid">
          {/* Left: Options */}
          <div className="widget">
            <h4>1 &middot; Interview type</h4>
            <div className="opt-cards" style={{ marginBottom: '1.2rem' }}>
              {interviewTypes.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    className={`opt-card${selectedType === t.id ? ' sel' : ''}`}
                    onClick={() => setSelectedType(t.id)}
                  >
                    <Icon size={22} style={{ marginBottom: '.3rem' }} />
                    <div>{t.label}</div>
                    <small>{t.sub}</small>
                  </button>
                );
              })}
            </div>

            <h4>2 &middot; Difficulty</h4>
            <div className="opt-cards" style={{ marginBottom: '1.2rem' }}>
              {difficulties.map((d) => {
                const Icon = d.icon;
                return (
                  <button
                    key={d.id}
                    className={`opt-card${selectedDiff === d.id ? ' sel' : ''}`}
                    onClick={() => setSelectedDiff(d.id)}
                  >
                    <Icon size={22} style={{ marginBottom: '.3rem' }} />
                    <div>{d.label}</div>
                    <small>{d.sub}</small>
                  </button>
                );
              })}
            </div>

            <h4>3 &middot; Target role</h4>
            <div className="field" style={{ marginBottom: '1.4rem' }}>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                <option value="">Select a role...</option>
                {roles.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {selectedRole === 'Custom Job Description' && (
              <div className="field" style={{ marginBottom: '1.4rem' }}>
                <textarea 
                  rows={4} 
                  placeholder="Paste the Job Description here. The AI will tailor the mock interview specifically to this role."
                  value={customJD}
                  onChange={(e) => setCustomJD(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>
            )}

            <h4>4 &middot; Preferred Industry / Domain</h4>
            <div className="field" style={{ marginBottom: '1.4rem' }}>
              <select
                value={selectedIndustry}
                onChange={(e) => setSelectedIndustry(e.target.value)}
              >
                <option value="">Select an industry (optional)...</option>
                {industries.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>

            <h4>5 &middot; Upload Resume</h4>
            <div className="field" style={{ marginBottom: '1.4rem' }}>
              <input 
                type="file" 
                accept="application/pdf"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setResumeFile(e.target.files[0]);
                  }
                }}
                style={{ padding: '0.8rem', background: 'var(--card)', borderRadius: 'var(--r-md)', border: '1px solid var(--line)' }}
              />
              <small style={{ display: 'block', marginTop: '0.4rem', color: 'var(--text-2)' }}>The AI will analyze your resume to personalize the interview questions.</small>
            </div>

            <button 
              className="btn btn-primary" 
              onClick={startInterview}
              disabled={!resumeFile}
              style={{ opacity: !resumeFile ? 0.5 : 1, cursor: !resumeFile ? 'not-allowed' : 'pointer' }}
            >
              <Mic size={18} />
              Enter interview room
            </button>
          </div>

          {/* Right: Rules */}
          <div className="widget">
            <h4>Interview rules &middot; 3-strike system</h4>
            <div className="rules">
              <div className="rule">
                <span className="ic"><Camera size={16} /></span>
                <span>Camera &amp; mic must stay on throughout the session.</span>
              </div>
              <div className="rule">
                <span className="ic"><Clock size={16} /></span>
                <span>You have 15 seconds to begin answering each question.</span>
              </div>
              <div className="rule">
                <span className="ic"><Target size={16} /></span>
                <span>Stay on topic &mdash; off-topic answers earn a strike.</span>
              </div>
              <div className="rule">
                <span className="ic"><XCircle size={16} /></span>
                <span>Three strikes and the round ends immediately.</span>
              </div>
            </div>

            <div style={{ marginTop: '1.4rem' }}>
              <span
                style={{
                  fontSize: '.82rem',
                  fontWeight: 600,
                  color: 'var(--text-2)',
                  display: 'block',
                  marginBottom: '.5rem',
                }}
              >
                Strike display
              </span>
              <div className="strikes" style={{ marginBottom: '.8rem' }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} className={`strike${i < demoStrikes ? ' hit' : ''}`}>
                    {i < demoStrikes ? <XCircle size={14} /> : ''}
                  </div>
                ))}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleDemoStrike}>
                Demo a strike
              </button>
            </div>
          </div>
        </div>
      
        </>
      ) : (
        <>
<div className="app-head">
        <div>
          <h2>Interview room</h2>
          <p>
            {interviewTypes.find((t) => t.id === selectedType)?.label} &middot;{' '}
            {selectedRole} &middot;{' '}
            {difficulties.find((d) => d.id === selectedDiff)?.label}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className="timer">{formattedTime}</span>
          <div className="strikes">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`strike${i < strikes ? ' hit' : ''}`}>
                {i < strikes ? <XCircle size={14} /> : ''}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="room-layout">
        {/* Stage */}
        <div className="room-stage" style={{ padding: '1.4rem' }}>
          <div className="dash-grid-2" style={{ width: '100%' }}>
            {/* AI Avatar Pane */}
            <div style={{ background: 'var(--surface-solid)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '100%', height: '260px', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: ariaSpeaking ? '2px solid var(--accent)' : '1px solid var(--line)', transition: 'border-color 0.3s' }}>
              {heygenReady && heygenStreamUrl ? (
                <video
                  ref={heygenVideoRef}
                  className="ai-avatar-video"
                  autoPlay
                  playsInline
                  muted={false}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <img src="/ai-avatar.png" alt="Aria" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
              </div>
              <small>
                Aria &middot; AI Interviewer &middot;{' '}
                {ariaSpeaking ? 'Speaking' : 'Live'}
              </small>
              <div className="wave" style={{ opacity: ariaSpeaking ? 1 : 0.3, transition: 'opacity 0.3s' }}>
                <i /><i /><i /><i /><i />
              </div>
            </div>

            {/* User Camera Pane */}
            <div style={{ background: 'var(--surface-solid)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ width: '100%', height: '260px', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: userSpeaking ? '2px solid var(--accent)' : '1px solid var(--line)', transition: 'border-color 0.3s' }}>
                {cameraOn ? (
                  <video
                    ref={(el) => {
                      cameraVideoRef.current = el;
                      if (el && cameraStreamRef.current && el.srcObject !== cameraStreamRef.current) {
                        el.srcObject = cameraStreamRef.current;
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <CameraOff size={48} color="var(--text-3)" />
                )}
              </div>
              <small>
                You &middot; Candidate &middot;{' '}
                {micActive ? (userSpeaking ? 'Speaking' : 'Listening') : 'Muted'}
              </small>
              <div className="wave" style={{ opacity: userSpeaking ? 1 : 0.3, transition: 'opacity 0.3s' }}>
                <i /><i /><i /><i /><i />
              </div>
            </div>
          </div>

          <div className="room-controls" style={{ marginTop: 'auto' }}>
            <button
              className={`ctrl${micActive ? ' active' : ''}`}
              title={micActive ? 'Mute mic' : 'Unmute mic'}
              onClick={toggleMic}
              style={{
                background: micActive ? 'var(--accent)' : '#e53e3e',
                color: '#fff',
              }}
            >
              {micActive ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
            <button className="ctrl" title="Toggle camera" onClick={handleCameraClick}
              style={{
                background: cameraOn ? 'var(--accent)' : undefined,
                color: cameraOn ? '#fff' : undefined,
              }}
            >
              {cameraOn ? <Camera size={20} /> : <CameraOff size={20} />}
            </button>
            <button className="ctrl" title="Next question" onClick={advanceQuestion}>
              <SkipForward size={20} />
            </button>
            <button className="ctrl end" title="End interview" onClick={endInterview}>
              <Square size={20} />
            </button>
          </div>
        </div>

        {/* Transcript */}
        <div className="widget">
          <h4>Live transcript</h4>
          <div className="live-transcript" ref={transcriptRef}>
            {transcript.map((msg, i) => {
              const isLast = i === transcript.length - 1;
              const isAI = msg.who === 'ai';
              return (
                <div key={i} className={`bubble ${isAI ? 'ai' : 'me'}`}>
                  <span className="who">{isAI ? 'Aria' : 'You'}</span>
                  {isLast && isAI ? <TypewriterText text={msg.text} /> : msg.text}
                </div>
              );
            })}
            {/* Live / interim bubble */}
            {liveTranscript ? (
              <div className="bubble me">
                <span className="who">You</span>
                {liveTranscript}<span className="caret" />
              </div>
            ) : (
              <div className="bubble ai">
                <span className="who">Aria</span>
                {micActive ? (
                  <>Listening...<span className="caret" /></>
                ) : (
                  <>Mic muted &mdash; unmute to answer</>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    
        </>
      )}
    </div>
  );
}
