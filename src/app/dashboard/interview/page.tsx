'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import RoleCombobox, { COMMON_ROLES } from '@/components/RoleCombobox';
import { INTERVIEWERS, DEFAULT_INTERVIEWER_ID, getInterviewer } from '@/lib/interview-avatars';
import {
  MessageSquare,
  Monitor,
  Brain,
  Sprout,
  Zap,
  Flame,
  Mic,
  Camera,
  CameraOff,
  SkipForward,
  Square,
  Clock,
  Target,
  XCircle,
  Bot,
  ArrowLeft,
} from 'lucide-react';
import DuolingoModal from '@/components/DuolingoModal';
import GamificationBar from '@/components/GamificationBar';
import {
  addXP,
  addGems,
  updateQuestProgress,
  unlockBadge,
  playDuoSound,
  loseHeart,
  refillHearts,
} from '@/lib/gamification';
import { saveInterview } from '@/lib/interview-store';
import { saveRecording } from '@/lib/recording-store';
import type { InterviewRecord } from '@/lib/interview-store';
import type { InterviewDecision, InterviewTranscriptMessage } from '@/lib/interview-decision';
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';
import { LiveAvatarSession, SessionEvent, AgentEventsEnum } from '@heygen/liveavatar-web-sdk';

type BrowserWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

type InterruptionReason = 'rambling' | 'avoiding_question' | 'time_pressure' | 'contradiction' | 'direct_answer';

type InterruptionTrace = {
  timestampSeconds: number;
  reason: InterruptionReason | 'candidate_barge_in';
  detail: string;
};

type DecisionTrace = {
  timestampSeconds: number;
  decision: InterviewDecision;
  reason: string;
  modelVersion: string;
};

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

// Comprehensive suggestion list for the target-role picker. Users can pick any
// of these or type a role that isn't listed. "Custom Job Description" stays at
// the end for the paste-your-own-JD flow.
const roleOptions = [...COMMON_ROLES, 'Custom Job Description'];

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
  }
  return window.btoa(binary);
}

// Turn-taking is deliberately more patient than a basic VAD endpoint. The
// extra pause for short/unpunctuated answers prevents the interviewer from
// jumping into a normal thinking pause while keeping completed turns fast.
const SILENCE_TIMEOUT_MS = 1500;
const THINKING_PAUSE_TIMEOUT_MS = 2200;
const RAMBLE_LIMIT_MS = 90000;
const INTERVIEW_DURATION_SECONDS = 30 * 60;
const NEAR_END_SECONDS = 24 * 60;
const CANDIDATE_QUESTION_SECONDS = 28 * 60;
const MAX_INTERVIEWER_INTERRUPTS = 3;
const INTERRUPTION_COOLDOWN_MS = 4 * 60 * 1000;
const MAX_QUESTIONS = 18;
const SESSION_MODELS = {
  clientOrchestrator: 'interview-ux-2026-08-24',
  stt: 'deepgram-nova-3',
  decisionAndLlm: 'server-selected:deepseek-v4-flash|llama-3.3-70b-instruct|deterministic-fallback',
  tts: 'server-selected:deepgram-aura-orion-en-default',
  avatar: 'liveavatar-lite-web-sdk@0.0.18',
} as const;

function average(values: number[]): number {
  return values.length > 0
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : 0;
}

function quoteClaim(value: string): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > 120 ? `${clean.slice(0, 117)}...` : clean;
}

