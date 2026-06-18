import sys

with open('src/app/dashboard/interview/page.tsx', 'r', encoding='utf8') as f:
    content = f.read()

# 1. Add states and ref
state_insert = """
  const [showSetup, setShowSetup] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [tabWarning, setTabWarning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
"""
content = content.replace("  const [showSetup, setShowSetup] = useState(false);\n  const [setupError, setSetupError] = useState('');", state_insert)

# 2. Add visibility and blur effects
effects_insert = """
  // ─── Tab Switch Warning ───
  useEffect(() => {
    if (!inRoom) return;
    const handleVisibilityChange = () => {
      if (document.hidden) setTabWarning(true);
    };
    const handleBlur = () => {
      setTabWarning(true);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [inRoom]);
"""
content = content.replace("  const formattedTime =", effects_insert + "\n  const formattedTime =")

# 3. Update requestPermissions
req_perm = """  // ─── SETUP MODAL ───
  const requestPermissions = async () => {
    try {
      setSetupError('');
      
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch((e) => console.log('fs', e));
      } else if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch((e) => console.log('fs', e));
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });"""
content = content.replace("""  // ─── SETUP MODAL ───
  const requestPermissions = async () => {
    try {
      setSetupError('');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });""", req_perm)


# 4. End interview should exit fullscreen
end_int = """  const endInterview = () => {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(e => console.log(e));
    }
    endInterviewCleanup();
  };"""
content = content.replace("""  const endInterview = () => {
    endInterviewCleanup();
  };""", end_int)

# 5. Extract components
parts = content.split('// ─── CONNECTING VIEW ───')
pre_connect = parts[0]

setup_start = content.find('<div className="setup-grid">')
setup_end = content.find('// ─── INTERVIEW ROOM VIEW ───')
setup_grid_html = content[setup_start:setup_end]
# Strip the closing fragments of the old function
setup_grid_html = setup_grid_html[:setup_grid_html.rfind('</>')]

room_view_start = content.find('// ─── INTERVIEW ROOM VIEW ───')
room_view_html = content[room_view_start:]
room_view_html = room_view_html[room_view_html.find('<div className="app-head">'):room_view_html.rfind('</>')]


final_structure = pre_connect + """// ─── FULLSCREEN WRAPPER ───
  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflowY: 'auto' }}>
      {tabWarning && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.95)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface-solid)', padding: '3rem', borderRadius: 'var(--r-lg)', border: '1px solid #ef4444', textAlign: 'center', maxWidth: 500 }}>
            <h2 style={{ marginBottom: '1rem', color: '#ef4444' }}>Interview Paused</h2>
            <p style={{ color: 'var(--text-1)', marginBottom: '2rem' }}>You must end the interview to switch tabs or windows. Leaving the interview screen violates the rules.</p>
            <button className="btn btn-primary" onClick={() => { setTabWarning(false); if (containerRef.current?.requestFullscreen) containerRef.current.requestFullscreen().catch(()=>console.log('fs error')); }} style={{ background: '#ef4444', border: 'none', margin: '0 auto' }}>
              Return to Interview
            </button>
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
""" + setup_grid_html + """
        </>
      ) : (
        <>
""" + room_view_html + """
        </>
      )}
    </div>
  );
}
"""

with open('src/app/dashboard/interview/page.tsx', 'w', encoding='utf8') as f:
    f.write(final_structure)

print("Done")
