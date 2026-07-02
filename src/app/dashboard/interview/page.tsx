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
import { saveRecording } from '@/lib/recording-store';
import type { InterviewRecord } from '@/lib/interview-store';
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';
import { LiveAvatarSession, SessionEvent, AgentEventsEnum } from '@heygen/liveavatar-web-sdk';

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

// How long to wait after the candidate stops talking before Alex responds.
// Kept short so the conversation feels natural and responsive (not an 8s lag),
// but long enough to allow a brief thinking pause mid-answer.
const SILENCE_TIMEOUT_MS = 2200;

export default function InterviewPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Setup state
  const [inRoom, setInRoom] = useState(false);
  const [selectedType, setSelectedType] = useState('hr');
  const [selectedDiff, setSelectedDiff] = useState('mid');
  const [selectedRole, setSelectedRole] = useState('Product Manager');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [extractingLinkedIn, setExtractingLinkedIn] = useState(false);
  const [customJD, setCustomJD] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState('');
  const [hasSavedResume, setHasSavedResume] = useState(false);
  const [replaceResume, setReplaceResume] = useState(false);
  const [demoStrikes, setDemoStrikes] = useState(0);

  // Room state
  const [seconds, setSeconds] = useState(0);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [transcript, setTranscript] = useState<{ who: 'ai' | 'me'; text: string }[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // AI features state

  useEffect(() => {
    const saved = localStorage.getItem('interview_resume_text');
    if (saved) {
      setResumeText(saved);
      setHasSavedResume(true);
    }
  }, []);

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
  const [heygenReady, setHeygenReady] = useState(false);
  // True when the LiveAvatar session can't start (e.g. insufficient credits).
  const [avatarError, setAvatarError] = useState(false);
  // Gates the candidate camera reveal: show the interviewer first, then the user.
  const [stageReady, setStageReady] = useState(false);

  // Refs for cleanup
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const avatarRef = useRef<LiveAvatarSession | null>(null);
  const avatarSpeakStartedRef = useRef(false);
  const pendingSpeechRef = useRef<string | null>(null);
  const dgSocketRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heygenVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  // Combined (avatar + candidate) recording
  const combinedRecorderRef = useRef<MediaRecorder | null>(null);
  const combinedChunksRef = useRef<BlobPart[]>([]);
  const recordRafRef = useRef<number | null>(null);
  const recordAudioCtxRef = useRef<AudioContext | null>(null);
  const avatarAttachPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
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
  // LiveAvatar keep-alive heartbeat + session-duration guard timers.
  const keepAliveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionWarnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endInterviewCleanupRef = useRef<(() => void) | null>(null);
  // The per-interview LiveAvatar context id (for cleanup when the interview ends).
  const liveContextIdRef = useRef<string | null>(null);

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

  const handleLinkedInExtract = async () => {
    if (!linkedinUrl) {
      toast('Please enter a LinkedIn profile URL.');
      return;
    }
    setExtractingLinkedIn(true);
    try {
      const res = await fetch('/api/linkedin/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: linkedinUrl })
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || 'Failed to extract LinkedIn profile.');
      } else {
        setSelectedRole(data.role);
        toast(`Autofilled Target Role as: ${data.role}`);
      }
    } catch (err) {
      console.error(err);
      toast('Error connecting to extraction API.');
    } finally {
      setExtractingLinkedIn(false);
    }
  };

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

  // Resolves true if the avatar emits AVATAR_SPEAK_STARTED within `ms`.
  const waitAvatarStarted = (ms: number) => new Promise<boolean>((resolve) => {
    let waited = 0;
    const iv = setInterval(() => {
      waited += 100;
      if (avatarSpeakStartedRef.current) { clearInterval(iv); resolve(true); }
      else if (waited >= ms) { clearInterval(iv); resolve(false); }
    }, 100);
  });

  // ─── LiveAvatar speech (FULL mode) ───
  // The avatar speaks the text in its OWN voice and lip-syncs natively via
  // repeat(). All audio comes from LiveAvatar — no external TTS on this path.
  const speakWithHeygen = useCallback(async (text: string) => {
    if (!avatarRef.current || !heygenReady) return false;
    try {
      avatarSpeakStartedRef.current = false;
      avatarRef.current.repeat(text);
    } catch (e) {
      console.warn('Avatar repeat() failed.', e);
      return false;
    }
    // FULL-mode TTS takes ~1-3s to begin; confirm the avatar actually started.
    return await waitAvatarStarted(4000);
  }, [heygenReady]);

  // Speech is AVATAR-ONLY. We never use any external TTS. If the avatar isn't
  // loaded yet, the line is queued and spoken the moment the avatar connects, so
  // the candidate never hears a voice while the interviewer is still connecting.
  const speakQuestion = useCallback(async (text: string) => {
    if (heygenReady && avatarRef.current) {
      await speakWithHeygen(text);
    } else {
      pendingSpeechRef.current = text;
    }
  }, [heygenReady, speakWithHeygen]);

  useEffect(() => { speakQuestionRef.current = speakQuestion; }, [speakQuestion]);

  // Flush any queued line once the avatar is live.
  useEffect(() => {
    if (heygenReady && pendingSpeechRef.current) {
      const text = pendingSpeechRef.current;
      pendingSpeechRef.current = null;
      speakWithHeygen(text);
    }
  }, [heygenReady, speakWithHeygen]);

  // The LiveAvatar SDK emits benign unhandled rejections from its internal
  // keep-alive polling (e.g. a transient "Session not found"). These are NOT
  // fatal, so we only stop them from crashing the dev overlay — we must NOT
  // touch avatar state here, or a stray poll error would wrongly mark the
  // working avatar as unavailable. Real failures come via SESSION_DISCONNECTED
  // and the start() catch instead.
  useEffect(() => {
    const handler = (e: PromiseRejectionEvent) => {
      const msg = String((e.reason && ((e.reason as any).message || e.reason)) || '');
      if (/Session not found|Insufficient credits|session token|credits|LiveKit|participant/i.test(msg)) {
        e.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, []);

  // ─── HeyGen: create streaming session ───
  const initHeygen = useCallback(async (): Promise<void> => {
    setAvatarError(false);
    try {
      // Ask the server for a FULL-mode session bound to a fresh interviewer
      // Context (system prompt + greeting) built from this interview's setup.
      const diffLabel = difficulties.find((d) => d.id === selectedDiffRef.current)?.label || 'Intermediate';
      const res = await fetch('/api/liveavatar/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: selectedRoleRef.current,
          difficulty: diffLabel,
          customJD: customJDRef.current,
          resumeText: resumeTextRef.current,
        }),
      });
      if (!res.ok) {
        console.warn('LiveAvatar token unavailable.');
        setHeygenReady(false);
        setAvatarError(true);
        return;
      }
      const data = await res.json();
      if (!data.token) {
        setHeygenReady(false);
        setAvatarError(true);
        return;
      }
      liveContextIdRef.current = data.contextId || null;

      // voiceChat: true publishes the candidate's mic so LiveAvatar's built-in
      // agent can hear them and drive the whole conversation (VAD→STT→LLM→TTS).
      const session = new LiveAvatarSession(data.token, { voiceChat: true });
      avatarRef.current = session;

      // Attach the avatar's media to the <video> element and flip to "ready"
      // as soon as a video track is actually present.
      const tryAttach = () => {
        const el = heygenVideoRef.current;
        if (!el) return;
        try { session.attach(el); } catch { /* tracks not subscribed yet */ }
        const ms = el.srcObject as MediaStream | null;
        if (ms && ms.getVideoTracks().length > 0) {
          setHeygenReady(true);
          el.play().catch(() => {});
          if (avatarAttachPollRef.current) { clearInterval(avatarAttachPollRef.current); avatarAttachPollRef.current = null; }
        }
      };

      const hasAvatarVideo = () => {
        const ms = heygenVideoRef.current?.srcObject as MediaStream | null;
        return !!ms && ms.getVideoTracks().length > 0;
      };

      session.on(SessionEvent.SESSION_STREAM_READY, tryAttach);
      session.on(SessionEvent.SESSION_DISCONNECTED, () => {
        // Only treat as fatal if the avatar never actually came up.
        if (!hasAvatarVideo()) {
          setHeygenReady(false);
          setAvatarError(true);
        }
        if (avatarAttachPollRef.current) { clearInterval(avatarAttachPollRef.current); avatarAttachPollRef.current = null; }
      });

      // Drive the "Speaking" indicator from the avatar's real speech events.
      session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, () => {
        avatarSpeakStartedRef.current = true;
        setAriaSpeaking(true);
      });
      session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, () => {
        setAriaSpeaking(false);
      });

      // ── Live transcript comes straight from LiveAvatar's agent ──
      // The candidate's speech (agent STT) and Alex's generated replies both
      // arrive as events — no external STT/LLM involved.
      session.on(AgentEventsEnum.USER_SPEAK_STARTED, () => setUserSpeaking(true));
      session.on(AgentEventsEnum.USER_SPEAK_ENDED, () => setUserSpeaking(false));
      session.on(AgentEventsEnum.USER_TRANSCRIPTION, (e: any) => {
        const text = (e?.text || '').trim();
        if (!text) return;
        setTranscript((t) => [...t, { who: 'me', text }]);
        setLiveTranscript('');
      });
      session.on(AgentEventsEnum.AVATAR_TRANSCRIPTION, (e: any) => {
        const text = (e?.text || '').trim();
        if (!text) return;
        setTranscript((t) => [...t, { who: 'ai', text }]);
        setQuestionIdx((q) => q + 1);
        setLiveTranscript('');
      });

      // Start poll-attaching immediately so the avatar shows the instant its
      // video track arrives — even if start() later rejects on participant wait.
      let tries = 0;
      if (avatarAttachPollRef.current) clearInterval(avatarAttachPollRef.current);
      avatarAttachPollRef.current = setInterval(() => {
        tries += 1;
        tryAttach();
        if (tries >= 40 && avatarAttachPollRef.current) {
          clearInterval(avatarAttachPollRef.current);
          avatarAttachPollRef.current = null;
        }
      }, 700);

      await session.start();
      setHeygenSessionId(session.sessionId || 'active');

      // Keep-alive heartbeat: the SDK does NOT ping automatically, so without
      // this the session can drop mid-interview (the earlier "Session not found"
      // disconnects). Ping every 25s while the session is live.
      if (keepAliveTimerRef.current) clearInterval(keepAliveTimerRef.current);
      keepAliveTimerRef.current = setInterval(() => {
        try { session.keepAlive?.(); } catch { /* transient, ignore */ }
      }, 25000);

      // Plan session cap (Starter = 5 min). Read the real limit and gracefully
      // wrap the interview ~15s before the hard server cutoff so the candidate
      // is never cut off mid-sentence with a broken avatar.
      const maxSecs = session.maxSessionDuration;
      if (typeof maxSecs === 'number' && maxSecs > 30) {
        if (sessionWarnTimerRef.current) clearTimeout(sessionWarnTimerRef.current);
        if (sessionEndTimerRef.current) clearTimeout(sessionEndTimerRef.current);
        sessionWarnTimerRef.current = setTimeout(() => {
          if (inRoomRef.current) toast('Heads up — about 30 seconds left in this session. Wrapping up soon.');
        }, Math.max(0, (maxSecs - 30) * 1000));
        sessionEndTimerRef.current = setTimeout(() => {
          if (inRoomRef.current) {
            toast('Session time reached its limit — finishing your interview.');
            endInterviewCleanupRef.current?.();
          }
        }, Math.max(0, (maxSecs - 15) * 1000));
      }
    } catch (err) {
      console.warn('LiveAvatar session start reported an error.', err);
      // If the avatar video already attached, the session is usable despite the error.
      const ms = heygenVideoRef.current?.srcObject as MediaStream | null;
      if (ms && ms.getVideoTracks().length > 0) {
        setHeygenReady(true);
        return;
      }
      setHeygenReady(false);
      setAvatarError(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── HeyGen: stop session ───
  const stopHeygen = useCallback(async () => {
    if (avatarAttachPollRef.current) { clearInterval(avatarAttachPollRef.current); avatarAttachPollRef.current = null; }
    if (keepAliveTimerRef.current) { clearInterval(keepAliveTimerRef.current); keepAliveTimerRef.current = null; }
    if (sessionWarnTimerRef.current) { clearTimeout(sessionWarnTimerRef.current); sessionWarnTimerRef.current = null; }
    if (sessionEndTimerRef.current) { clearTimeout(sessionEndTimerRef.current); sessionEndTimerRef.current = null; }
    try {
      if (avatarRef.current) {
        await avatarRef.current.stop();
        avatarRef.current = null;
      }
    } catch {}
    setHeygenSessionId(null);
    setHeygenReady(false);
    if (heygenVideoRef.current) {
      heygenVideoRef.current.srcObject = null;
    }
    // Best-effort: delete the per-interview LiveAvatar context so they don't pile up.
    if (liveContextIdRef.current) {
      const cid = liveContextIdRef.current;
      liveContextIdRef.current = null;
      fetch(`/api/liveavatar/token?contextId=${encodeURIComponent(cid)}`, { method: 'DELETE' }).catch(() => {});
    }
  }, []);

  // NOTE: The interview conversation is now driven entirely by LiveAvatar's
  // built-in FULL-mode agent (see initHeygen). We no longer call an external LLM
  // to generate questions — Alex listens and responds on his own, and his turns
  // arrive via the AVATAR_TRANSCRIPTION event.

  // ─── Combined recording: composite avatar + candidate onto a canvas ───
  const startCombinedRecording = useCallback(() => {
    if (combinedRecorderRef.current) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const drawCover = (video: HTMLVideoElement, dx: number, dy: number, dw: number, dh: number) => {
        const vw = video.videoWidth, vh = video.videoHeight;
        if (!vw || !vh) return;
        const scale = Math.max(dw / vw, dh / vh);
        const sw = dw / scale, sh = dh / scale;
        ctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, dx, dy, dw, dh);
      };

      const draw = () => {
        ctx.fillStyle = '#0b1220';
        ctx.fillRect(0, 0, 1280, 480);
        const av = heygenVideoRef.current;
        const uv = cameraVideoRef.current;
        if (av && av.readyState >= 2) drawCover(av, 0, 0, 640, 480);
        if (uv && uv.readyState >= 2) drawCover(uv, 640, 0, 640, 480);
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(0, 446, 1280, 34);
        ctx.fillStyle = '#fff';
        ctx.font = '16px Inter, sans-serif';
        ctx.fillText('Alex · AI Interviewer', 14, 469);
        ctx.fillText('You · Candidate', 654, 469);
        recordRafRef.current = requestAnimationFrame(draw);
      };
      draw();

      const canvasStream = canvas.captureStream(30);

      // Mix candidate mic + avatar audio into a single track.
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const actx: AudioContext = new AC();
      recordAudioCtxRef.current = actx;
      const dest = actx.createMediaStreamDestination();
      const addAudio = (stream: MediaStream | null | undefined) => {
        try {
          const tracks = stream?.getAudioTracks?.() ?? [];
          if (tracks.length) actx.createMediaStreamSource(new MediaStream(tracks)).connect(dest);
        } catch { /* ignore */ }
      };
      addAudio(mediaStreamRef.current);
      addAudio(heygenVideoRef.current?.srcObject as MediaStream | null);

      const combined = new MediaStream([...canvasStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
      combinedChunksRef.current = [];
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm';
      const rec = new MediaRecorder(combined, { mimeType: mime });
      rec.ondataavailable = (e) => { if (e.data.size > 0) combinedChunksRef.current.push(e.data); };
      rec.start(1000);
      combinedRecorderRef.current = rec;
    } catch (e) {
      console.warn('Combined recording could not start.', e);
    }
  }, []);

  const stopCombinedRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (recordRafRef.current) { cancelAnimationFrame(recordRafRef.current); recordRafRef.current = null; }
      const rec = combinedRecorderRef.current;
      const finalize = () => {
        try { recordAudioCtxRef.current?.close(); } catch { /* ignore */ }
        recordAudioCtxRef.current = null;
        combinedRecorderRef.current = null;
        const chunks = combinedChunksRef.current;
        resolve(chunks.length ? new Blob(chunks, { type: 'video/webm' }) : null);
      };
      if (!rec || rec.state === 'inactive') { finalize(); return; }
      rec.onstop = finalize;
      try { rec.stop(); } catch { finalize(); }
    });
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

    // Finalize the combined (avatar + candidate) recording BEFORE tracks are stopped.
    const videoBlob = await stopCombinedRecording();

    if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach((track) => track.stop()); }
    mediaStreamRef.current = null;
    if (cameraStreamRef.current) { cameraStreamRef.current.getTracks().forEach((track) => track.stop()); }
    cameraStreamRef.current = null;

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

      // Conservative defaults used only if the AI evaluation fails to return.
      let score = 55;
      let metrics = {
        communication: 5.5, confidence: 5.5, clarity: 5.5, bodyLanguage: 5.5, eyeContact: 5.5,
        appearance: 5.5, posture: 5.5, technicalKnowledge: 5.5, problemSolving: 5.5, leadership: 5.5,
      };
      let feedback = {
        strengths: 'You completed the session.',
        improvements: 'We could not fully analyse this attempt. Give longer, more detailed answers with concrete examples.',
        nextStep: 'Retake the interview and aim for structured 60-90 second answers per question.',
      };

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
      if (videoBlob && videoBlob.size > 0) {
        try { await saveRecording(interviewId, videoBlob); } catch { /* recording is best-effort */ }
      }
      setTimeout(() => {
        router.push(`/dashboard/analysis?id=${interviewId}`);
      }, 500);
    } catch(err) {
      setIsThinking(false);
    }
  }, [stopHeygen, router, stopCombinedRecording]);

  // Expose the latest cleanup to the session-cap timer set up inside initHeygen.
  useEffect(() => { endInterviewCleanupRef.current = endInterviewCleanup; }, [endInterviewCleanup]);

  // ─── Candidate mic: local waveform only ───
  // STT/transcription is handled by LiveAvatar's built-in agent — this only
  // grabs the mic for the on-screen "Speaking" waveform and the combined
  // recording. (LiveAvatar publishes its own copy of the mic via voiceChat.)
  const initDeepgram = useCallback(async () => {
    try {
      let stream = mediaStreamRef.current;
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
      }

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      let wasSpeaking = false;
      const checkVolume = () => {
        if (!micActiveRef.current) {
          if (wasSpeaking) { setUserSpeaking(false); wasSpeaking = false; }
        } else {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          const avg = sum / dataArray.length;
          const isSpeaking = avg > 5;
          if (isSpeaking !== wasSpeaking) { setUserSpeaking(isSpeaking); wasSpeaking = isSpeaking; }
        }
        if (inRoomRef.current) requestAnimationFrame(checkVolume);
      };
      checkVolume();
    } catch (err) {
      toast('Could not access microphone. Please check permissions.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);


  // The opening greeting is spoken automatically by LiveAvatar from the
  // Context's opening_text when the session starts — nothing to push here.

  // Reveal the candidate camera only after the interviewer is ready (better UX),
  // with a safety timeout so the user is never stuck if the avatar can't load.
  useEffect(() => {
    if (!inRoom) { setStageReady(false); return; }
    if (heygenReady) { setStageReady(true); return; }
    const t = setTimeout(() => setStageReady(true), 12000);
    return () => clearTimeout(t);
  }, [inRoom, heygenReady]);

  // Start the combined recording once the room is set up.
  useEffect(() => {
    if (inRoom && stageReady) startCombinedRecording();
  }, [inRoom, stageReady, startCombinedRecording]);

  // ─── Start Interview ───
  const startInterview = async () => {
    if (!selectedType || !selectedDiff || !selectedRole) {
      toast('Please complete all selections before starting.');
      return;
    }
    if (!resumeFile && !hasSavedResume) {
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
          if (text) {
            setResumeText(text);
            localStorage.setItem('interview_resume_text', text);
            setHasSavedResume(true);
          }
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

  // ─── Skip / next question ───
  // Nudge LiveAvatar's agent to move on. message() = "generate an LLM response
  // to this input, then speak it", so we ask Alex to advance the interview.
  const advanceQuestion = useCallback(() => {
    const s = avatarRef.current;
    if (s && typeof s.message === 'function') {
      try { s.message("Let's move on to the next question, please."); } catch { /* ignore */ }
    }
  }, []);



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
      if (keepAliveTimerRef.current) clearInterval(keepAliveTimerRef.current);
      if (sessionWarnTimerRef.current) clearTimeout(sessionWarnTimerRef.current);
      if (sessionEndTimerRef.current) clearTimeout(sessionEndTimerRef.current);
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
      if (recordRafRef.current) cancelAnimationFrame(recordRafRef.current);
      if (combinedRecorderRef.current && combinedRecorderRef.current.state !== 'inactive') {
        combinedRecorderRef.current.stop();
      }
      try { recordAudioCtxRef.current?.close(); } catch { /* ignore */ }
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

    const pauseAI = () => {
      setAriaSpeaking(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (avatarRef.current && typeof avatarRef.current.interrupt === 'function') {
        // LiveAvatarSession.interrupt() is synchronous (returns void).
        try { avatarRef.current.interrupt(); } catch {}
      }
      // Silence + freeze the avatar stream so no audio leaks during the pause.
      if (heygenVideoRef.current) {
        heygenVideoRef.current.muted = true;
        try { heygenVideoRef.current.pause(); } catch { /* ignore */ }
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        pauseAI();
        setTabWarning(true);
        setStrikes((s) => s + 1);
      }
    };
    const handleBlur = () => {
      pauseAI();
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

  // Barge-in / interruption and turn-taking are handled natively by LiveAvatar's
  // FULL-mode agent (its VAD stops Alex when the candidate starts talking), so no
  // manual interrupt logic is needed here.

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

      // The combined avatar + candidate recording starts once the room is ready.
      setTimeout(() => {
        handleJoinAfterSetup();
      }, 500);
    } catch (err) {
      setSetupError('Please allow camera and microphone access to continue.');
    }
  };

  // ─── FULLSCREEN WRAPPER ───
  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflowY: 'auto', ...(inRoom ? { position: 'fixed', inset: 0, zIndex: 2000, width: '100vw', height: '100vh', padding: '1.25rem 1.5rem' } : { width: '100%', height: '100%' }) }}>
      {tabWarning && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.95)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface-solid)', padding: '3rem', borderRadius: 'var(--r-lg)', border: '1px solid var(--error-border)', textAlign: 'center', maxWidth: 500 }}>
            <h2 style={{ marginBottom: '1rem', color: 'var(--error-text)' }}>Interview Paused</h2>
            <div style={{ background: 'var(--error-bg)', color: 'var(--error-text)', padding: '0.8rem', borderRadius: 'var(--r-md)', fontWeight: 'bold', marginBottom: '1.5rem', display: 'inline-block' }}>
              {strikes >= 3 ? "INTERVIEW TERMINATED" : `STRIKE ${strikes} OF 3`}
            </div>
            <p style={{ color: 'var(--text)', marginBottom: '2rem' }}>You must stay on the interview screen. Switching tabs or windows is a violation. 3 strikes will immediately terminate the interview.</p>
            {strikes < 3 && (
              <button className="btn btn-primary" onClick={() => { setTabWarning(false); if (heygenVideoRef.current) { heygenVideoRef.current.muted = false; heygenVideoRef.current.play().catch(() => {}); } if (containerRef.current?.requestFullscreen) containerRef.current.requestFullscreen().catch(()=>console.log('fs error')); }} style={{ background: 'var(--error-text)', border: 'none', margin: '0 auto' }}>
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
                {setupError && <div style={{ color: 'var(--error-text)', marginBottom: '1rem', fontSize: '0.85rem' }}>{setupError}</div>}
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
            <div className="field" style={{ marginBottom: '0.8rem' }}>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                <option value="">Select a role...</option>
                {roles.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
                {!roles.includes(selectedRole) && selectedRole && (
                  <option value={selectedRole}>{selectedRole}</option>
                )}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.4rem' }}>
              <input 
                type="text" 
                className="input" 
                placeholder="Or paste LinkedIn Profile URL to auto-detect role..."
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                style={{ flex: 1, height: '42px', margin: 0 }}
              />
              <button 
                type="button" 
                className="btn btn-ghost" 
                onClick={handleLinkedInExtract}
                disabled={extractingLinkedIn}
                style={{ height: '42px', whiteSpace: 'nowrap', border: '1px solid var(--line)' }}
              >
                {extractingLinkedIn ? 'Extracting...' : 'Auto-fill'}
              </button>
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
              {hasSavedResume && !resumeFile && !replaceResume ? (
                <div style={{ padding: '1rem', background: 'var(--card)', borderRadius: 'var(--r-md)', border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <p style={{ margin: 0, fontWeight: 500, color: 'var(--accent)' }}>✓ Resume saved — no need to upload again.</p>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReplaceResume(true)}>Replace résumé</button>
                </div>
              ) : (
                <>
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
                  {hasSavedResume && replaceResume && (
                    <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: '0.5rem' }} onClick={() => { setReplaceResume(false); setResumeFile(null); }}>Keep saved résumé</button>
                  )}
                </>
              )}
            </div>

            <button 
              className="btn btn-primary" 
              onClick={startInterview}
              disabled={!resumeFile && !hasSavedResume}
              style={{ opacity: (!resumeFile && !hasSavedResume) ? 0.5 : 1, cursor: (!resumeFile && !hasSavedResume) ? 'not-allowed' : 'pointer' }}
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
              <div style={{ width: '100%', height: 'min(60vh, 600px)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: ariaSpeaking ? '2px solid var(--accent)' : '1px solid var(--line)', transition: 'border-color 0.3s' }}>
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
                  display: heygenReady ? 'block' : 'none',
                }}
              />
              {!heygenReady && (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.9rem', color: 'var(--text-2)', textAlign: 'center', padding: '1.5rem', background: 'radial-gradient(circle at 50% 35%, rgba(37,99,235,0.15), transparent 60%)' }}>
                  {avatarError ? (
                    <>
                      <XCircle size={38} style={{ color: 'var(--error-text, #ef4444)' }} />
                      <div style={{ fontWeight: 600 }}>Interviewer unavailable</div>
                      <div style={{ fontSize: '.85rem', maxWidth: 320 }}>
                        The AI avatar couldn&apos;t start (LiveAvatar session/credits). Please try again later.
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="spin" style={{ width: 40, height: 40, border: '3px solid var(--line)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.9rem' }}>
                        <Bot size={15} /> Connecting your interviewer…
                      </div>
                      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                    </>
                  )}
                </div>
              )}
              </div>
              <small>
                Alex &middot; AI Interviewer &middot;{' '}
                {avatarError ? 'Unavailable' : heygenReady ? (ariaSpeaking ? 'Speaking' : 'Live') : 'Connecting'}
              </small>
              <div className="wave" style={{ opacity: ariaSpeaking ? 1 : 0.3, transition: 'opacity 0.3s' }}>
                <i /><i /><i /><i /><i />
              </div>
            </div>

            {/* User Camera Pane */}
            <div style={{ background: 'var(--surface-solid)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ width: '100%', height: 'min(60vh, 600px)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: userSpeaking ? '2px solid var(--accent)' : '1px solid var(--line)', transition: 'border-color 0.3s' }}>
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
                  <span className="who">{isAI ? 'Alex' : 'You'}</span>
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
                <span className="who">Alex</span>
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