export default function InterviewPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Setup state
  const [inRoom, setInRoom] = useState(false);
  const [selectedType, setSelectedType] = useState('hr');
  const [selectedDiff, setSelectedDiff] = useState('mid');
  // Empty by default: the user types whatever role they're targeting. The
  // suggestion list is only a shortcut, never a restriction.
  const [selectedRole, setSelectedRole] = useState('');
  const [customJD, setCustomJD] = useState('');
  const [interviewerId, setInterviewerId] = useState(DEFAULT_INTERVIEWER_ID);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState('');
  const [hasSavedResume, setHasSavedResume] = useState(false);
  const [replaceResume, setReplaceResume] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [demoStrikes, setDemoStrikes] = useState(0);

  // Room state
  const [seconds, setSeconds] = useState(0);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [transcript, setTranscript] = useState<InterviewTranscriptMessage[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // AI features state

  useEffect(() => {
    import('@/lib/resume-store').then(async ({ hydrateResumes, getLatestResume }) => {
      await hydrateResumes().catch(console.error);
      const saved = localStorage.getItem('interview_resume_text');
      if (saved) {
        setResumeText(saved);
        setHasSavedResume(true);
      } else {
        const latest = getLatestResume();
        if (latest && latest.extractedData) {
          const d = latest.extractedData;
          const text = [
            d.name && `Name: ${d.name}`,
            d.title && `Title: ${d.title}`,
            d.summary && `Summary: ${d.summary}`,
            d.experience?.length ? `Experience: ${d.experience.map(e => `${e.role} at ${e.company} (${e.date}) - ${e.desc}`).join('\\n')}` : '',
            d.education?.length ? `Education: ${d.education.map(e => `${e.degree} at ${e.school} (${e.date})`).join('\\n')}` : '',
            d.skills && `Skills: ${d.skills}`
          ].filter(Boolean).join('\\n\\n');
          setResumeText(text);
          localStorage.setItem('interview_resume_text', text);
          setHasSavedResume(true);
        }
      }
    });
  }, []);

  const [showSetup, setShowSetup] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  const [tabWarning, setTabWarning] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [showTerminatedModal, setShowTerminatedModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [ariaSpeaking, setAriaSpeaking] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [micActive, setMicActive] = useState(true);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [sessionNotice, setSessionNotice] = useState('');

  // HeyGen state
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
  const rambleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sttFinalSegmentsRef = useRef<string[]>([]);
  const processingAnswerRef = useRef(false);
  const conversationStartedRef = useRef(false);
  const candidateStoppedAtRef = useRef<number | null>(null);
  const pendingResponseStartedAtRef = useRef<number | null>(null);
  const responseLatenciesRef = useRef<number[]>([]);
  const sttLatenciesRef = useRef<number[]>([]);
  const orchestrationLatenciesRef = useRef<number[]>([]);
  const modelLatenciesRef = useRef<number[]>([]);
  const ttsLatenciesRef = useRef<number[]>([]);
  const avatarRenderLatenciesRef = useRef<number[]>([]);
  const pendingAvatarRenderAtRef = useRef<number | null>(null);
  const candidateInterruptionsRef = useRef(0);
  const interviewerRedirectsRef = useRef(0);
  const interviewerInterruptionsRef = useRef(0);
  const lastInterruptionAtRef = useRef(0);
  const pendingInterruptionReasonRef = useRef<InterruptionReason | null>(null);
  const interruptionTraceRef = useRef<InterruptionTrace[]>([]);
  const decisionTraceRef = useRef<DecisionTrace[]>([]);
  const unresolvedAreasRef = useRef<string[]>([]);
  const unresolvedRevisitDoneRef = useRef(false);
  const closingStageRef = useRef<'none' | 'candidate_questions' | 'complete'>('none');
  const sessionTraceIdRef = useRef('');
  const pendingAutoEndRef = useRef(false);
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
  const interviewerRef = useRef(interviewerId);
  const resumeTextRef = useRef(resumeText);
  const speakQuestionRef = useRef<((t: string) => Promise<void>) | null>(null);
  const processCandidateAnswerRef = useRef<((answer: string, forceMoveOn?: boolean) => Promise<void>) | null>(null);
  // LiveAvatar keep-alive heartbeat + session-duration guard timers.
  const keepAliveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionWarnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endInterviewCleanupRef = useRef<(() => void) | null>(null);
  // Guards against the end flow running twice (double-click / auto-end race).
  const endingRef = useRef(false);
  const timeWarningShownRef = useRef(false);
  const closingReminderShownRef = useRef(false);

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
  useEffect(() => { interviewerRef.current = interviewerId; }, [interviewerId]);
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

  // Resolves true if the avatar emits AVATAR_SPEAK_STARTED within `ms`.
  const waitAvatarStarted = (ms: number) => new Promise<boolean>((resolve) => {
    let waited = 0;
    const iv = setInterval(() => {
      waited += 100;
      if (avatarSpeakStartedRef.current) { clearInterval(iv); resolve(true); }
      else if (waited >= ms) { clearInterval(iv); resolve(false); }
    }, 100);
  });

  const recordResponseStart = useCallback(() => {
    if (pendingAvatarRenderAtRef.current !== null) {
      avatarRenderLatenciesRef.current.push(Math.max(0, Date.now() - pendingAvatarRenderAtRef.current));
      pendingAvatarRenderAtRef.current = null;
    }
    if (pendingResponseStartedAtRef.current === null) return;
    responseLatenciesRef.current.push(Date.now() - pendingResponseStartedAtRef.current);
    pendingResponseStartedAtRef.current = null;
  }, []);

  const requestInterviewerInterruption = useCallback((reason: InterruptionReason, detail: string) => {
    const now = Date.now();
    if (
      interviewerInterruptionsRef.current >= MAX_INTERVIEWER_INTERRUPTS
      || now - lastInterruptionAtRef.current < INTERRUPTION_COOLDOWN_MS
    ) {
      return false;
    }
    interviewerInterruptionsRef.current += 1;
    interviewerRedirectsRef.current += 1;
    lastInterruptionAtRef.current = now;
    pendingInterruptionReasonRef.current = reason;
    interruptionTraceRef.current.push({ timestampSeconds: secondsRef.current, reason, detail });
    return true;
  }, []);

  const playFallbackAudio = useCallback(async (text: string) => {
    try {
      const ttsStartedAt = Date.now();
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) return false;
      const blob = await response.blob();
      ttsLatenciesRef.current.push(Date.now() - ttsStartedAt);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      pendingAvatarRenderAtRef.current = Date.now();
      audio.onplaying = () => {
        avatarSpeakStartedRef.current = true;
        setAriaSpeaking(true);
        setSessionNotice('Audio-only mode is active; the interview is continuing normally.');
        recordResponseStart();
      };
      audio.onended = () => {
        avatarSpeakStartedRef.current = false;
        setAriaSpeaking(false);
        URL.revokeObjectURL(url);
        if (audioRef.current === audio) audioRef.current = null;
        if (pendingAutoEndRef.current) {
          pendingAutoEndRef.current = false;
          setTimeout(() => endInterviewCleanupRef.current?.(), 900);
        }
      };
      await audio.play();
      return true;
    } catch (error) {
      console.warn('Fallback interview audio failed.', error);
      return false;
    }
  }, [recordResponseStart]);

  // In LITE mode InterviewAce owns the voice pipeline. Deepgram produces
  // 24kHz PCM and LiveAvatar renders it with synchronized lip movement.
  const speakWithHeygen = useCallback(async (text: string) => {
    if (!avatarRef.current || !heygenReady) return false;
    try {
      const ttsStartedAt = Date.now();
      const ttsResponse = await fetch('/api/tts?format=pcm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(10000),
      });
      if (!ttsResponse.ok) return false;
      const pcm = await ttsResponse.arrayBuffer();
      ttsLatenciesRef.current.push(Date.now() - ttsStartedAt);
      avatarSpeakStartedRef.current = false;
      pendingAvatarRenderAtRef.current = Date.now();
      avatarRef.current.repeatAudio(arrayBufferToBase64(pcm));
    } catch (e) {
      console.warn('Avatar audio playback failed.', e);
      return false;
    }
    return await waitAvatarStarted(3500);
  }, [heygenReady]);

  const speakQuestion = useCallback(async (text: string) => {
    let spoke = false;
    if (heygenReady && avatarRef.current) {
      spoke = await speakWithHeygen(text);
      if (!spoke) {
        pendingAvatarRenderAtRef.current = null;
        spoke = await playFallbackAudio(text);
      }
    } else if (avatarError) {
      spoke = await playFallbackAudio(text);
    } else {
      pendingSpeechRef.current = text;
      return;
    }
    if (!spoke) {
      pendingAvatarRenderAtRef.current = null;
      setSessionNotice('Voice playback is temporarily unavailable. Follow the live transcript while the interview continues.');
      recordResponseStart();
      if (pendingAutoEndRef.current) {
        pendingAutoEndRef.current = false;
        setTimeout(() => endInterviewCleanupRef.current?.(), 1200);
      }
    }
  }, [avatarError, heygenReady, playFallbackAudio, recordResponseStart, speakWithHeygen]);

  useEffect(() => { speakQuestionRef.current = speakQuestion; }, [speakQuestion]);

  // Flush any queued line once the avatar is live, or continue audio-only if
  // the avatar provider is temporarily unavailable.
  useEffect(() => {
    if ((heygenReady || avatarError) && pendingSpeechRef.current) {
      const text = pendingSpeechRef.current;
      pendingSpeechRef.current = null;
      if (heygenReady) speakWithHeygen(text).then((ok) => { if (!ok) playFallbackAudio(text); });
      else playFallbackAudio(text);
    }
  }, [avatarError, heygenReady, playFallbackAudio, speakWithHeygen]);

  // The LiveAvatar SDK emits benign unhandled rejections from its internal
  // keep-alive polling (e.g. a transient "Session not found"). These are NOT
  // fatal, so we only stop them from crashing the dev overlay — we must NOT
  // touch avatar state here, or a stray poll error would wrongly mark the
  // working avatar as unavailable. Real failures come via SESSION_DISCONNECTED
  // and the start() catch instead.
  useEffect(() => {
    const handler = (e: PromiseRejectionEvent) => {
      const msg = e.reason instanceof Error ? e.reason.message : String(e.reason || '');
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
      // LITE mode keeps the avatar as the synchronized video layer while this
      // application owns listening, memory and next-question decisions.
      const diffLabel = difficulties.find((d) => d.id === selectedDiffRef.current)?.label || 'Intermediate';
      const res = await fetch('/api/liveavatar/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: selectedRoleRef.current,
          difficulty: diffLabel,
          customJD: customJDRef.current,
          resumeText: resumeTextRef.current,
          interviewer: interviewerRef.current,
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
      const session = new LiveAvatarSession(data.token, { voiceChat: false });
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

      session.on(SessionEvent.SESSION_STREAM_READY, tryAttach);
      session.on(SessionEvent.SESSION_DISCONNECTED, () => {
        setHeygenReady(false);
        setAvatarError(true);
        setSessionNotice('The avatar video disconnected. Audio and transcript mode will continue your interview.');
        if (avatarAttachPollRef.current) { clearInterval(avatarAttachPollRef.current); avatarAttachPollRef.current = null; }
      });

      // Drive the "Speaking" indicator from the avatar's real speech events.
      session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, () => {
        avatarSpeakStartedRef.current = true;
        setAriaSpeaking(true);
        setSessionNotice('');
        recordResponseStart();
      });
      session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, () => {
        avatarSpeakStartedRef.current = false;
        setAriaSpeaking(false);
        if (pendingAutoEndRef.current) {
          pendingAutoEndRef.current = false;
          setTimeout(() => endInterviewCleanupRef.current?.(), 900);
        }
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
      // Keep-alive heartbeat: the SDK does NOT ping automatically, so without
      // this the session can drop mid-interview (the earlier "Session not found"
      // disconnects). Ping every 25s while the session is live.
      if (keepAliveTimerRef.current) clearInterval(keepAliveTimerRef.current);
      keepAliveTimerRef.current = setInterval(() => {
        try { session.keepAlive?.(); } catch { /* transient, ignore */ }
      }, 25000);

      // The avatar provider may have a shorter plan limit than the interview.
      // Treat that as a video-layer limit, never as the interview's time limit:
      // warn, stop the avatar cleanly, and continue through audio + transcript.
      const maxSecs = session.maxSessionDuration;
      if (typeof maxSecs === 'number' && maxSecs > 30) {
        if (sessionWarnTimerRef.current) clearTimeout(sessionWarnTimerRef.current);
        if (sessionEndTimerRef.current) clearTimeout(sessionEndTimerRef.current);
        sessionWarnTimerRef.current = setTimeout(() => {
          if (inRoomRef.current) toast('Avatar video will switch to audio-only mode soon. Your interview will continue.');
        }, Math.max(0, (maxSecs - 30) * 1000));
        sessionEndTimerRef.current = setTimeout(() => {
          if (inRoomRef.current) {
            setSessionNotice('Avatar time limit reached. Continuing in audio and transcript mode.');
            setHeygenReady(false);
            setAvatarError(true);
            void session.stop().catch(() => { /* audio fallback remains available */ });
            avatarRef.current = null;
          }
        }, Math.max(0, (maxSecs - 5) * 1000));
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
  }, [recordResponseStart, toast]);

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
    setHeygenReady(false);
    if (heygenVideoRef.current) {
      heygenVideoRef.current.srcObject = null;
    }
  }, []);

  // Conversation decisions are generated by InterviewAce and then rendered by
  // the avatar, so transcript, memory, testing and live behavior stay aligned.

  const processCandidateAnswer = useCallback(async (rawAnswer: string, forceMoveOn = false) => {
    const answer = rawAnswer.replace(/\s+/g, ' ').trim();
    if (!answer || processingAnswerRef.current || endingRef.current) return;

    processingAnswerRef.current = true;
    setIsThinking(true);
    setUserSpeaking(false);
    setLiveTranscript('');
    const candidateStoppedAt = candidateStoppedAtRef.current ?? Date.now();
    pendingResponseStartedAtRef.current = candidateStoppedAt;
    sttLatenciesRef.current.push(Math.max(0, Date.now() - candidateStoppedAt));
    candidateStoppedAtRef.current = null;

    const candidateMessage: InterviewTranscriptMessage = {
      who: 'me',
      text: answer,
      timestampSeconds: secondsRef.current,
    };
    const nextTranscript = [...transcriptRef2.current, candidateMessage];
    transcriptRef2.current = nextTranscript;
    setTranscript(nextTranscript);
    const interruptionReason = pendingInterruptionReasonRef.current;
    pendingInterruptionReasonRef.current = null;
    const withInterruptionPhrase = (text: string) => {
      if (!interruptionReason) return text;
      const phrase = interruptionReason === 'time_pressure'
        ? 'Sorry to interrupt—we are close to time, so I need a direct answer.'
        : interruptionReason === 'rambling'
          ? 'Sorry to interrupt—let me bring us back to the question.'
          : 'Sorry to interrupt—what specifically was your responsibility?';
      return `${phrase} ${text}`;
    };

    try {
      // The candidate-question turn is part of the interview, not an abrupt
      // timer redirect. Their answer receives a short, realistic closing.
      if (closingStageRef.current === 'candidate_questions') {
        const closing = `Thank you for your questions and for the thoughtful conversation today. That concludes our interview for the ${selectedRoleRef.current} role. We appreciate your time.`;
        const closingMessage: InterviewTranscriptMessage = {
          who: 'ai',
          text: closing,
          decision: 'MOVE_ON',
          timestampSeconds: secondsRef.current,
        };
        const completedTranscript = [...nextTranscript, closingMessage];
        closingStageRef.current = 'complete';
        pendingAutoEndRef.current = true;
        transcriptRef2.current = completedTranscript;
        setTranscript(completedTranscript);
        await speakQuestionRef.current?.(closing);
        return;
      }

      // In the final six minutes, deliberately revisit one high-value area
      // that earlier probing left unresolved before beginning the close.
      if (
        secondsRef.current >= NEAR_END_SECONDS
        && !unresolvedRevisitDoneRef.current
        && unresolvedAreasRef.current.length > 0
      ) {
        unresolvedRevisitDoneRef.current = true;
        const unresolved = unresolvedAreasRef.current.shift() as string;
        const revisit = withInterruptionPhrase(`Before we wrap up, I want to return to something you mentioned earlier: “${quoteClaim(unresolved)}” What concrete evidence or personal contribution best supports that claim?`);
        const revisitMessage: InterviewTranscriptMessage = {
          who: 'ai', text: revisit, decision: 'EVIDENCE', timestampSeconds: secondsRef.current,
        };
        decisionTraceRef.current.push({
          timestampSeconds: secondsRef.current,
          decision: 'EVIDENCE',
          reason: 'Near-end reprioritization of a high-value unresolved claim.',
          modelVersion: SESSION_MODELS.clientOrchestrator,
        });
        const completedTranscript = [...nextTranscript, revisitMessage];
        transcriptRef2.current = completedTranscript;
        setTranscript(completedTranscript);
        setQuestionIdx((count) => count + 1);
        await speakQuestionRef.current?.(revisit);
        return;
      }

      // Reserve the final two minutes for the candidate, as a real interviewer
      // would, even if the dynamic question engine has reached its question cap.
      if (secondsRef.current >= CANDIDATE_QUESTION_SECONDS) {
        const candidateQuestion = withInterruptionPhrase('Before we finish, what questions would you like to ask about the role, the team, or the work itself?');
        const candidateQuestionMessage: InterviewTranscriptMessage = {
          who: 'ai', text: candidateQuestion, decision: 'MOVE_ON', timestampSeconds: secondsRef.current,
        };
        decisionTraceRef.current.push({
          timestampSeconds: secondsRef.current,
          decision: 'MOVE_ON',
          reason: 'Reserved the final interview section for candidate questions.',
          modelVersion: SESSION_MODELS.clientOrchestrator,
        });
        const completedTranscript = [...nextTranscript, candidateQuestionMessage];
        closingStageRef.current = 'candidate_questions';
        transcriptRef2.current = completedTranscript;
        setTranscript(completedTranscript);
        setQuestionIdx((count) => count + 1);
        await speakQuestionRef.current?.(candidateQuestion);
        return;
      }

      const diffLabel = difficulties.find((d) => d.id === selectedDiffRef.current)?.label || 'Intermediate';
      const typeLabel = interviewTypes.find((t) => t.id === selectedTypeRef.current)?.label || 'Mixed';
      const apiStartedAt = Date.now();
      const response = await fetch('/api/interview/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: nextTranscript,
          role: selectedRoleRef.current,
          difficulty: diffLabel,
          interviewType: typeLabel,
          customJD: customJDRef.current,
          resumeText: resumeTextRef.current,
          forceMoveOn,
          maxQuestions: MAX_QUESTIONS,
          sessionTraceId: sessionTraceIdRef.current,
          elapsedSeconds: secondsRef.current,
          remainingSeconds: Math.max(0, INTERVIEW_DURATION_SECONDS - secondsRef.current),
          unresolvedAreas: unresolvedAreasRef.current.slice(0, 4),
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error(`Interview response failed (${response.status})`);
      const data = await response.json();
      const totalDecisionLatency = typeof data?.latencyMs === 'number'
        ? data.latencyMs
        : Date.now() - apiStartedAt;
      const modelLatency = typeof data?.modelLatencyMs === 'number' ? data.modelLatencyMs : 0;
      orchestrationLatenciesRef.current.push(Math.max(0, totalDecisionLatency - modelLatency));
      if (modelLatency > 0) modelLatenciesRef.current.push(modelLatency);

      let reply = typeof data?.reply === 'string' && data.reply.trim()
        ? data.reply.trim()
        : 'Thank you. Tell me about another project that best demonstrates your fit for this role.';

      const claims = Array.isArray(data?.claims)
        ? data.claims.filter((claim: unknown): claim is string => typeof claim === 'string')
        : [];
      if (claims.length > 0) candidateMessage.claims = claims;

      const decision = (data?.decision || 'MOVE_ON') as InterviewDecision;
      decisionTraceRef.current.push({
        timestampSeconds: secondsRef.current,
        decision,
        reason: typeof data?.reason === 'string' ? data.reason : 'Dynamic interview decision.',
        modelVersion: typeof data?.modelVersion === 'string'
          ? data.modelVersion
          : data?.usedFallback === true
            ? 'deterministic-decision-layer'
            : 'server-configured-llm',
      });
      if (['PROBE', 'CLARIFY', 'CHALLENGE', 'COUNTER', 'EVIDENCE', 'CONTRADICTION'].includes(decision)) {
        const unresolved = claims[0] || answer;
        if (unresolved && !unresolvedAreasRef.current.includes(unresolved)) {
          unresolvedAreasRef.current = [...unresolvedAreasRef.current.slice(-4), unresolved];
        }
      } else if (decision === 'MOVE_ON' && unresolvedAreasRef.current.length > 1) {
        unresolvedAreasRef.current.shift();
      }

      reply = withInterruptionPhrase(reply);

      if (forceMoveOn || (data?.decision === 'MOVE_ON' && answer.split(/\s+/).length > 250)) {
        interviewerRedirectsRef.current += 1;
      }

      if (data?.complete === true) {
        reply = 'Before we finish, what questions would you like to ask about the role, the team, or the work itself?';
        closingStageRef.current = 'candidate_questions';
      }

      const aiMessage: InterviewTranscriptMessage = {
        who: 'ai',
        text: reply,
        decision,
        latencyMs: totalDecisionLatency,
        timestampSeconds: secondsRef.current,
      };
      const completedTranscript = [...nextTranscript, aiMessage];
      transcriptRef2.current = completedTranscript;
      setTranscript(completedTranscript);
      setQuestionIdx((count) => count + 1);
      await speakQuestionRef.current?.(reply);
    } catch (error) {
      console.warn('Could not generate the next interview turn.', error);
      const fallback = 'Thank you. Tell me about another project that best demonstrates your fit for this role.';
      const completedTranscript: InterviewTranscriptMessage[] = [
        ...nextTranscript,
        { who: 'ai', text: fallback, decision: 'MOVE_ON', timestampSeconds: secondsRef.current },
      ];
      transcriptRef2.current = completedTranscript;
      setTranscript(completedTranscript);
      setQuestionIdx((count) => count + 1);
      await speakQuestionRef.current?.(fallback);
    } finally {
      processingAnswerRef.current = false;
      setIsThinking(false);
      if (sttFinalSegmentsRef.current.length > 0 && !silenceTimerRef.current) {
        silenceTimerRef.current = setTimeout(() => {
          silenceTimerRef.current = null;
          const queued = sttFinalSegmentsRef.current.join(' ').trim();
          sttFinalSegmentsRef.current = [];
          if (queued) processCandidateAnswerRef.current?.(queued);
        }, 500);
      }
    }
  }, []);

  useEffect(() => { processCandidateAnswerRef.current = processCandidateAnswer; }, [processCandidateAnswer]);

  const startConversation = useCallback(async () => {
    if (conversationStartedRef.current || endingRef.current) return;
    conversationStartedRef.current = true;
    setIsThinking(true);
    if (!sessionTraceIdRef.current) sessionTraceIdRef.current = crypto.randomUUID();
    try {
      const diffLabel = difficulties.find((d) => d.id === selectedDiffRef.current)?.label || 'Intermediate';
      const typeLabel = interviewTypes.find((t) => t.id === selectedTypeRef.current)?.label || 'Mixed';
      const apiStartedAt = Date.now();
      const response = await fetch('/api/interview/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: [],
          role: selectedRoleRef.current,
          difficulty: diffLabel,
          interviewType: typeLabel,
          customJD: customJDRef.current,
          resumeText: resumeTextRef.current,
          maxQuestions: MAX_QUESTIONS,
          sessionTraceId: sessionTraceIdRef.current,
          elapsedSeconds: secondsRef.current,
          remainingSeconds: INTERVIEW_DURATION_SECONDS,
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error('Opening question failed');
      const data = await response.json();
      const totalDecisionLatency = typeof data?.latencyMs === 'number' ? data.latencyMs : Date.now() - apiStartedAt;
      const modelLatency = typeof data?.modelLatencyMs === 'number' ? data.modelLatencyMs : 0;
      orchestrationLatenciesRef.current.push(Math.max(0, totalDecisionLatency - modelLatency));
      if (modelLatency > 0) modelLatenciesRef.current.push(modelLatency);
      const resumeContext = resumeTextRef.current
        ? 'I’ve reviewed the background you shared, so I may return to specific projects or claims as we talk.'
        : 'We’ll focus on your experience and how you would approach the role.';
      const opening = `Thanks for joining me. I’m ${getInterviewer(interviewerRef.current).name}. We’ll have a roughly 30-minute ${typeLabel.toLowerCase()} conversation for the ${selectedRoleRef.current} role. ${resumeContext} Take your time, and feel free to ask me to repeat a question. ${data.reply}`;
      decisionTraceRef.current.push({
        timestampSeconds: secondsRef.current,
        decision: 'MOVE_ON',
        reason: typeof data?.reason === 'string' ? data.reason : 'Contextual interview opening.',
        modelVersion: typeof data?.modelVersion === 'string' ? data.modelVersion : 'deterministic-decision-layer',
      });
      const firstMessage: InterviewTranscriptMessage = {
        who: 'ai',
        text: opening,
        decision: 'MOVE_ON',
        latencyMs: totalDecisionLatency,
        timestampSeconds: secondsRef.current,
      };
      transcriptRef2.current = [firstMessage];
      setTranscript([firstMessage]);
      setQuestionIdx(1);
      await speakQuestionRef.current?.(opening);
    } catch (error) {
      console.warn('Could not start the interview conversation.', error);
      const opening = `Thanks for joining me. I’m ${getInterviewer(interviewerRef.current).name}. We’ll spend about 30 minutes discussing your fit for the ${selectedRoleRef.current} role. To begin, walk me through the experience that best prepared you for this opportunity.`;
      const firstMessage: InterviewTranscriptMessage = { who: 'ai', text: opening, decision: 'MOVE_ON' };
      transcriptRef2.current = [firstMessage];
      setTranscript([firstMessage]);
      setQuestionIdx(1);
      await speakQuestionRef.current?.(opening);
    } finally {
      setIsThinking(false);
    }
  }, []);

  useEffect(() => {
    if (inRoom) startConversation();
  }, [inRoom, startConversation]);

  const offerCandidateQuestions = useCallback(async () => {
    if (closingStageRef.current !== 'none' || processingAnswerRef.current || endingRef.current) return;
    const text = 'We’re nearing the end of our time. Before we finish, what questions would you like to ask about the role, the team, or the work itself?';
    const message: InterviewTranscriptMessage = {
      who: 'ai', text, decision: 'MOVE_ON', timestampSeconds: secondsRef.current,
    };
    const completedTranscript = [...transcriptRef2.current, message];
    closingStageRef.current = 'candidate_questions';
    transcriptRef2.current = completedTranscript;
    setTranscript(completedTranscript);
    setQuestionIdx((count) => count + 1);
    await speakQuestionRef.current?.(text);
  }, []);

  const closeAtTimeLimit = useCallback(async () => {
    if (closingStageRef.current === 'complete' || endingRef.current || processingAnswerRef.current) return;
    const text = 'We’re at the end of our scheduled time, so I’ll close us there. Thank you for the conversation and for sharing your experience today.';
    const message: InterviewTranscriptMessage = {
      who: 'ai', text, decision: 'MOVE_ON', timestampSeconds: secondsRef.current,
    };
    const completedTranscript = [...transcriptRef2.current, message];
    closingStageRef.current = 'complete';
    pendingAutoEndRef.current = true;
    transcriptRef2.current = completedTranscript;
    setTranscript(completedTranscript);
    await speakQuestionRef.current?.(text);
  }, []);

  useEffect(() => {
    if (!inRoom || endingRef.current) return;
    if (seconds >= 25 * 60 && !timeWarningShownRef.current) {
      timeWarningShownRef.current = true;
      toast('About five minutes remain. The interviewer will prioritize unresolved areas and then wrap up.');
    }
    if (seconds >= CANDIDATE_QUESTION_SECONDS && !closingReminderShownRef.current) {
      closingReminderShownRef.current = true;
      setSessionNotice('Final section: resolving the highest-value open area and making space for your questions.');
    }
    if (
      seconds >= 29 * 60 + 20
      && closingStageRef.current === 'none'
      && !userSpeaking
      && !ariaSpeaking
      && !isThinking
    ) {
      void offerCandidateQuestions();
    }
    // Allow the current answer/closing question to finish, but do not let the
    // session drift indefinitely beyond its 30-minute budget.
    if (
      seconds >= INTERVIEW_DURATION_SECONDS + 15
      && !userSpeaking
      && !ariaSpeaking
      && !isThinking
    ) {
      void closeAtTimeLimit();
    }
  }, [ariaSpeaking, closeAtTimeLimit, inRoom, isThinking, offerCandidateQuestions, seconds, toast, userSpeaking]);

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
        ctx.fillText(`${getInterviewer(interviewerRef.current).name} · AI Interviewer`, 14, 469);
        ctx.fillText('You · Candidate', 654, 469);
        recordRafRef.current = requestAnimationFrame(draw);
      };
      draw();

      const canvasStream = canvas.captureStream(30);

      // Mix candidate mic + avatar audio into a single track.
      const AC = window.AudioContext || (window as BrowserWindow).webkitAudioContext;
      if (!AC) return;
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
      let settled = false;
      const finalize = () => {
        if (settled) return;
        settled = true;
        try { recordAudioCtxRef.current?.close(); } catch { /* ignore */ }
        recordAudioCtxRef.current = null;
        combinedRecorderRef.current = null;
        const chunks = combinedChunksRef.current;
        resolve(chunks.length ? new Blob(chunks, { type: 'video/webm' }) : null);
      };
      if (!rec || rec.state === 'inactive') { finalize(); return; }
      rec.onstop = finalize;
      // Safety net: if onstop never fires (browser quirk), finalize anyway after
      // 4s so ending the interview can never hang.
      setTimeout(finalize, 4000);
      try { rec.stop(); } catch { finalize(); }
    });
  }, []);

  // ─── End Interview with cleanup ───
  const endInterviewCleanup = useCallback(async () => {
    // Never run the end sequence more than once.
    if (endingRef.current) return;
    endingRef.current = true;
    // Immediate visual feedback so the red button feels responsive.
    setIsFinalizing(true);
    setIsThinking(true);

    // Stop timer
    if (timerRef.current) clearInterval(timerRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (rambleTimerRef.current) clearTimeout(rambleTimerRef.current);
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

    try { await stopHeygen(); } catch (e) { console.warn('stopHeygen failed', e); }

    let currentTranscript = transcriptRef2.current;
    const pendingCandidateText = sttFinalSegmentsRef.current.join(' ').replace(/\s+/g, ' ').trim();
    sttFinalSegmentsRef.current = [];
    if (pendingCandidateText) {
      currentTranscript = [
        ...currentTranscript,
        { who: 'me', text: pendingCandidateText, timestampSeconds: secondsRef.current },
      ];
    }
    const currentSeconds = secondsRef.current;
    const currentQuestionIdx = questionIdxRef.current;
    const currentType = selectedTypeRef.current;
    const currentRole = selectedRoleRef.current;
    const currentDiff = selectedDiffRef.current;

    const typeLabel = interviewTypes.find((t) => t.id === currentType)?.label ?? 'HR Round';
    const diffLabel = difficulties.find((d) => d.id === currentDiff)?.label ?? 'Intermediate';
    const questionsAsked = currentQuestionIdx;

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
    let perQuestion: InterviewRecord['perQuestion'];
    let highlights: InterviewRecord['highlights'];

    // Try the AI evaluation, but NEVER let a failure block the report. If the
    // evaluate API errors or times out (e.g. a missing key in production), we
    // still save the record with defaults and take the user to their report.
    try {
      const res = await fetch('/api/interview/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: currentTranscript, role: currentRole, difficulty: diffLabel }),
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && !data.error) {
          score = typeof data.score === 'number' ? data.score : score;
          metrics = data.metrics || metrics;
          feedback = data.feedback || feedback;
          // The AI's per-question breakdown and quoted evidence. Keep them only
          // when present — saveInterview() backfills a deterministic version
          // otherwise, so the report is never left without a breakdown.
          if (Array.isArray(data.perQuestion) && data.perQuestion.length > 0) perQuestion = data.perQuestion;
          if (data.highlights) highlights = data.highlights;
        }
      } else {
        console.warn('Evaluate API returned', res.status);
      }
    } catch (err) {
      console.warn('Evaluate API failed; using default report.', err);
    }

    const interviewId = `iv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const responseLatencies = responseLatenciesRef.current;
    const modelLatencies = modelLatenciesRef.current;
    const pipelineTelemetry = {
      traceId: sessionTraceIdRef.current || interviewId,
      models: SESSION_MODELS,
      sttLatenciesMs: sttLatenciesRef.current,
      averageSttLatencyMs: average(sttLatenciesRef.current),
      orchestrationLatenciesMs: orchestrationLatenciesRef.current,
      averageOrchestrationLatencyMs: average(orchestrationLatenciesRef.current),
      llmLatenciesMs: modelLatencies,
      averageLlmLatencyMs: average(modelLatencies),
      ttsLatenciesMs: ttsLatenciesRef.current,
      averageTtsLatencyMs: average(ttsLatenciesRef.current),
      avatarRenderLatenciesMs: avatarRenderLatenciesRef.current,
      averageAvatarRenderLatencyMs: average(avatarRenderLatenciesRef.current),
      interviewerInterruptions: interviewerInterruptionsRef.current,
      interruptionTrace: interruptionTraceRef.current,
      decisionTrace: decisionTraceRef.current,
      unresolvedAreasAtClose: unresolvedAreasRef.current,
      targetDurationSeconds: INTERVIEW_DURATION_SECONDS,
    };
    const performance: NonNullable<InterviewRecord['performance']> & { pipeline: typeof pipelineTelemetry } = {
      responseLatenciesMs: responseLatencies,
      averageResponseLatencyMs: average(responseLatencies),
      modelLatenciesMs: modelLatencies,
      averageModelLatencyMs: average(modelLatencies),
      candidateInterruptions: candidateInterruptionsRef.current,
      interviewerRedirects: interviewerRedirectsRef.current,
      pipeline: pipelineTelemetry,
    };
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
      perQuestion,
      highlights,
      performance,
    };

    try { saveInterview(record); } catch (e) { console.warn('saveInterview failed', e); }
    if (videoBlob && videoBlob.size > 0) {
      try { await saveRecording(interviewId, videoBlob); } catch { /* recording is best-effort */ }
    }
    // Gamification awards & progress
    try {
      addXP(80);
      addGems(20);
      updateQuestProgress('daily_interview', 1);
      if (score >= 90) unlockBadge('score_90');
      if (strikes === 0) unlockBadge('flawless_round');
      unlockBadge('first_interview');
      playDuoSound('levelup');
    } catch (err) {
      console.warn('Gamification update error', err);
    }
    router.push(`/dashboard/analysis?id=${interviewId}`);
  }, [stopHeygen, router, stopCombinedRecording, strikes]);

  // Expose the latest cleanup to the session-cap timer set up inside initHeygen.
  useEffect(() => { endInterviewCleanupRef.current = endInterviewCleanup; }, [endInterviewCleanup]);

  // ─── Candidate mic + streaming transcription ───
  const handleCandidateBargeIn = useCallback(() => {
    const aiWasSpeaking = avatarSpeakStartedRef.current
      || (!!audioRef.current && !audioRef.current.paused && !audioRef.current.ended);
    if (!aiWasSpeaking) return;

    candidateInterruptionsRef.current += 1;
    interruptionTraceRef.current.push({
      timestampSeconds: secondsRef.current,
      reason: 'candidate_barge_in',
      detail: 'Candidate began speaking while interviewer audio was active; playback stopped and context was preserved.',
    });
    try { avatarRef.current?.interrupt(); } catch { /* avatar may already be idle */ }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    avatarSpeakStartedRef.current = false;
    pendingAvatarRenderAtRef.current = null;
    setAriaSpeaking(false);
    setSessionNotice('You interrupted naturally. I stopped speaking and kept the question context.');
    if (pendingAutoEndRef.current) {
      pendingAutoEndRef.current = false;
      closingStageRef.current = 'candidate_questions';
    }
  }, []);

  const initDeepgram = useCallback(async () => {
    try {
      let stream = mediaStreamRef.current;
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
      }

      const startServerTranscription = () => {
        const preferredMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : '';
        let chunks: BlobPart[] = [];
        let fallbackRecorder: MediaRecorder | null = null;

        const startRecorder = () => {
          if (!inRoomRef.current || endingRef.current) return;
          fallbackRecorder = preferredMime
            ? new MediaRecorder(stream, { mimeType: preferredMime })
            : new MediaRecorder(stream);
          fallbackRecorder.ondataavailable = (event) => {
            if (event.data.size > 0 && micActiveRef.current) chunks.push(event.data);
          };
          fallbackRecorder.start(250);
          mediaRecorderRef.current = fallbackRecorder;
        };

        const transcribeUtterance = () => {
          if (!fallbackRecorder || fallbackRecorder.state === 'inactive') return;
          fallbackRecorder.onstop = async () => {
            const utteranceChunks = chunks;
            chunks = [];
            const contentType = preferredMime || fallbackRecorder?.mimeType || 'audio/webm';
            startRecorder();
            if (utteranceChunks.length === 0 || endingRef.current) return;

            try {
              setLiveTranscript('Transcribing…');
              const audio = new Blob(utteranceChunks, { type: contentType });
              const response = await fetch('/api/stt', {
                method: 'POST',
                headers: { 'Content-Type': contentType },
                body: audio,
                signal: AbortSignal.timeout(25_000),
              });
              if (!response.ok) throw new Error('Server transcription failed');
              const data = await response.json();
              const answer = String(data.transcript || '').replace(/\s+/g, ' ').trim();
              setLiveTranscript('');
              if (!answer) return;
              if (processingAnswerRef.current) {
                sttFinalSegmentsRef.current.push(answer);
              } else {
                processCandidateAnswerRef.current?.(answer);
              }
            } catch (error) {
              console.warn('Server transcription failed.', error);
              setLiveTranscript('');
              toast('Speech recognition missed that answer. Please try speaking again.');
            }
          };
          fallbackRecorder.stop();
        };

        const scheduleServerTurn = () => {
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            silenceTimerRef.current = null;
            transcribeUtterance();
          }, THINKING_PAUSE_TIMEOUT_MS);
        };

        startRecorder();

        const AudioContextClass = window.AudioContext || (window as BrowserWindow).webkitAudioContext;
        if (!AudioContextClass) return;
        const audioCtx = new AudioContextClass();
        const analyser = audioCtx.createAnalyser();
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 256;
        const levels = new Uint8Array(analyser.frequencyBinCount);
        let wasSpeaking = false;

        const checkFallbackVolume = () => {
          if (!inRoomRef.current || endingRef.current) {
            audioCtx.close().catch(() => undefined);
            return;
          }

          analyser.getByteFrequencyData(levels);
          let total = 0;
          for (let index = 0; index < levels.length; index += 1) total += levels[index];
          const speaking = micActiveRef.current && total / levels.length > 5;

          if (speaking && !wasSpeaking) {
            candidateStoppedAtRef.current = null;
            setUserSpeaking(true);
            setLiveTranscript('Listening…');
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = null;
            }

            handleCandidateBargeIn();

            if (rambleTimerRef.current) clearTimeout(rambleTimerRef.current);
            rambleTimerRef.current = setTimeout(() => {
              const reason: InterruptionReason = secondsRef.current >= CANDIDATE_QUESTION_SECONDS
                ? 'time_pressure'
                : 'rambling';
              if (requestInterviewerInterruption(reason, 'Candidate answer exceeded the calibrated continuous-speech threshold.')) {
                candidateStoppedAtRef.current = Date.now();
                transcribeUtterance();
              }
            }, RAMBLE_LIMIT_MS);
          } else if (!speaking && wasSpeaking) {
            candidateStoppedAtRef.current = Date.now();
            setUserSpeaking(false);
            if (rambleTimerRef.current) {
              clearTimeout(rambleTimerRef.current);
              rambleTimerRef.current = null;
            }
            scheduleServerTurn();
          }

          wasSpeaking = speaking;
          requestAnimationFrame(checkFallbackVolume);
        };
        checkFallbackVolume();
      };

      const tokenResponse = await fetch('/api/stt/token', { cache: 'no-store' });
      if (!tokenResponse.ok) {
        console.info('Using secure server-side speech transcription.');
        startServerTranscription();
        return;
      }
      const { token } = await tokenResponse.json();
      if (!token) {
        startServerTranscription();
        return;
      }

      const params = new URLSearchParams({
        model: 'nova-3',
        language: 'en-US',
        smart_format: 'true',
        punctuate: 'true',
        numerals: 'true',
        interim_results: 'true',
        endpointing: '650',
        utterance_end_ms: '1500',
        vad_events: 'true',
      });
      const socket = new WebSocket(`wss://api.deepgram.com/v1/listen?${params.toString()}`, ['bearer', token]);
      dgSocketRef.current = socket;

      const scheduleCandidateTurn = () => {
        if (candidateStoppedAtRef.current === null) {
          candidateStoppedAtRef.current = Date.now() - 650;
        }
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        const currentText = sttFinalSegmentsRef.current.join(' ').trim();
        const wordCount = currentText ? currentText.split(/\s+/).length : 0;
        const pauseMs = wordCount > 0 && (wordCount < 6 || !/[.!?]$/.test(currentText))
          ? THINKING_PAUSE_TIMEOUT_MS
          : SILENCE_TIMEOUT_MS;
        silenceTimerRef.current = setTimeout(() => {
          silenceTimerRef.current = null;
          if (processingAnswerRef.current) {
            scheduleCandidateTurn();
            return;
          }
          const finalAnswer = sttFinalSegmentsRef.current.join(' ').replace(/\s+/g, ' ').trim();
          sttFinalSegmentsRef.current = [];
          setLiveTranscript('');
          if (finalAnswer) processCandidateAnswerRef.current?.(finalAnswer);
        }, pauseMs);
      };

      socket.onopen = () => {
        const preferredMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : '';
        const recorder = preferredMime
          ? new MediaRecorder(stream, { mimeType: preferredMime })
          : new MediaRecorder(stream);
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0 && socket.readyState === WebSocket.OPEN && micActiveRef.current) {
            socket.send(event.data);
          }
        };
        recorder.start(250);
        mediaRecorderRef.current = recorder;
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'SpeechStarted') {
            candidateStoppedAtRef.current = null;
            setUserSpeaking(true);
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = null;
            }

            handleCandidateBargeIn();

            if (rambleTimerRef.current) clearTimeout(rambleTimerRef.current);
            rambleTimerRef.current = setTimeout(() => {
              const reason: InterruptionReason = secondsRef.current >= CANDIDATE_QUESTION_SECONDS
                ? 'time_pressure'
                : 'rambling';
              if (requestInterviewerInterruption(reason, 'Candidate answer exceeded the calibrated continuous-speech threshold.')) {
                if (socket.readyState === WebSocket.OPEN) {
                  socket.send(JSON.stringify({ type: 'Finalize' }));
                }
                scheduleCandidateTurn();
              }
            }, RAMBLE_LIMIT_MS);
            return;
          }

          if (data.type === 'Results') {
            const text = String(data?.channel?.alternatives?.[0]?.transcript || '').trim();
            if (data.is_final && text) {
              const last = sttFinalSegmentsRef.current[sttFinalSegmentsRef.current.length - 1];
              if (last !== text) sttFinalSegmentsRef.current.push(text);
            }
            const preview = [...sttFinalSegmentsRef.current, data.is_final ? '' : text]
              .filter(Boolean)
              .join(' ')
              .trim();
            setLiveTranscript(preview);
            if (data.speech_final) scheduleCandidateTurn();
            return;
          }

          if (data.type === 'UtteranceEnd') scheduleCandidateTurn();
        } catch {
          // Ignore malformed provider events and keep the interview running.
        }
      };

      socket.onerror = () => {
        toast('Live speech recognition had a connection issue. Please continue speaking while it reconnects.');
      };
      socket.onclose = () => {
        if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
      };

      const AudioContextClass = window.AudioContext || (window as BrowserWindow).webkitAudioContext;
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
      console.warn('Live transcription could not start.', err);
      toast('Could not start live speech recognition. Please check microphone access and speech-service settings.');
    }
  }, [handleCandidateBargeIn, requestInterviewerInterruption, toast]);

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
    if (!selectedRole.trim()) {
      toast('Enter the role you are interviewing for.');
      return;
    }
    if (!selectedType || !selectedDiff) {
      toast('Please complete all selections before starting.');
      return;
    }
    // A résumé is optional: with one the questions are personalised to it,
    // without one the AI interviews against the target role alone.
    setShowSetup(true);
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setResumeFile(file);
      setIsUploadingResume(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/resume/extract', { method: 'POST', body: formData });
        if (res.ok) {
          const { text } = await res.json();
          if (text) {
            setResumeText(text);
            localStorage.setItem('interview_resume_text', text);
            setHasSavedResume(true);
            toast('Résumé processed and saved.');
          }
        } else {
          toast('Failed to extract text from résumé.');
        }

        // Fire and forget DB save
        const atsFormData = new FormData();
        atsFormData.append('file', file);
        atsFormData.append('targetRole', selectedRole === 'Custom Job Description' ? (customJD.slice(0, 50) || 'Custom Role') : selectedRole);
        
        fetch('/api/ats/analyze', { method: 'POST', body: atsFormData })
          .then(res => res.json())
          .then(data => {
            if (data && data.atsScore !== undefined) {
              import('@/lib/resume-store').then(({ saveResume }) => {
                saveResume({
                  id: crypto.randomUUID(),
                  fileName: file.name,
                  fileUrl: data.fileUrl || 'local',
                  uploadDate: new Date().toISOString(),
                  targetRole: selectedRole === 'Custom Job Description' ? 'Custom Role' : selectedRole,
                  atsScore: data.atsScore,
                  breakdown: data.breakdown,
                  missingKeywords: data.missingKeywords || [],
                  presentKeywords: data.presentKeywords || [],
                  suggestions: data.suggestions || [],
                  extractedData: data.extractedData,
                });
              });
            }
          })
          .catch(e => console.error("Background ATS save failed:", e));

      } catch (err) {
        console.error('Resume extract error', err);
        toast('An error occurred while parsing the résumé.');
      } finally {
        setIsUploadingResume(false);
      }
    }
  };

  const handleJoinAfterSetup = async () => {
    setShowSetup(false);
    setConnecting(true);

    // Initialize HeyGen (non-blocking)
    initHeygen();

    // Show "Connecting..." for 2 seconds before entering room
    setTimeout(() => {
      setConnecting(false);
      setInRoom(true);
    }, 2000);
  };

  // Initialize live transcription when entering the room.
  useEffect(() => {
    if (inRoom) {
      initDeepgram();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inRoom]);

  // ─── Skip / next question ───
  const advanceQuestion = useCallback(() => {
    try { avatarRef.current?.interrupt(); } catch { /* already idle */ }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    avatarSpeakStartedRef.current = false;
    setAriaSpeaking(false);
    processCandidateAnswerRef.current?.("I'd prefer to skip this question and move on.", true);
  }, []);



  const handleExitToDashboard = useCallback(() => {
    if (endingRef.current) return;
    endingRef.current = true;

    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }

    if (timerRef.current) clearInterval(timerRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (rambleTimerRef.current) clearTimeout(rambleTimerRef.current);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (dgSocketRef.current && dgSocketRef.current.readyState === WebSocket.OPEN) dgSocketRef.current.close();
    dgSocketRef.current = null;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach((track) => track.stop()); }
    if (cameraStreamRef.current) { cameraStreamRef.current.getTracks().forEach((track) => track.stop()); }
    try { stopHeygen(); } catch {}

    setInRoom(false);
    setShowQuitModal(false);
    setTabWarning(false);
    setShowTerminatedModal(false);
    router.push('/dashboard');
  }, [router, stopHeygen]);

  const endInterview = () => {
    if (endingRef.current) return;
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(e => console.log(e));
    }
    // Run the full cleanup+report flow. If it ever throws synchronously, still
    // take the user out of the room so they are never stuck on this screen.
    Promise.resolve()
      .then(() => endInterviewCleanup())
      .catch((e) => {
        console.error('endInterviewCleanup crashed; navigating to history.', e);
        router.push('/dashboard/history');
      });
  };

  // ─── Cleanup on unmount ───
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (rambleTimerRef.current) clearTimeout(rambleTimerRef.current);
      if (keepAliveTimerRef.current) clearInterval(keepAliveTimerRef.current);
      if (sessionWarnTimerRef.current) clearTimeout(sessionWarnTimerRef.current);
      if (sessionEndTimerRef.current) clearTimeout(sessionEndTimerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (dgSocketRef.current && dgSocketRef.current.readyState <= WebSocket.OPEN) {
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
      avatarRef.current?.stop().catch(() => {});
      avatarRef.current = null;
      try { recordAudioCtxRef.current?.close(); } catch { /* ignore */ }
    };
  }, []);

  const handleDemoStrike = () => {
    setDemoStrikes((s) => (s + 1) % 4);
  };


  // ─── Tab Switch Warning & 3-Strike System ───
  useEffect(() => {
    if (!inRoom) return;

    const pauseAI = () => {
      avatarSpeakStartedRef.current = false;
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
        setStrikes((s) => {
          const next = s + 1;
          loseHeart();
          playDuoSound('wrong');
          return next;
        });
      }
    };
    const handleBlur = () => {
      pauseAI();
      setTabWarning(true);
      setStrikes((s) => {
        const next = s + 1;
        loseHeart();
        playDuoSound('wrong');
        return next;
      });
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
              toast("Face not detected for 5 seconds. Please stay in the frame! Life lost.");
              setStrikes((s) => {
                const next = s + 1;
                loseHeart();
                playDuoSound('wrong');
                return next;
              });
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
      playDuoSound('wrong');
      setShowTerminatedModal(true);
      setTabWarning(false);
      if (heygenVideoRef.current) {
        heygenVideoRef.current.muted = true;
        try { heygenVideoRef.current.pause(); } catch { /* ignore */ }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strikes]);

  const formattedTime = `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
  const remainingSeconds = Math.max(0, INTERVIEW_DURATION_SECONDS - seconds);
  const formattedRemaining = `${pad(Math.floor(remainingSeconds / 60))}:${pad(remainingSeconds % 60)}`;
  const conversationStatus = ariaSpeaking
    ? `${getInterviewer(interviewerId).name} is speaking`
    : userSpeaking
      ? 'Listening to you'
      : isThinking
        ? 'Preparing the next question'
        : micActive
          ? 'Listening - speak when you are ready'
          : 'Microphone unavailable';

  // ─── SETUP MODAL ───
  const requestPermissions = async () => {
    try {
      setSetupError('');
      if (!consentGiven) {
        setSetupError('Please confirm the recording and transcript disclosure before continuing.');
        return;
      }

      sessionTraceIdRef.current = crypto.randomUUID();
      responseLatenciesRef.current = [];
      sttLatenciesRef.current = [];
      orchestrationLatenciesRef.current = [];
      modelLatenciesRef.current = [];
      ttsLatenciesRef.current = [];
      avatarRenderLatenciesRef.current = [];
      interruptionTraceRef.current = [];
      decisionTraceRef.current = [];
      unresolvedAreasRef.current = [];
      unresolvedRevisitDoneRef.current = false;
      closingStageRef.current = 'none';
      interviewerInterruptionsRef.current = 0;
      lastInterruptionAtRef.current = 0;
      timeWarningShownRef.current = false;
      closingReminderShownRef.current = false;

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
    } catch {
      setSetupError('Please allow camera and microphone access to continue.');
    }
  };

  // ─── FULLSCREEN WRAPPER ───
  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflowY: 'auto', ...(inRoom ? { position: 'fixed', inset: 0, zIndex: 2000, width: '100vw', height: '100vh', padding: '1.25rem 1.5rem' } : { width: '100%', height: '100%' }) }}>
      {/* 1. Tab Switch / Focus Loss Warning Modal (Duolingo Style) */}
      <DuolingoModal
        isOpen={tabWarning && strikes < 3}
        type="strike_warning"
        title="⚠️ Screen Switched!"
        subtitle="You navigated away from the interview room. Please stay on this tab to simulate a real proctored interview. Losing all 3 lives will terminate the session."
        heartsRemaining={Math.max(0, 3 - strikes)}
        maxHearts={3}
        primaryButtonText="I'm Ready — Resume Interview"
        onPrimaryClick={() => {
          setTabWarning(false);
          if (heygenVideoRef.current) {
            heygenVideoRef.current.muted = false;
            heygenVideoRef.current.play().catch(() => {});
          }
          if (containerRef.current?.requestFullscreen) {
            containerRef.current.requestFullscreen().catch(() => {});
          }
        }}
        secondaryButtonText="Exit to Dashboard"
        onSecondaryClick={handleExitToDashboard}
      />

      {/* 2. Out of Lives / Terminated Modal */}
      <DuolingoModal
        isOpen={showTerminatedModal || strikes >= 3}
        type="terminated"
        title="Out of Lives / Interview Ended"
        subtitle="You received 3 strikes for navigating away or leaving the camera view. Don't worry, every mock session is a valuable learning experience!"
        heartsRemaining={0}
        maxHearts={3}
        primaryButtonText="Return to Dashboard"
        onPrimaryClick={handleExitToDashboard}
        secondaryButtonText="Try Again with Full Lives"
        onSecondaryClick={() => {
          refillHearts();
          setStrikes(0);
          setShowTerminatedModal(false);
          setTabWarning(false);
          setInRoom(false);
          setShowSetup(false);
        }}
      />

      {/* 3. Exit Confirmation Modal ("Wait, don't leave!") */}
      <DuolingoModal
        isOpen={showQuitModal}
        type="quit_warning"
        title="Wait, don't leave!"
        subtitle="You're doing great in your mock interview! If you quit now, this session's streak bonus and answer feedback will not be recorded."
        heartsRemaining={Math.max(0, 3 - strikes)}
        maxHearts={3}
        primaryButtonText="Keep Practicing"
        onPrimaryClick={() => setShowQuitModal(false)}
        secondaryButtonText="Quit & Go Back"
        onSecondaryClick={handleExitToDashboard}
        onClose={() => setShowQuitModal(false)}
      />

      {connecting ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem', flex: 1 }}>
          <div style={{ fontSize: '3rem', animation: 'duoBounce 1.5s infinite' }}>🤖</div>
          <h3 style={{ margin: 0 }}>Connecting to your interviewer...</h3>
          <p style={{ color: 'var(--text-2)', margin: 0 }}>Preparing your practice room</p>
        </div>
      ) : !inRoom ? (
        <>
          {showSetup && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ background: 'var(--surface-solid)', padding: '2rem', borderRadius: 'var(--r-lg)', border: '1px solid var(--line)', maxWidth: 520, width: 'calc(100% - 2rem)', textAlign: 'left' }}>
                <h3 style={{ marginBottom: '.65rem' }}>Before your interview</h3>
                <p style={{ color: 'var(--text-2)', marginBottom: '1rem', fontSize: '0.9rem', lineHeight: 1.55 }}>
                  This 30-minute practice session uses your camera and microphone. With your consent, InterviewAce records the combined session, creates a timestamped transcript, and analyzes both to prepare your private feedback report. Session data is stored with your account and used for your interview history and practice features.
                </p>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '.7rem', padding: '.85rem', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', background: 'var(--card)', marginBottom: '1rem', cursor: 'pointer', fontSize: '.86rem', lineHeight: 1.45 }}>
                  <input
                    type="checkbox"
                    checked={consentGiven}
                    onChange={(event) => setConsentGiven(event.target.checked)}
                    style={{ marginTop: '.2rem', flexShrink: 0 }}
                  />
                  <span>I understand and consent to camera/microphone access, session recording, transcription, and AI analysis for this mock interview.</span>
                </label>
                {setupError && <div style={{ color: 'var(--error-text)', marginBottom: '1rem', fontSize: '0.85rem' }}>{setupError}</div>}
                <button className="btn-duo btn-duo-green" onClick={requestPermissions} disabled={!consentGiven} style={{ width: '100%', justifyContent: 'center', opacity: consentGiven ? 1 : .55 }}>
                  Consent &amp; Enable Devices
                </button>
                <button className="btn-duo btn-duo-ghost" onClick={() => setShowSetup(false)} style={{ width: '100%', justifyContent: 'center', marginTop: '0.6rem' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
          <div className="app-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2>Set up your mock interview</h2>
              <p>Configure your session and enter the gamified practice arena.</p>
            </div>
            <GamificationBar />
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

            <h4>3 &middot; Your interviewer</h4>
            <div className="iv-picker" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '.6rem', marginBottom: '1.4rem' }}>
              {INTERVIEWERS.map((p) => {
                const sel = interviewerId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setInterviewerId(p.id)}
                    title={p.blurb}
                    style={{
                      textAlign: 'left', padding: '.8rem .85rem', borderRadius: 12, cursor: 'pointer',
                      background: sel ? `${p.accent}1a` : 'var(--card)',
                      border: sel ? `2px solid ${p.accent}` : '1px solid var(--line)',
                      transition: 'all .15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.55rem', marginBottom: '.35rem' }}>
                      <span style={{ width: 30, height: 30, borderRadius: '50%', background: p.accent, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: '.85rem', flexShrink: 0 }}>
                        {p.name.charAt(0)}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '.92rem' }}>{p.name}</span>
                    </div>
                    <div style={{ fontSize: '.76rem', fontWeight: 600, color: p.accent, marginBottom: '.15rem' }}>{p.title}</div>
                    <div style={{ fontSize: '.74rem', color: 'var(--text-2)', lineHeight: 1.4 }}>{p.blurb}</div>
                  </button>
                );
              })}
            </div>

            <h4>4 &middot; Target role</h4>
            <div className="field" style={{ marginBottom: '0.8rem' }}>
              {/* Free text. The suggestion list is a shortcut only — any role in
                  the world can be typed and used verbatim. */}
              <RoleCombobox
                value={selectedRole}
                onChange={setSelectedRole}
                options={roleOptions}
                placeholder="Type any role you're interviewing for…"
              />
              <small style={{ display: 'block', marginTop: '0.4rem', color: 'var(--text-2)' }}>
                Type any job title — if it isn&apos;t in the list, we&apos;ll use exactly what you enter.
              </small>
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

            <h4>
              5 &middot; Upload Resume
              <span style={{ marginLeft: '.5rem', fontSize: '.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-3)', border: '1px solid var(--line)', borderRadius: 999, padding: '.12rem .5rem' }}>
                Optional
              </span>
            </h4>
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
                    accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    onChange={handleResumeUpload}
                    disabled={isUploadingResume}
                    style={{ padding: '0.8rem', background: 'var(--card)', borderRadius: 'var(--r-md)', border: '1px solid var(--line)', opacity: isUploadingResume ? 0.6 : 1, cursor: isUploadingResume ? 'not-allowed' : 'pointer' }}
                  />
                  {isUploadingResume && <small style={{ display: 'block', marginTop: '0.4rem', color: 'var(--accent)' }}>Uploading and analyzing your résumé... Please wait.</small>}
                  <small style={{ display: 'block', marginTop: '0.4rem', color: 'var(--text-2)' }}>
                    Optional — upload a PDF, DOCX, or plain-text résumé and the AI will tailor questions to your actual experience. Skip it and you&apos;ll be interviewed on the target role alone.
                  </small>
                  {hasSavedResume && replaceResume && (
                    <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: '0.5rem' }} onClick={() => { setReplaceResume(false); setResumeFile(null); }}>Keep saved résumé</button>
                  )}
                </>
              )}
            </div>

            <button
              className="btn-duo btn-duo-green btn-duo-lg"
              onClick={startInterview}
              disabled={!selectedRole.trim()}
              title={!selectedRole.trim() ? 'Enter the role you are interviewing for' : undefined}
              style={{ width: '100%', opacity: !selectedRole.trim() ? 0.5 : 1, cursor: !selectedRole.trim() ? 'not-allowed' : 'pointer' }}
            >
              <Mic size={20} />
              Start Practice Session
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
                <span>The interview is planned for about 30 minutes, including time for your questions.</span>
              </div>
              <div className="rule">
                <span className="ic"><Target size={16} /></span>
                <span>Speak naturally. Brief thinking pauses are expected; no push-to-talk control is needed.</span>
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
        {isFinalizing && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(4,7,18,0.82)', backdropFilter: 'blur(8px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '1.25rem', textAlign: 'center', padding: '1.5rem',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              border: '3px solid rgba(255,255,255,0.15)', borderTopColor: 'var(--accent, #3b82f6)',
              animation: 'atsSpin 0.9s linear infinite',
            }} />
            <div>
              <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem' }}>Analyzing your interview…</h2>
              <p style={{ color: 'var(--text-2)', margin: 0, maxWidth: 420 }}>
                Scoring your answers and preparing your report card. This takes just a few seconds.
              </p>
            </div>
            <style>{`@keyframes atsSpin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
      <div className="app-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            type="button"
            className="btn-duo btn-duo-ghost btn-duo-sm"
            onClick={() => setShowQuitModal(true)}
            title="Exit to Dashboard"
            style={{ padding: '0.45rem 0.85rem', gap: '0.4rem', fontSize: '0.84rem' }}
          >
            <ArrowLeft size={16} /> Exit
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Interview room</h2>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-2)' }}>
              {interviewTypes.find((t) => t.id === selectedType)?.label} &middot;{' '}
              {selectedRole} &middot;{' '}
              {difficulties.find((d) => d.id === selectedDiff)?.label}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ textAlign: 'right' }}>
            <span className="timer" title={`Elapsed ${formattedTime}`}>{formattedRemaining} remaining</span>
          </div>
          {/* Duolingo Practice Lives Display */}
          <div
            className="room-hearts-box"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'rgba(255, 75, 75, 0.1)',
              padding: '0.35rem 0.75rem',
              borderRadius: '999px',
              border: '1px solid rgba(255, 75, 75, 0.25)',
            }}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  fontSize: '1.1rem',
                  filter: i < (3 - strikes) ? 'drop-shadow(0 2px 4px rgba(255,75,75,0.5))' : 'grayscale(1) opacity(0.3)',
                  transition: 'all 0.3s',
                }}
              >
                {i < (3 - strikes) ? '❤️' : '🤍'}
              </span>
            ))}
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ff4b4b', marginLeft: '0.2rem' }}>
              {Math.max(0, 3 - strikes)}/3
            </span>
          </div>
        </div>
      </div>

      <div
        aria-live="polite"
        role="status"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
          padding: '.65rem .9rem', marginBottom: '.8rem', borderRadius: 'var(--r-md)',
          border: '1px solid var(--line)', background: 'var(--surface-solid)', fontSize: '.85rem',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '.55rem', fontWeight: 650 }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: ariaSpeaking ? '#8b5cf6' : userSpeaking ? '#22c55e' : isThinking ? '#f59e0b' : '#3b82f6', boxShadow: '0 0 0 4px rgba(59,130,246,.12)' }} />
          {conversationStatus}
        </span>
        {sessionNotice && <span style={{ color: 'var(--text-2)', textAlign: 'right' }}>{sessionNotice}</span>}
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
                      <div style={{ fontWeight: 600 }}>Audio interview mode</div>
                      <div style={{ fontSize: '.85rem', maxWidth: 320 }}>
                        The avatar video is unavailable, but voice and transcript mode are continuing normally.
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
                {getInterviewer(interviewerId).name} &middot; AI Interviewer &middot;{' '}
                {avatarError ? (ariaSpeaking ? 'Speaking in audio mode' : 'Listening in audio mode') : heygenReady ? (ariaSpeaking ? 'Speaking' : userSpeaking ? 'Listening' : 'Ready') : 'Connecting'}
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
                {micActive ? (userSpeaking ? 'Speaking' : ariaSpeaking ? 'Listening' : isThinking ? 'Waiting' : 'Ready') : 'Microphone unavailable'}
              </small>
              <div className="wave" style={{ opacity: userSpeaking ? 1 : 0.3, transition: 'opacity 0.3s' }}>
                <i /><i /><i /><i /><i />
              </div>
            </div>
          </div>

          <div className="room-controls" style={{ marginTop: 'auto', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '1rem' }}>
            <button className="btn-duo btn-duo-ghost btn-duo-sm" title="Skip this question" onClick={advanceQuestion}>
              <SkipForward size={18} />
              <span>Skip Question</span>
            </button>
            <button className="btn-duo btn-duo-red btn-duo-sm" title="End or leave interview" onClick={() => setShowQuitModal(true)}>
              <Square size={18} />
              <span>Quit &amp; Exit</span>
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
                  <span className="who">{isAI ? getInterviewer(interviewerId).name : 'You'}</span>
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
                <span className="who">{getInterviewer(interviewerId).name}</span>
                {ariaSpeaking ? (
                  <>Speaking…</>
                ) : isThinking ? (
                  <>Considering your answer…<span className="caret" /></>
                ) : micActive ? (
                  <>Listening — speak naturally when ready<span className="caret" /></>
                ) : (
                  <>Microphone unavailable</>
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
