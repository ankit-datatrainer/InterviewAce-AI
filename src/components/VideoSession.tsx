'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MeetingProvider, useMeeting, useParticipant } from '@videosdk.live/react-sdk';
import { Mic, MicOff, Video, VideoOff, PhoneOff, ScreenShare, Loader2, AlertCircle, Settings } from 'lucide-react';
import { createClient } from '@/lib/supabase';

type Role = 'coach' | 'student' | 'monitor';

// ── One participant's video/audio tile ──────────────────────────
function ParticipantTile({ participantId }: { participantId: string }) {
  const { webcamStream, micStream, webcamOn, micOn, isLocal, displayName } = useParticipant(participantId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const videoStream = useMemo(() => {
    if (webcamOn && webcamStream) {
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

  useEffect(() => {
    if (audioRef.current && micOn && micStream && !isLocal) {
      const ms = new MediaStream();
      ms.addTrack(micStream.track);
      audioRef.current.srcObject = ms;
      audioRef.current.play().catch(() => {});
    }
  }, [micStream, micOn, isLocal]);

  return (
    <div style={{ position: 'relative', background: '#111', borderRadius: 'var(--r-md)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 240 }}>
      {!isLocal && <audio ref={audioRef} autoPlay playsInline />}
      {webcamOn ? (
        <video ref={videoRef} autoPlay muted={isLocal} playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--text-3)' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--bg-2)', display: 'grid', placeItems: 'center', fontSize: '1.8rem', color: 'var(--text)', marginBottom: '.6rem' }}>
            {(displayName || 'U').charAt(0).toUpperCase()}
          </div>
          Camera off
        </div>
      )}
      <div style={{ position: 'absolute', bottom: '.8rem', left: '.8rem', background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '.3rem .7rem', borderRadius: 'var(--r-md)', fontSize: '.85rem', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
        {displayName || 'Guest'} {isLocal && '(You)'}
        {!micOn && <MicOff size={13} color="#ef4444" />}
      </div>
    </div>
  );
}

// ── A fixed seat (Coach / Student). Shows the participant, or a placeholder. ──
function SeatTile({ id, seat }: { id: string | null; seat: 'Coach' | 'Student' }) {
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 240 }}>
      <div style={{ position: 'absolute', top: '.7rem', left: '.7rem', zIndex: 3, background: seat === 'Coach' ? 'rgba(37,99,235,0.9)' : 'rgba(16,185,129,0.9)', color: '#fff', padding: '.25rem .75rem', borderRadius: 'var(--r-full)', fontSize: '.78rem', fontWeight: 700, letterSpacing: '.03em' }}>
        {seat}
      </div>
      {id ? (
        <ParticipantTile participantId={id} />
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '.6rem', color: 'var(--text-3)', border: '1px dashed var(--line)', borderRadius: 'var(--r-md)', background: '#0d0d0d', minHeight: 240 }}>
          <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
          Waiting for the {seat.toLowerCase()} to join…
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
    </div>
  );
}

// ── A labelled circular call-control button ─────────────────────
function Control({ children, label, onClick, active = true, danger = false, highlight = false }: {
  children: React.ReactNode; label: string; onClick: () => void; active?: boolean; danger?: boolean; highlight?: boolean;
}) {
  const bg = danger ? '#ef4444' : highlight ? 'var(--blue)' : '#2c2c33';
  const fg = danger || highlight ? '#fff' : '#e7e7ea';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.45rem' }}>
      <button onClick={onClick} title={label}
        style={{ width: 56, height: 56, borderRadius: '50%', background: bg, border: '1px solid rgba(255,255,255,0.12)', color: fg, cursor: 'pointer', display: 'grid', placeItems: 'center', transition: 'all .15s ease' }}>
        {children}
      </button>
      <span style={{ fontSize: '.72rem', color: '#c9c9cf', fontWeight: 500 }}>{label}</span>
    </div>
  );
}

// ── The live meeting view (inside MeetingProvider) ──────────────
function MeetingView({ role, leaveHref }: { role: Role; leaveHref: string }) {
  const router = useRouter();
  const isMonitor = role === 'monitor';
  const [joined, setJoined] = useState(false);
  const [sharing, setSharing] = useState(false);
  // Admins monitoring a session join silently: muted, camera off.
  const [micEnabled, setMicEnabled] = useState(!isMonitor);
  const [camEnabled, setCamEnabled] = useState(!isMonitor);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [showDevices, setShowDevices] = useState(false);
  const [cams, setCams] = useState<{ deviceId: string; label: string }[]>([]);
  const [mics, setMics] = useState<{ deviceId: string; label: string }[]>([]);
  const [activeCam, setActiveCam] = useState('');
  const [activeMic, setActiveMic] = useState('');
  const joinedRef = useRef(false);

  const { join, leave, toggleMic, toggleWebcam, enableScreenShare, disableScreenShare, changeWebcam, changeMic, getWebcams, getMics, participants, localParticipant } = useMeeting({
    onMeetingJoined: () => { setJoined(true); setJoinError(null); },
    onMeetingLeft: () => router.push(leaveHref),
    onError: (err: any) => {
      console.error('VideoSDK meeting error:', err);
      setJoinError(err?.message || err?.code || 'Could not connect to the session.');
    },
  });

  // Keep a stable reference to join() so the mount effect can run exactly once
  // (and is immune to React Strict Mode's double setup/cleanup in dev).
  const joinFn = useRef(join);
  joinFn.current = join;

  useEffect(() => {
    if (joinedRef.current) return;
    joinedRef.current = true;

    (async () => {
      // Surface the camera/mic permission prompt up front. If the browser blocks
      // it, join() would otherwise hang forever on getUserMedia with no feedback.
      // Silent monitors join without devices, so skip the prompt entirely.
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
    // Intentionally run once on mount; do NOT add deps that would re-run/cancel it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Safety net: if we never join within 20s, stop spinning and show an error.
  useEffect(() => {
    if (joined) return;
    const t = setTimeout(() => {
      setJoinError((prev) => prev ?? 'Connection timed out. Check your network and try again.');
    }, 20000);
    return () => clearTimeout(t);
  }, [joined]);

  // Load available cameras/mics once we're in, and auto-select a REAL webcam
  // (skip virtual/screen-capture cameras like OBS / NVIDIA Broadcast / screen).
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

        // Pick a physical webcam over a virtual one.
        const isVirtual = (l: string) => /(obs|virtual|screen|broadcast|capture|ndi|snap|manycam|droidcam)/i.test(l);
        const isRealCam = (l: string) => /(webcam|usb|integrated|facetime|hd cam|uvc|built-?in)/i.test(l);
        const preferred =
          camList.find((c) => isRealCam(c.label) && !isVirtual(c.label)) ||
          camList.find((c) => !isVirtual(c.label)) ||
          camList[0];
        if (preferred) {
          setActiveCam(preferred.deviceId);
          try { await changeWebcam?.(preferred.deviceId); } catch { /* ignore */ }
        }
        if (micList[0]) setActiveMic(micList[0].deviceId);
      } catch { /* ignore */ }
    })();
  }, [joined, getWebcams, getMics, changeWebcam]);

  async function pickCam(deviceId: string) {
    setActiveCam(deviceId);
    try { await changeWebcam?.(deviceId); } catch { /* ignore */ }
  }
  async function pickMic(deviceId: string) {
    setActiveMic(deviceId);
    try { await changeMic?.(deviceId); } catch { /* ignore */ }
  }

  const remoteIds = [...participants.keys()].filter((id) => id !== localParticipant?.id);
  const allIds = [localParticipant?.id, ...remoteIds].filter(Boolean) as string[];

  // Fixed seating: Coach is always on the LEFT, Student on the RIGHT,
  // regardless of who is the local participant on this device.
  // A monitoring admin is not seated — they watch the two remote participants.
  const localId = localParticipant?.id || null;
  const remoteId = remoteIds[0] || null;
  const coachId = isMonitor ? (remoteIds[0] || null) : role === 'coach' ? localId : remoteId;
  const studentId = isMonitor ? (remoteIds[1] || null) : role === 'student' ? localId : remoteId;
  const seatLabel = (id: string | null, fallback: string) =>
    (id && (participants.get(id) as any)?.displayName) || fallback;

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
        <Loader2 size={32} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
        <h3 style={{ margin: 0 }}>Connecting to your session…</h3>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '80vh', background: 'var(--bg)', borderRadius: 'var(--r-lg)', overflow: 'hidden', border: '1px solid var(--line)' }}>
      <div style={{ padding: '1rem 1.5rem', background: 'var(--bg-2)', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>{isMonitor ? 'Session Monitor' : 'Live Coaching Session'}</h3>
        <span style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
          {isMonitor && (
            <span style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', padding: '.2rem .8rem', borderRadius: 'var(--r-full)', fontSize: '.85rem', fontWeight: 600 }}>
              Admin · observing
            </span>
          )}
          <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '.2rem .8rem', borderRadius: 'var(--r-full)', fontSize: '.85rem', fontWeight: 600 }}>
            ● Live · {allIds.length} in room
          </span>
        </span>
      </div>

      <div style={{ flex: 1, padding: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#000', overflow: 'auto' }}>
        <SeatTile id={coachId} seat={isMonitor ? seatLabel(coachId, 'Participant 1') : 'Coach'} />
        <SeatTile id={studentId} seat={isMonitor ? seatLabel(studentId, 'Waiting for participants…') : 'Student'} />
      </div>

      <div style={{ padding: '1.1rem 1.25rem', background: '#1a1a1f', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: '1.5rem' }}>
        {!isMonitor && (<>
        <Control label={micEnabled ? 'Mute' : 'Unmute'} active={micEnabled} danger={!micEnabled}
          onClick={() => { toggleMic(); setMicEnabled((v) => !v); }}>
          {micEnabled ? <Mic size={22} /> : <MicOff size={22} />}
        </Control>
        <Control label={camEnabled ? 'Stop video' : 'Start video'} active={camEnabled} danger={!camEnabled}
          onClick={() => { toggleWebcam(); setCamEnabled((v) => !v); }}>
          {camEnabled ? <Video size={22} /> : <VideoOff size={22} />}
        </Control>
        <Control label={sharing ? 'Stop share' : 'Share screen'} active={sharing} highlight={sharing}
          onClick={() => { sharing ? disableScreenShare() : enableScreenShare(); setSharing((v) => !v); }}>
          <ScreenShare size={22} />
        </Control>
        <div style={{ position: 'relative' }}>
          <Control label="Devices" active highlight={showDevices} onClick={() => setShowDevices((v) => !v)}>
            <Settings size={22} />
          </Control>
          {showDevices && (
            <div style={{ position: 'absolute', bottom: 62, left: '50%', transform: 'translateX(-50%)', width: 280, background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', boxShadow: '0 16px 40px rgba(0,0,0,0.4)', padding: '1rem', zIndex: 50, textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.4rem' }}>Camera</label>
              <select value={activeCam} onChange={(e) => pickCam(e.target.value)}
                style={{ width: '100%', padding: '.5rem', borderRadius: 'var(--r-sm)', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--line)', marginBottom: '.9rem', fontSize: '.85rem' }}>
                {cams.length === 0 && <option value="">Default camera</option>}
                {cams.map((c) => <option key={c.deviceId} value={c.deviceId}>{c.label}</option>)}
              </select>
              <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.4rem' }}>Microphone</label>
              <select value={activeMic} onChange={(e) => pickMic(e.target.value)}
                style={{ width: '100%', padding: '.5rem', borderRadius: 'var(--r-sm)', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--line)', fontSize: '.85rem' }}>
                {mics.length === 0 && <option value="">Default microphone</option>}
                {mics.map((m) => <option key={m.deviceId} value={m.deviceId}>{m.label}</option>)}
              </select>
              <p style={{ fontSize: '.74rem', color: 'var(--text-3)', margin: '.7rem 0 0' }}>Seeing your screen instead of your face? Switch to your real webcam here.</p>
            </div>
          )}
        </div>
        </>)}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.45rem' }}>
          <button
            onClick={() => {
              // End the meeting, then always land on the dashboard — even if the
              // SDK's onMeetingLeft callback never fires for any reason.
              try { leave(); } catch { /* ignore */ }
              setTimeout(() => router.push(leaveHref), 1200);
            }}
            title="End meeting"
            style={{ width: 56, height: 56, borderRadius: '50%', background: '#ef4444', border: 'none', color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center', boxShadow: '0 6px 16px rgba(239,68,68,0.4)' }}>
            <PhoneOff size={22} />
          </button>
          <span style={{ fontSize: '.72rem', color: '#fca5a5', fontWeight: 600 }}>{isMonitor ? 'Leave' : 'End'}</span>
        </div>
      </div>
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

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // Display name from the signed-in user.
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const dn = role === 'monitor'
          ? 'Admin (monitoring)'
          : user?.user_metadata?.full_name || user?.email?.split('@')[0] || (role === 'coach' ? 'Coach' : 'Student');

        const res = await fetch('/api/videosdk/room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId: paramRoomId, role }),
        });
        if (res.status === 503) { if (active) setState('unconfigured'); return; }
        const data = await res.json();
        if (!res.ok || !data.roomId || !data.token) { if (active) setState('error'); return; }
        if (!active) return;
        setName(dn);
        setToken(data.token);
        setRoomId(data.roomId);
        // If the server minted a new room (the URL id wasn't valid), make the URL canonical/shareable.
        if (data.created && data.roomId !== paramRoomId) {
          router.replace(`${canonicalBase}/${data.roomId}`);
        }
        setState('ready');
      } catch {
        if (active) setState('error');
      }
    })();
    return () => { active = false; };
  }, [paramRoomId, role, canonicalBase, router]);

  if (state === 'loading') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'var(--text-2)' }}>Preparing your room…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (state === 'unconfigured' || state === 'error') {
    return (
      <div className="widget" style={{ textAlign: 'center', padding: '3rem 1rem', maxWidth: 480, margin: '2rem auto' }}>
        <AlertCircle size={40} style={{ color: 'var(--amber, #F59E0B)', marginBottom: '1rem' }} />
        <h3 style={{ marginBottom: '.5rem' }}>{state === 'unconfigured' ? 'Video sessions not configured' : 'Could not start the session'}</h3>
        <p style={{ color: 'var(--text-2)' }}>
          {state === 'unconfigured'
            ? 'VideoSDK credentials are missing on the server.'
            : 'Something went wrong creating the room. Please try again.'}
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
      <MeetingView role={role} leaveHref={leaveHref} />
    </MeetingProvider>
  );
}
