'use client';
import { useState, useEffect } from 'react';
import { Download, Plus, Trash2, Upload, Loader2, Sparkles, FileText, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/Toast';

export default function ResumeBuilderPage() {
  const { toast } = useToast();
  const [enhancing, setEnhancing] = useState(false);
  const [data, setData] = useState({
    name: 'Jane Doe',
    title: 'Software Engineer',
    email: 'jane@example.com',
    phone: '(555) 123-4567',
    location: 'San Francisco, CA',
    linkedin: 'linkedin.com/in/janedoe',
    summary: 'A passionate and results-driven software engineer with 4+ years of experience building scalable web applications. Proficient in React, Node.js, and TypeScript.',
    experience: [
      { id: 1, company: 'TechNova', role: 'Frontend Developer', date: 'Jan 2021 - Present', desc: 'Led the development of a new React-based dashboard. Improved load times by 40%. Mentored junior developers.' }
    ],
    education: [
      { id: 1, school: 'State University', degree: 'B.S. in Computer Science', date: '2017 - 2021' }
    ],
    skills: 'JavaScript, TypeScript, React, Next.js, Node.js, PostgreSQL, Git'
  });
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadStep('Extracting text from PDF...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const extractRes = await fetch('/api/resume/extract', {
        method: 'POST',
        body: formData,
      });
      const extractData = await extractRes.json();
      
      if (!extractRes.ok || !extractData.text) {
        toast('Failed to read PDF file.');
        setUploading(false);
        return;
      }

      setUploadStep('Analyzing and structuring with AI...');
      const parseRes = await fetch('/api/resume/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: extractData.text }),
      });
      const parseData = await parseRes.json();

      if (!parseRes.ok || !parseData.data) {
        toast('Failed to parse resume content.');
        setUploading(false);
        return;
      }

      setUploadStep('Formatting your premium resume...');
      await new Promise(resolve => setTimeout(resolve, 800)); // smooth visual transition

      const d = parseData.data;
      const experience = (d.experience || []).map((ex: any, i: number) => ({ ...ex, id: Date.now() + i }));
      const education = (d.education || []).map((ed: any, i: number) => ({ ...ed, id: Date.now() + i }));

      setData({
        name: d.name || '',
        title: d.title || '',
        email: d.email || '',
        phone: d.phone || '',
        location: d.location || '',
        linkedin: d.linkedin || '',
        summary: d.summary || '',
        skills: d.skills || '',
        experience,
        education
      });

      toast('Resume loaded successfully!');
    } catch (err) {
      console.error(err);
      toast('An error occurred during upload.');
    } finally {
      setUploading(false);
      setUploadStep('');
      e.target.value = '';
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('resumeBuilderData');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setData((prev) => ({ ...prev, ...parsed }));
        } catch (e) {
          console.error('Failed to parse stored resume data', e);
        }
      }
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      localStorage.setItem('resumeBuilderData', JSON.stringify(data));
    }
  }, [data, isLoaded]);

  const handleChange = (field: string, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleExpChange = (id: number, field: string, value: string) => {
    setData((prev) => ({
      ...prev,
      experience: prev.experience.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    }));
  };

  const handleEduChange = (id: number, field: string, value: string) => {
    setData((prev) => ({
      ...prev,
      education: prev.education.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    }));
  };

  const addExperience = () => {
    setData((prev) => ({
      ...prev,
      experience: [...prev.experience, { id: Date.now(), company: '', role: '', date: '', desc: '' }]
    }));
  };

  const addEducation = () => {
    setData((prev) => ({
      ...prev,
      education: [...prev.education, { id: Date.now(), school: '', degree: '', date: '' }]
    }));
  };

  const removeExperience = (id: number) => {
    setData((prev) => ({ ...prev, experience: prev.experience.filter(e => e.id !== id) }));
  };

  const removeEducation = (id: number) => {
    setData((prev) => ({ ...prev, education: prev.education.filter(e => e.id !== id) }));
  };

  const generateWithAI = async () => {
    if (enhancing) return;
    setEnhancing(true);
    toast('Enhancing your summary with AI...');
    try {
      const res = await fetch('/api/resume/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: data.summary,
          title: data.title,
          skills: data.skills,
          experience: data.experience,
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.summary) {
        toast(result.error || 'Could not enhance summary. Please try again.');
        return;
      }
      setData((prev) => ({ ...prev, summary: result.summary }));
      toast('Summary enhanced successfully!');
    } catch (err) {
      console.error('Enhance error', err);
      toast('Error connecting to the AI service.');
    } finally {
      setEnhancing(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #resume-preview-container, #resume-preview-container * {
            visibility: visible;
          }
          #resume-preview-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
            box-shadow: none !important;
            background: #fff;
          }
          .app-sidebar, .app-header { display: none !important; }
        }
      `}} />

      {uploading && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(10, 10, 20, 0.85)',
          backdropFilter: 'blur(12px)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            background: 'linear-gradient(145deg, rgba(30,30,40,0.9) 0%, rgba(20,20,30,0.9) 100%)',
            padding: '40px 60px',
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px'
          }}>
            <div style={{ position: 'relative' }}>
              <div style={{ 
                position: 'absolute', inset: -10, background: 'var(--brand)', 
                borderRadius: '50%', filter: 'blur(20px)', opacity: 0.2,
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }} />
              <Loader2 size={48} style={{ color: 'var(--brand)', animation: 'spin 1s linear infinite' }} />
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px', background: 'linear-gradient(to right, #fff, #a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                AI is hard at work
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                {uploadStep.includes('Extracting') && <FileText size={16} />}
                {uploadStep.includes('Analyzing') && <Sparkles size={16} style={{ color: '#f59e0b' }} />}
                {uploadStep.includes('Formatting') && <CheckCircle size={16} style={{ color: '#10b981' }} />}
                {uploadStep || 'Processing...'}
              </p>
            </div>
          </div>
          
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes pulse { 0%, 100% { opacity: 0.2; } 50% { opacity: 0.4; } }
          `}} />
        </div>
      )}

      <div className="app-head">
        <div>
          <h2>AI Resume Builder</h2>
          <p>Create and refine a professional, ATS-friendly resume</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
            <Upload size={15} /> {uploading ? 'Uploading...' : 'Auto-fill from PDF'}
            <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploading} />
          </label>
          <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
            <Download size={15} /> Export PDF
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '2rem', height: 'calc(100vh - 140px)', alignItems: 'flex-start' }}>
        {/* LEFT: FORM */}
        <div style={{ flex: '1 1 45%', height: '100%', overflowY: 'auto', paddingRight: '1rem' }} className="widget hide-scrollbar">
          
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--line)', paddingBottom: '.5rem' }}>Personal Info</h3>
            <div className="dash-grid-2" style={{ marginBottom: '1rem' }}>
              <div><label>Full Name</label><input type="text" className="input" value={data.name} onChange={(e) => handleChange('name', e.target.value)} /></div>
              <div><label>Job Title</label><input type="text" className="input" value={data.title} onChange={(e) => handleChange('title', e.target.value)} /></div>
              <div><label>Email</label><input type="email" className="input" value={data.email} onChange={(e) => handleChange('email', e.target.value)} /></div>
              <div><label>Phone</label><input type="text" className="input" value={data.phone} onChange={(e) => handleChange('phone', e.target.value)} /></div>
              <div><label>Location</label><input type="text" className="input" value={data.location} onChange={(e) => handleChange('location', e.target.value)} /></div>
              <div><label>LinkedIn</label><input type="text" className="input" value={data.linkedin} onChange={(e) => handleChange('linkedin', e.target.value)} /></div>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--line)', paddingBottom: '.5rem' }}>
              <h3 style={{ margin: 0 }}>Professional Summary</h3>
              <button className="btn btn-ghost btn-sm" onClick={generateWithAI} disabled={enhancing} style={{ color: 'var(--blue)' }}>{enhancing ? 'Enhancing…' : '✨ Enhance with AI'}</button>
            </div>
            <textarea className="input" rows={4} value={data.summary} onChange={(e) => handleChange('summary', e.target.value)}></textarea>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--line)', paddingBottom: '.5rem' }}>
              <h3 style={{ margin: 0 }}>Experience</h3>
            </div>
            {data.experience.map((exp) => (
              <div key={exp.id} style={{ background: 'var(--bg-2)', padding: '1rem', borderRadius: 'var(--r-md)', marginBottom: '1rem', position: 'relative' }}>
                <button onClick={() => removeExperience(exp.id)} style={{ position: 'absolute', top: '.5rem', right: '.5rem', background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                <div className="dash-grid-2" style={{ marginBottom: '.5rem' }}>
                  <div><label>Company</label><input type="text" className="input" value={exp.company} onChange={(e) => handleExpChange(exp.id, 'company', e.target.value)} /></div>
                  <div><label>Role</label><input type="text" className="input" value={exp.role} onChange={(e) => handleExpChange(exp.id, 'role', e.target.value)} /></div>
                  <div><label>Date</label><input type="text" className="input" value={exp.date} onChange={(e) => handleExpChange(exp.id, 'date', e.target.value)} /></div>
                </div>
                <div><label>Description</label><textarea className="input" rows={3} value={exp.desc} onChange={(e) => handleExpChange(exp.id, 'desc', e.target.value)}></textarea></div>
              </div>
            ))}
            <button className="btn btn-ghost btn-sm" onClick={addExperience}><Plus size={15}/> Add Experience</button>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--line)', paddingBottom: '.5rem' }}>
              <h3 style={{ margin: 0 }}>Education</h3>
            </div>
            {data.education.map((edu) => (
              <div key={edu.id} style={{ background: 'var(--bg-2)', padding: '1rem', borderRadius: 'var(--r-md)', marginBottom: '1rem', position: 'relative' }}>
                <button onClick={() => removeEducation(edu.id)} style={{ position: 'absolute', top: '.5rem', right: '.5rem', background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                <div className="dash-grid-2" style={{ marginBottom: '.5rem' }}>
                  <div><label>School</label><input type="text" className="input" value={edu.school} onChange={(e) => handleEduChange(edu.id, 'school', e.target.value)} /></div>
                  <div><label>Degree</label><input type="text" className="input" value={edu.degree} onChange={(e) => handleEduChange(edu.id, 'degree', e.target.value)} /></div>
                  <div><label>Date</label><input type="text" className="input" value={edu.date} onChange={(e) => handleEduChange(edu.id, 'date', e.target.value)} /></div>
                </div>
              </div>
            ))}
            <button className="btn btn-ghost btn-sm" onClick={addEducation}><Plus size={15}/> Add Education</button>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--line)', paddingBottom: '.5rem' }}>Skills</h3>
            <textarea className="input" rows={2} value={data.skills} onChange={(e) => handleChange('skills', e.target.value)}></textarea>
          </div>

        </div>

        {/* RIGHT: PREVIEW */}
        <div 
          style={{ flex: '1 1 55%', height: '100%', overflowY: 'auto', background: '#e5e7eb', borderRadius: 'var(--r-md)', padding: '2rem' }}
          className="hide-scrollbar"
        >
          {/* A4 Paper Size Aspect Ratio wrapper */}
          <div 
            id="resume-preview-container"
            style={{ 
              background: '#fff', 
              color: '#333', 
              width: '100%', 
              maxWidth: '210mm', 
              minHeight: '297mm', 
              margin: '0 auto',
              padding: '50px 60px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              fontFamily: '"Inter", sans-serif',
              lineHeight: '1.6'
            }}
          >
            {/* Header */}
            <div style={{ textAlign: 'left', marginBottom: '30px', borderBottom: '3px solid #2563EB', paddingBottom: '20px' }}>
              <h1 style={{ fontSize: '36px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 5px 0', color: '#111827' }}>{data.name || 'Your Name'}</h1>
              <h2 style={{ fontSize: '18px', fontWeight: 500, margin: '0 0 15px 0', color: '#2563EB' }}>{data.title || 'Target Job Title'}</h2>
              <div style={{ fontSize: '13px', color: '#4B5563', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                {data.email && <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>✉ {data.email}</span>}
                {data.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>☎ {data.phone}</span>}
                {data.location && <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>📍 {data.location}</span>}
                {data.linkedin && <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>🔗 {data.linkedin.replace('https://','')}</span>}
              </div>
            </div>

            {/* Summary */}
            {data.summary && (
              <div style={{ marginBottom: '25px' }}>
                <h2 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', color: '#111827', borderBottom: '1px solid #E5E7EB', paddingBottom: '5px', marginBottom: '10px', letterSpacing: '1px' }}>Professional Summary</h2>
                <p style={{ fontSize: '14px', color: '#374151', margin: 0, textAlign: 'justify' }}>{data.summary}</p>
              </div>
            )}

            {/* Experience */}
            {data.experience.length > 0 && (
              <div style={{ marginBottom: '25px' }}>
                <h2 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', color: '#111827', borderBottom: '1px solid #E5E7EB', paddingBottom: '5px', marginBottom: '15px', letterSpacing: '1px' }}>Professional Experience</h2>
                {data.experience.map(exp => (
                  <div key={exp.id} style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' }}>
                      <h3 style={{ fontSize: '15px', margin: 0, color: '#111827', fontWeight: 700 }}>{exp.role}</h3>
                      <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>{exp.date}</span>
                    </div>
                    <div style={{ fontSize: '14px', color: '#2563EB', fontWeight: 500, marginBottom: '8px' }}>{exp.company}</div>
                    <div style={{ fontSize: '13px', color: '#374151', whiteSpace: 'pre-wrap', paddingLeft: '15px', borderLeft: '2px solid #E5E7EB' }}>
                      {exp.desc}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Education */}
            {data.education.length > 0 && (
              <div style={{ marginBottom: '25px' }}>
                <h2 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', color: '#111827', borderBottom: '1px solid #E5E7EB', paddingBottom: '5px', marginBottom: '15px', letterSpacing: '1px' }}>Education</h2>
                {data.education.map(edu => (
                  <div key={edu.id} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <h3 style={{ fontSize: '15px', margin: 0, color: '#111827', fontWeight: 700 }}>{edu.school}</h3>
                      <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>{edu.date}</span>
                    </div>
                    <p style={{ fontSize: '14px', color: '#4B5563', margin: '3px 0 0 0' }}>{edu.degree}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Skills */}
            {data.skills && (
              <div>
                <h2 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', color: '#111827', borderBottom: '1px solid #E5E7EB', paddingBottom: '5px', marginBottom: '10px', letterSpacing: '1px' }}>Skills & Technologies</h2>
                <p style={{ fontSize: '14px', color: '#374151', margin: 0 }}>
                  {data.skills}
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
