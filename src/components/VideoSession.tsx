'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MeetingProvider, useMeeting, useParticipant } from '@videosdk.live/react-sdk';
import { Mic, MicOff, Video, VideoOff, PhoneOff, ScreenShare, ScreenShareOff, Loader2, AlertCircle, Settings, Circle, Square as StopIcon, Volume2, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase';

type Role = 'coach' | 'student' | 'monitor';

export interface TileMedia { video: HTMLVideoElement | null; micStream: MediaStream | null; }

// Google Meet-inspired palette (kept local so the call UI is consistent
// regardless of the surrounding app theme).
const MEET = {
  bg: '#202124',
  surface: '#2d2e31',
  tile: '#3c4043',
  tileEmpty: '#292a2d',
  line: 'rgba(255,255,255,0.10)',
  text: '#e8eaed',
  textDim: '#9aa0a6',
  blue: '#8ab4f8',
  blueSolid: '#1a73e8',
  red: '#ea4335',
  green: '#34a853',
};

// ───────────────────────── Audio ─────────────────────────
// Dedicated, always-mounted audio sink per remote participant. Decoupling
// audio from the video tiles is what makes sound reliable — it keeps playing
// no matter how the video layout changes (grid ↔ screen-share). Retries play()
// whenever `playSignal` changes so a "click to enable sound" button can recover
// from the browser's autoplay policy.
function RemoteAudio({ participantId, playSignal, onBlocked }: { participantId: string; playSignal: number; onBlocked: () => void }) {
  const { micStream, micOn, isLocal, screenShareAudioStream } = useParticipant(participantId);
  const micRef = useRef<HTMLAudioElement>(null);
  const scrRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = micRef.current;
    if (!el || isLocal) return;
    if (micOn && micStream?.track) {
      el.srcObject = new MediaStream([micStream.track]);
      el.play().catch(() => onBlocked());
    } else {
      el.srcObject = null;
    }
  }, [micStream, micOn, isLocal, playSignal, onBlocked]);

  useEffect(() => {
    const el = scrRef.current;
    if (!el || isLocal) return;
    if (screenShareAudioStream?.track) {
      el.srcObject = new MediaStream([screenShareAudioStream.track]);
      el.play().catch(() => onBlocked());
    } else {
      el.srcObject = null;
    }
  }, [screenShareAudioStream, isLocal, playSignal, onBlocked]);

  if (isLocal) return null;
  return (
    <>
      <audio ref={micRef} autoPlay playsInline />
      <audio ref={scrRef} autoPlay playsInline />
    </>
  );
}

// ───────────────────────── Video tile ─────────────────────────
function ParticipantTile({ participantId, label, accent, onReady, compact = false }: {
  participantId: string; label: string; accent: string; onReady?: (id: string, media: TileMedia) => void; compact?: boolean;
}) {
  const { webcamStream, micStream, webcamOn, micOn, isLocal, displayName, isActiveSpeaker } = useParticipant(participantId);
  const videoRef = useRef<HTMLVideoElement>(null);

  const videoStream = useMemo(() => {
    if (webcamOn && webcamStream?.track) {
      const ms = new MediaStream();
      ms.addTrack(webcamStream.track);
      return ms;
    }
    return null;
  }, [webcamStream, webcamOn]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = videoStream;
      if (videoStream) videoRef.current.play().catch(() => {});
    }
  }, [videoStream]);

  // Report the video element + mic stream up so the recorder can composite.
  useEffect(() => {
    const ms = micStream?.track ? new MediaStream([micStream.track]) : null;
    onReady?.(participantId, { video: videoRef.current, micStream: ms });
  }, [participantId, micStream, onReady]);

  const name = displayName || 'Guest';
  const initial = name.charAt(0).toUpperCase();

  return (
    <div style={{
      position: 'relative', background: MEET.tile, borderRadius: 16, overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%',
      boxShadow: isActiveSpeaker && micOn ? `0 0 0 3px ${MEET.blue}` : 'none',
      transition: 'box-shadow .15s ease',
    }}>
      {webcamOn ? (
        <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: isLocal ? 'scaleX(-1)' : 'none' }} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.7rem' }}>
          <div style={{
            width: compact ? 52 : 92, height: compact ? 52 : 92, borderRadius: '50%',
            background: accent, display: 'grid', placeItems: 'center',
            fontSize: compact ? '1.3rem' : '2.4rem', fontWeight: 600, color: '#fff',
          }}>{initial}</div>
        </div>
      )}

      {/* Accent seat badge (top-left) */}
      {!compact && (
        <div style={{ position: 'absolute', top: 12, left: 12, background: accent, color: '#fff', padding: '.25rem .7rem', borderRadius: 999, fontSize: '.72rem', fontWeight: 700, letterSpacing: '.03em' }}>
          {label}
        </div>
      )}

      {/* Name chip (bottom-left) */}
      <div style={{ position: 'absolute', bottom: 10, left: 10, display: 'flex', alignItems: 'center', gap: '.4rem', background: 'rgba(0,0,0,0.55)', color: '#fff', padding: '.28rem .6rem', borderRadius: 8, fontSize: compact ? '.72rem' : '.82rem', fontWeight: 500, backdropFilter: 'blur(4px)' }}>
        {!micOn && <MicOff size={compact ? 12 : 14} color={MEET.red} />}
        <span>{name}{isLocal ? ' (You)' : ''}</span>
      </div>
    </div>
  );
}

// A seat that shows a participant or a "waiting" placeholder.
function SeatTile({ id, label, accent, onReady, compact }: { id: string | null; label: string; accent: string; onReady?: (id: string, media: TileMedia) => void; compact?: boolean }) {
  if (id) return <ParticipantTile participantId={id} label={label} accent={accent} onReady={onReady} compact={compact} />;
  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '.7rem', color: MEET.textDim, background: MEET.tileEmpty, borderRadius: 16, border: `1px solid ${MEET.line}` }}>
      <Loader2 size={22} style={{ animation: 'vs-spin 1s linear infinite' }} />
      <span style={{ fontSize: compact ? '.75rem' : '.9rem' }}>Waiting for {label.toLowerCase()}…</span>
    </div>
  );
}

// Screen-share main stage.
function ScreenShareView({ participantId }: { participantId: string }) {
  const { screenShareStream, screenShareOn, displayName } = useParticipant(participantId);
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && screenShareOn && screenShareStream?.track) {
      ref.current.srcObject = new MediaStream([screenShareStream.track]);
      ref.current.play().catch(() => {});
    }
  }, [screenShareStream, screenShareOn]);
  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', background: '#000', borderRadius: 16, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <video ref={ref} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: '.4rem', background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '.3rem .7rem', borderRadius: 999, fontSize: '.78rem', fontWeight: 600 }}>
        <ScreenShare size={14} /> {displayName || 'Someone'} is presenting
      </div>
    </div>
  );
}

// ───────────────────────── Control button ─────────────────────────
function Control({ children, label, onClick, danger = false, highlight = false, disabled = false }: {
  children: React.ReactNode; label: string; onClick: () => void; danger?: boolean; highlight?: boolean; disabled?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const bg = danger ? MEET.red : highlight ? MEET.blueSolid : hover ? '#4a4d51' : MEET.tile;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.4rem' }}>
      <button onClick={onClick} title={label} disabled={disabled}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        style={{ width: 52, height: 52, borderRadius: '50%', background: bg, border: 'none', color: '#fff', cursor: disabled ? 'default' : 'pointer', display: 'grid', placeItems: 'center', transition: 'background .15s ease', opacity: disabled ? 0.5 : 1 }}>
        {children}
      </button>
      <span style={{ fontSize: '.68rem', color: MEET.textDim, fontWeight: 500 }}>{label}</span>
    </div>
  );
}

function elapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const mm = String(m).padStart(2, '0'), ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// ───────────────────────── Meeting view ─────────────────────────
function MeetingView({ role, leaveHref, roomId, canRecord }: { role: Role; leaveHref: string; roomId: string; canRecord: boolean }) {
  const router = useRouter();
  const isMonitor = role === 'monitor';
  const [joined, setJoined] = useState(false);
  const [joinedAt, setJoinedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [micEnabled, setMicEnabled] = useState(!isMonitor);
  const [camEnabled, setCamEnabled] = useState(!isMonitor);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [showDevices, setShowDevices] = useState(false);
  const [cams, setCams] = useState<{ deviceId: string; label: string }[]>([]);
  const [mics, setMics] = useState<{ deviceId: string; label: string }[]>([]);
  const [activeCam, setActiveCam] = useState('');
  const [activeMic, setActiveMic] = useState('');
  const joinedRef = useRef(false);

  // Audio autoplay unlock
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [playSignal, setPlaySignal] = useState(0);
  const onAudioBlocked = useCallback(() => setAudioBlocked(true), []);

  // ── Session recording (coach / admin only) ──
  const [recording, setRecording] = useState(false);
  const [savingRecording, setSavingRecording] = useState(false);
  const tileRegistry = useRef<Map<string, TileMedia>>(new Map());
  const registerTile = useRef((id: string, media: TileMedia) => { tileRegistry.current.set(id, media); }).current;
  const recRafRef = useRef<number | null>(null);
  const recAudioCtxRef = useRef<AudioContext | null>(null);
  const recRecorderRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<BlobPart[]>([]);

  const { join, leave, toggleMic, toggleWebcam, enableScreenShare, disableScreenShare, changeWebcam, changeMic, getWebcams, getMics, participants, localParticipant, presenterId } = useMeeting({
    onMeetingJoined: () => { setJoined(true); setJoinedAt(Date.now()); setJoinError(null); },
    onMeetingLeft: () => router.push(leaveHref),
    onError: (err: any) => {
      console.error('VideoSDK meeting error:', err);
      setJoinError(err?.message || err?.code || 'Could not connect to the session.');
    },
  });

  const joinFn = useRef(join);
  joinFn.current = join;

  useEffect(() => {
    if (joinedRef.current) return;
    joinedRef.current = true;
    (async () => {
      if (!isMonitor) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
          stream.getTracks().forEach((t) => t.stop());
        } catch (e: any) {
          setJoinError(
            e?.name === 'NotAllowedError'
              ? 'Camera/microphone permission was blocked. Allow access in your browser and reload.'
              : 'No camera/microphone available. Connect a device and reload.',
          );
          return;
        }
      }
      try { joinFn.current(); } catch (e: any) { setJoinError(e?.message || 'Failed to join the session.'); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Elapsed-time ticker
  useEffect(() => {
    if (!joinedAt) return;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [joinedAt]);

  useEffect(() => {
    if (joined) return;
    const t = setTimeout(() => setJoinError((prev) => prev ?? 'Connection timed out. Check your network and try again.'), 20000);
    return () => clearTimeout(t);
  }, [joined]);

  // Device discovery + prefer a real webcam.
  useEffect(() => {
    if (!joined) return;
    (async () => {
      try {
        const w = (await getWebcams?.()) || [];
        const m = (await getMics?.()) || [];
        const camList = w.map((d: any) => ({ deviceId: d.deviceId, label: d.label || 'Camera' }));
        const micList = m.map((d: any) => ({ deviceId: d.deviceId, label: d.label || 'Microphone' }));
        setCams(camList);
        setMics(micList);
        const isVirtual = (l: string) => /(obs|virtual|screen|broadcast|capture|ndi|snap|manycam|droidcam)/i.test(l);
        const isRealCam = (l: string) => /(webcam|usb|integrated|facetime|hd cam|uvc|built-?in)/i.test(l);
        const preferred = camList.find((c) => isRealCam(c.label) && !isVirtual(c.label)) || camList.find((c) => !isVirtual(c.label)) || camList[0];
        if (preferred) { setActiveCam(preferred.deviceId); try { await changeWebcam?.(preferred.deviceId); } catch { /* ignore */ } }
        if (micList[0]) setActiveMic(micList[0].deviceId);
      } catch { /* ignore */ }
    })();
  }, [joined, getWebcams, getMics, changeWebcam]);

  async function pickCam(deviceId: string) { setActiveCam(deviceId); try { await changeWebcam?.(deviceId); } catch { /* ignore */ } }
  async function pickMic(deviceId: string) { setActiveMic(deviceId); try { await changeMic?.(deviceId); } catch { /* ignore */ } }

  const localId = localParticipant?.id || null;
  const remoteIds = [...participants.keys()].filter((id) => id !== localId);
  const allIds = [localId, ...remoteIds].filter(Boolean) as string[];

  // Fixed seating: Coach LEFT, Student RIGHT, regardless of who is local.
  const remoteId = remoteIds[0] || null;
  const coachId = isMonitor ? (remoteIds[0] || null) : role === 'coach' ? localId : remoteId;
  const studentId = isMonitor ? (remoteIds[1] || null) : role === 'student' ? localId : remoteId;
  const seatLabel = (id: string | null, fallback: string) => (id && (participants.get(id) as any)?.displayName) || fallback;

  const isSharingLocally = !!presenterId && presenterId === localId;
  const someoneSharing = !!presenterId;

  const toggleScreen = useCallback(async () => {
    try {
      if (isSharingLocally) disableScreenShare();
      else await enableScreenShare();
    } catch {
      // User cancelled the browser's screen picker — nothing to do.
    }
  }, [isSharingLocally, enableScreenShare, disableScreenShare]);

  const enableSound = () => { setAudioBlocked(false); setPlaySignal((n) => n + 1); };

  // ── Recording: composite both seats + mix both mics ──
  const startRecording = () => {
    if (recRecorderRef.current) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1280; canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const drawCover = (video: HTMLVideoElement | null | undefined, dx: number, dy: number, dw: number, dh: number) => {
        if (!video || video.readyState < 2) return;
        const vw = video.videoWidth, vh = video.videoHeight;
        if (!vw || !vh) return;
        const scale = Math.max(dw / vw, dh / vh);
        const sw = dw / scale, sh = dh / scale;
        ctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, dx, dy, dw, dh);
      };
      const draw = () => {
        ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, 1280, 480);
        drawCover(coachId ? tileRegistry.current.get(coachId)?.video : null, 0, 0, 640, 480);
        drawCover(studentId ? tileRegistry.current.get(studentId)?.video : null, 640, 0, 640, 480);
        ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 446, 1280, 34);
        ctx.fillStyle = '#fff'; ctx.font = '16px Inter, sans-serif';
        ctx.fillText('Coach', 14, 469); ctx.fillText('Student', 654, 469);
        recRafRef.current = requestAnimationFrame(draw);
      };
      draw();
      const canvasStream = canvas.captureStream(30);
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const actx: AudioContext = new AC();
      recAudioCtxRef.current = actx;
      const dest = actx.createMediaStreamDestination();
      const addAudio = (stream: MediaStream | null | undefined) => {
        try { const tracks = stream?.getAudioTracks?.() ?? []; if (tracks.length) actx.createMediaStreamSource(new MediaStream(tracks)).connect(dest); } catch { /* ignore */ }
      };
      addAudio(coachId ? tileRegistry.current.get(coachId)?.micStream : null);
      addAudio(studentId ? tileRegistry.current.get(studentId)?.micStream : null);
      const combined = new MediaStream([...canvasStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
      recChunksRef.current = [];
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' : 'video/webm';
      const rec = new MediaRecorder(combined, { mimeType: mime });
      rec.ondataavailable = (e) => { if (e.data.size > 0) recChunksRef.current.push(e.data); };
      rec.start(1000);
      recRecorderRef.current = rec;
      setRecording(true);
    } catch (e) { console.warn('Recording could not start.', e); }
  };

  const stopRecording = () => {
    if (recRafRef.current) { cancelAnimationFrame(recRafRef.current); recRafRef.current = null; }
    const rec = recRecorderRef.current;
    if (!rec || rec.state === 'inactive') return;
    setSavingRecording(true);
    rec.onstop = async () => {
      try { recAudioCtxRef.current?.close(); } catch { /* ignore */ }
      recAudioCtxRef.current = null; recRecorderRef.current = null; setRecording(false);
      const blob = recChunksRef.current.length ? new Blob(recChunksRef.current, { type: 'video/webm' }) : null;
      recChunksRef.current = [];
      if (!blob) { setSavingRecording(false); return; }
      try {
        const supabase = createClient();
        const path = `${roomId}/${Date.now()}.webm`;
        const { error: upErr } = await supabase.storage.from('session-recordings').upload(path, blob, { contentType: 'video/webm' });
        if (upErr) throw upErr;
        await supabase.from('bookings').update({ recording_url: path }).eq('room_id', roomId);
      } catch (e) { console.warn('Could not save the recording.', e); }
      finally { setSavingRecording(false); }
    };
    rec.stop();
  };

  useEffect(() => () => {
    if (recRafRef.current) cancelAnimationFrame(recRafRef.current);
    if (recRecorderRef.current && recRecorderRef.current.state !== 'inactive') recRecorderRef.current.stop();
    try { recAudioCtxRef.current?.close(); } catch { /* ignore */ }
  }, []);

  if (!joined) {
    if (joinError) {
      return (
        <div className="widget" style={{ textAlign: 'center', padding: '3rem 1rem', maxWidth: 480, margin: '2rem auto' }}>
          <AlertCircle size={40} style={{ color: 'var(--amber, #F59E0B)', marginBottom: '1rem' }} />
          <h3 style={{ marginBottom: '.5rem' }}>Could not connect</h3>
          <p style={{ color: 'var(--text-2)' }}>{joinError}</p>
          <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'center', marginTop: '1rem' }}>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>Try again</button>
            <button className="btn btn-ghost" onClick={() => router.push(leaveHref)}>Go back</button>
          </div>
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <Loader2 size={32} style={{ animation: 'vs-spin 1s linear infinite' }} />
        <h3 style={{ margin: 0 }}>Connecting to your session…</h3>
        <style>{`@keyframes vs-spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '84vh', background: MEET.bg, borderRadius: 20, overflow: 'hidden', border: `1px solid ${MEET.line}`, fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Hidden audio sinks for every remote participant */}
      {remoteIds.map((id) => <RemoteAudio key={`a-${id}`} participantId={id} playSignal={playSignal} onBlocked={onAudioBlocked} />)}

      {/* Header */}
      <div style={{ padding: '.85rem 1.35rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${MEET.line}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.8rem' }}>
          <h3 style={{ margin: 0, color: MEET.text, fontSize: '1rem', fontWeight: 600 }}>{isMonitor ? 'Session Monitor' : 'Live Coaching Session'}</h3>
          {joinedAt && <span style={{ color: MEET.textDim, fontSize: '.85rem', fontVariantNumeric: 'tabular-nums' }}>{elapsed(now - joinedAt)}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
          {isMonitor && <span style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', padding: '.25rem .75rem', borderRadius: 999, fontSize: '.78rem', fontWeight: 600 }}>Admin · observing</span>}
          {recording && <span style={{ display: 'flex', alignItems: 'center', gap: '.4rem', background: 'rgba(234,67,53,0.15)', color: MEET.red, padding: '.25rem .75rem', borderRadius: 999, fontSize: '.78rem', fontWeight: 600 }}><Circle size={9} fill="currentColor" style={{ animation: 'vs-pulse 1.2s infinite' }} /> REC</span>}
          <span style={{ display: 'flex', alignItems: 'center', gap: '.4rem', background: 'rgba(52,168,83,0.15)', color: MEET.green, padding: '.25rem .75rem', borderRadius: 999, fontSize: '.78rem', fontWeight: 600 }}><Users size={13} /> {allIds.length}</span>
        </div>
      </div>

      {/* Audio unlock banner */}
      {audioBlocked && (
        <button onClick={enableSound} style={{ margin: '.6rem 1.35rem 0', padding: '.6rem 1rem', background: MEET.blueSolid, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '.5rem', fontWeight: 600, fontSize: '.85rem', alignSelf: 'flex-start' }}>
          <Volume2 size={16} /> Click to enable sound
        </button>
      )}

      {/* Stage */}
      <div style={{ flex: 1, padding: '1rem', minHeight: 0, display: 'flex', flexDirection: 'column', gap: '.8rem' }}>
        {someoneSharing && presenterId ? (
          <>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ScreenShareView participantId={presenterId} />
            </div>
            {/* Thumbnail strip of the two seats */}
            <div style={{ display: 'flex', gap: '.8rem', height: 130, flexShrink: 0 }}>
              <div style={{ flex: 1, maxWidth: 230 }}><SeatTile id={coachId} label={isMonitor ? seatLabel(coachId, 'Participant 1') : 'Coach'} accent={MEET.blueSolid} onReady={registerTile} compact /></div>
              <div style={{ flex: 1, maxWidth: 230 }}><SeatTile id={studentId} label={isMonitor ? seatLabel(studentId, 'Participant 2') : 'Student'} accent={MEET.green} onReady={registerTile} compact /></div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.8rem' }}>
            <SeatTile id={coachId} label={isMonitor ? seatLabel(coachId, 'Participant 1') : 'Coach'} accent={MEET.blueSolid} onReady={registerTile} />
            <SeatTile id={studentId} label={isMonitor ? seatLabel(studentId, 'Waiting for participants…') : 'Student'} accent={MEET.green} onReady={registerTile} />
          </div>
        )}
      </div>

      {/* Control bar */}
      <div style={{ padding: '1rem 1.25rem 1.15rem', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: '1.1rem', flexWrap: 'wrap' }}>
        {(isMonitor || canRecord) && (
          <Control label={savingRecording ? 'Saving…' : recording ? 'Stop rec' : 'Record'} highlight={recording} danger={recording} disabled={savingRecording}
            onClick={() => { if (savingRecording) return; recording ? stopRecording() : startRecording(); }}>
            {savingRecording ? <Loader2 size={20} style={{ animation: 'vs-spin 1s linear infinite' }} /> : recording ? <StopIcon size={20} /> : <Circle size={20} />}
          </Control>
        )}
        {!isMonitor && (<>
          <Control label={micEnabled ? 'Mute' : 'Unmute'} danger={!micEnabled} onClick={() => { toggleMic(); setMicEnabled((v) => !v); }}>
            {micEnabled ? <Mic size={22} /> : <MicOff size={22} />}
          </Control>
          <Control label={camEnabled ? 'Stop video' : 'Start video'} danger={!camEnabled} onClick={() => { toggleWebcam(); setCamEnabled((v) => !v); }}>
            {camEnabled ? <Video size={22} /> : <VideoOff size={22} />}
          </Control>
          <Control label={isSharingLocally ? 'Stop share' : 'Present'} highlight={isSharingLocally} onClick={toggleScreen}>
            {isSharingLocally ? <ScreenShareOff size={22} /> : <ScreenShare size={22} />}
          </Control>
          <div style={{ position: 'relative' }}>
            <Control label="Devices" highlight={showDevices} onClick={() => setShowDevices((v) => !v)}>
              <Settings size={22} />
            </Control>
            {showDevices && (
              <div style={{ position: 'absolute', bottom: 68, left: '50%', transform: 'translateX(-50%)', width: 290, background: MEET.surface, border: `1px solid ${MEET.line}`, borderRadius: 14, boxShadow: '0 16px 40px rgba(0,0,0,0.5)', padding: '1rem', zIndex: 50, textAlign: 'left' }}>
                <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 700, color: MEET.textDim, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.4rem' }}>Camera</label>
                <select value={activeCam} onChange={(e) => pickCam(e.target.value)} style={{ width: '100%', padding: '.55rem', borderRadius: 8, background: MEET.bg, color: MEET.text, border: `1px solid ${MEET.line}`, marginBottom: '.9rem', fontSize: '.85rem' }}>
                  {cams.length === 0 && <option value="">Default camera</option>}
                  {cams.map((c) => <option key={c.deviceId} value={c.deviceId}>{c.label}</option>)}
                </select>
                <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 700, color: MEET.textDim, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.4rem' }}>Microphone</label>
                <select value={activeMic} onChange={(e) => pickMic(e.target.value)} style={{ width: '100%', padding: '.55rem', borderRadius: 8, background: MEET.bg, color: MEET.text, border: `1px solid ${MEET.line}`, fontSize: '.85rem' }}>
                  {mics.length === 0 && <option value="">Default microphone</option>}
                  {mics.map((m) => <option key={m.deviceId} value={m.deviceId}>{m.label}</option>)}
                </select>
                <p style={{ fontSize: '.74rem', color: MEET.textDim, margin: '.7rem 0 0' }}>Seeing your screen instead of your face? Switch to your real webcam here.</p>
              </div>
            )}
          </div>
        </>)}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.4rem' }}>
          <button
            onClick={() => { try { leave(); } catch { /* ignore */ } setTimeout(() => router.push(leaveHref), 1200); }}
            title="End meeting"
            style={{ width: 68, height: 52, borderRadius: 26, background: MEET.red, border: 'none', color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center', boxShadow: '0 6px 16px rgba(234,67,53,0.4)' }}>
            <PhoneOff size={22} />
          </button>
          <span style={{ fontSize: '.68rem', color: MEET.textDim, fontWeight: 500 }}>{isMonitor ? 'Leave' : 'End'}</span>
        </div>
      </div>

      <style>{`@keyframes vs-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } } @keyframes vs-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Loader: resolves room + token, then mounts the provider ─────
export default function VideoSession({ paramRoomId, role, leaveHref, canonicalBase }: { paramRoomId: string; role: Role; leaveHref: string; canonicalBase: string }) {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'ready' | 'unconfigured' | 'error'>('loading');
  const [token, setToken] = useState('');
  const [roomId, setRoomId] = useState('');
  const [name, setName] = useState(role === 'coach' ? 'Coach' : role === 'monitor' ? 'Admin (monitoring)' : 'Student');
  const [canRecord, setCanRecord] = useState(false);

  useEffect(() => {
    if (role !== 'coach') return;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('coaches').select('recording_enabled').eq('user_id', user.id).maybeSingle();
        setCanRecord(data?.recording_enabled !== false);
      } catch { /* default: not allowed if we can't check */ }
    })();
  }, [role]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const dn = role === 'monitor'
          ? 'Admin (monitoring)'
          : user?.user_metadata?.full_name || user?.email?.split('@')[0] || (role === 'coach' ? 'Coach' : 'Student');
        const res = await fetch('/api/videosdk/room', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId: paramRoomId, role }),
        });
        if (res.status === 503) { if (active) setState('unconfigured'); return; }
        const data = await res.json();
        if (!res.ok || !data.roomId || !data.token) { if (active) setState('error'); return; }
        if (!active) return;
        setName(dn); setToken(data.token); setRoomId(data.roomId);
        if (data.created && data.roomId !== paramRoomId) router.replace(`${canonicalBase}/${data.roomId}`);
        setState('ready');
      } catch { if (active) setState('error'); }
    })();
    return () => { active = false; };
  }, [paramRoomId, role, canonicalBase, router]);

  if (state === 'loading') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <Loader2 size={28} style={{ animation: 'vs-spin 1s linear infinite' }} />
        <p style={{ color: 'var(--text-2)' }}>Preparing your room…</p>
        <style>{`@keyframes vs-spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (state === 'unconfigured' || state === 'error') {
    return (
      <div className="widget" style={{ textAlign: 'center', padding: '3rem 1rem', maxWidth: 480, margin: '2rem auto' }}>
        <AlertCircle size={40} style={{ color: 'var(--amber, #F59E0B)', marginBottom: '1rem' }} />
        <h3 style={{ marginBottom: '.5rem' }}>{state === 'unconfigured' ? 'Video sessions not configured' : 'Could not start the session'}</h3>
        <p style={{ color: 'var(--text-2)' }}>
          {state === 'unconfigured' ? 'VideoSDK credentials are missing on the server.' : 'Something went wrong creating the room. Please try again.'}
        </p>
        <button className="btn btn-ghost" style={{ marginTop: '1rem' }} onClick={() => router.push(leaveHref)}>Go back</button>
      </div>
    );
  }

  return (
    <MeetingProvider
      token={token}
      config={{ meetingId: roomId, name, micEnabled: role !== 'monitor', webcamEnabled: role !== 'monitor', debugMode: false }}
      joinWithoutUserInteraction={false}
    >
      <MeetingView role={role} leaveHref={leaveHref} roomId={roomId} canRecord={role === 'coach' && canRecord} />
    </MeetingProvider>
  );
}
