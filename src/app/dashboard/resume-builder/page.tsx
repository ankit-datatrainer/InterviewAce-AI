'use client';
import { useState, useEffect } from 'react';
import { Download, Plus, Trash2, Upload, Loader2, Sparkles, FileText, CheckCircle, Palette, Check, ChevronDown } from 'lucide-react';
import { useToast } from '@/components/Toast';
import ResumeTemplate, { TEMPLATES, ACCENTS, getTemplate } from '@/lib/resume-templates';
import TemplateGallery from '@/components/TemplateGallery';
import ResumeKeywordLab from '@/components/ResumeKeywordLab';
import { getLatestResume, updateResumeRecord } from '@/lib/resume-store';
import {
  normalizeResumeProfile,
  resumeProfileToText,
  saveResumeBuilderProfile,
  type ResumeProfile,
} from '@/lib/resume-profile';
import { addXP, playDuoSound, updateQuestProgress } from '@/lib/gamification';

const STARTER_PROFILE: ResumeProfile = {
  name: 'Jane Doe',
  title: 'Software Engineer',
  email: 'jane@example.com',
  phone: '(555) 123-4567',
  location: 'San Francisco, CA',
  linkedin: 'linkedin.com/in/janedoe',
  summary: 'A passionate and results-driven software engineer with 4+ years of experience building scalable web applications. Proficient in React, Node.js, and TypeScript.',
  experience: [
    { id: 1, company: 'TechNova', role: 'Frontend Developer', date: 'Jan 2021 - Present', desc: 'Led the development of a new React-based dashboard. Improved load times by 40%. Mentored junior developers.' },
  ],
  education: [
    { id: 1, school: 'State University', degree: 'B.S. in Computer Science', date: '2017 - 2021' },
  ],
  projects: [],
  achievements: [],
  skills: 'JavaScript, TypeScript, React, Next.js, Node.js, PostgreSQL, Git',
};

export default function ResumeBuilderPage() {
  const { toast } = useToast();
  const [enhancing, setEnhancing] = useState(false);
  const [data, setData] = useState<ResumeProfile>(STARTER_PROFILE);
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  // Chosen design. Stored separately from `data` so switching templates never
  // touches the user's content.
  const [templateId, setTemplateId] = useState('classic');
  const [accent, setAccent] = useState(getTemplate('classic').defaultAccent);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [keywordSuggestions, setKeywordSuggestions] = useState<string[]>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  const pickTemplate = (id: string, color: string) => {
    setTemplateId(id);
    setAccent(color);
    toast(`${getTemplate(id).name} template applied.`);
  };

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
      const profile = normalizeResumeProfile(d);
      setData(profile);
      saveResumeBuilderProfile(profile, 'resume-builder-upload');

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
          setData((prev) => normalizeResumeProfile(parsed, prev));
        } catch (e) {
          console.error('Failed to parse stored resume data', e);
        }
      }
      // Design choice is stored separately so it survives content edits.
      try {
        const style = JSON.parse(localStorage.getItem('resumeBuilderStyle') || '{}');
        if (style.templateId) setTemplateId(style.templateId);
        if (style.accent) setAccent(style.accent);
      } catch { /* fall back to defaults */ }
      const latest = getLatestResume();
      if (latest?.missingKeywords) setKeywordSuggestions(latest.missingKeywords);
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      saveResumeBuilderProfile(data, 'resume-builder-edit');
    }
  }, [data, isLoaded]);

  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      localStorage.setItem('resumeBuilderStyle', JSON.stringify({ templateId, accent }));
    }
  }, [templateId, accent, isLoaded]);

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

  const addProject = () => {
    setData((prev) => ({
      ...prev,
      projects: [...prev.projects, { id: Date.now(), name: '', date: '', desc: '', technologies: '' }],
    }));
  };

  const handleProjectChange = (id: number, field: string, value: string) => {
    setData((prev) => ({
      ...prev,
      projects: prev.projects.map((project) => project.id === id ? { ...project, [field]: value } : project),
    }));
  };

  const removeProject = (id: number) => {
    setData((prev) => ({ ...prev, projects: prev.projects.filter((project) => project.id !== id) }));
  };

  const addAchievement = () => setData((prev) => ({ ...prev, achievements: [...prev.achievements, ''] }));
  const updateAchievement = (index: number, value: string) => setData((prev) => ({
    ...prev,
    achievements: prev.achievements.map((item, itemIndex) => itemIndex === index ? value : item),
  }));
  const removeAchievement = (index: number) => setData((prev) => ({
    ...prev,
    achievements: prev.achievements.filter((_, itemIndex) => itemIndex !== index),
  }));

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
  };

  const exportResume = async (format: 'pdf' | 'docx' | 'rtf' | 'txt') => {
    setExportOpen(false);
    setExporting(format);
    const filename = (data.name || 'resume').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'resume';
    try {
      if (format === 'pdf') {
        const preview = document.getElementById('resume-preview-container');
        if (!preview) throw new Error('Resume preview is unavailable.');
        const html2pdf = (await import('html2pdf.js')).default;
        await html2pdf().set({
          margin: 0,
          filename: `${filename}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        }).from(preview).save();
      } else if (format === 'txt') {
        downloadBlob(new Blob([resumeProfileToText(data)], { type: 'text/plain;charset=utf-8' }), `${filename}.txt`);
      } else {
        const response = await fetch('/api/resume/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile: data, format }),
        });
        if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Export failed.');
        downloadBlob(await response.blob(), `${filename}.${format}`);
      }
      playDuoSound('correct');
      toast(`Resume downloaded as ${format.toUpperCase()}.`);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not export your resume.');
    } finally {
      setExporting(null);
    }
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
        /* The builder is a side-by-side editor on desktop; on a phone it has to
           become a single scrolling column or neither pane is usable. */
        .rb-layout { display: flex; gap: 2rem; height: calc(100vh - 140px); align-items: flex-start; }
        @media (max-width: 900px) {
          .rb-layout { flex-direction: column; height: auto; gap: 1.25rem; }
          .rb-layout > div { flex: 1 1 100% !important; width: 100%; height: auto !important; max-height: none !important; }
          .rb-preview { padding: .75rem !important; }
          .rb-preview #resume-preview-container { transform: scale(0.92); transform-origin: top center; }
        }

        @page { size: A4; margin: 0; }

        @media print {
          body * { visibility: hidden; }
          #resume-preview-container, #resume-preview-container * { visibility: visible; }
          #resume-preview-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: none !important;
            padding: 0;
            margin: 0;
            box-shadow: none !important;
            background: #fff;
            transform: none !important;
          }
          /* Browsers drop background colours when printing — without this the
             coloured templates would export as plain white pages. */
          #resume-preview-container, #resume-preview-container * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
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
        <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setGalleryOpen(true)}>
            <Palette size={15} /> Templates
          </button>
          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
            <Upload size={15} /> {uploading ? 'Uploading...' : 'Auto-fill from resume'}
            <input type="file" accept=".pdf,.docx,.txt,.md" style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploading} />
          </label>
          <div style={{ position: 'relative' }}>
            <button className="btn btn-primary btn-sm" onClick={() => setExportOpen((open) => !open)} disabled={Boolean(exporting)}>
              {exporting ? <Loader2 size={15} className="spin" /> : <Download size={15} />}
              {exporting ? `Creating ${exporting.toUpperCase()}…` : 'Download'} <ChevronDown size={14} />
            </button>
            {exportOpen && (
              <div className="resume-export-menu">
                <button type="button" onClick={() => exportResume('pdf')}><b>PDF</b><span>Best for applications</span></button>
                <button type="button" onClick={() => exportResume('docx')}><b>MS Word (.docx)</b><span>Fully editable document</span></button>
                <button type="button" onClick={() => exportResume('rtf')}><b>Rich text (.rtf)</b><span>Opens in Word and most editors</span></button>
                <button type="button" onClick={() => exportResume('txt')}><b>Accessible text (.txt)</b><span>Plain text for speech and ATS tools</span></button>
              </div>
            )}
          </div>
        </div>
      </div>

      {keywordSuggestions.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <ResumeKeywordLab
            keywords={keywordSuggestions}
            profile={data}
            onChange={(profile, keyword, section) => {
              setData(profile);
              saveResumeBuilderProfile(profile, `keyword-${section}`);
              setKeywordSuggestions((items) => items.filter((item) => item !== keyword));
              const latest = getLatestResume();
              if (latest) updateResumeRecord({
                ...latest,
                extractedData: profile,
                missingKeywords: latest.missingKeywords.filter((item) => item !== keyword),
                presentKeywords: Array.from(new Set([...latest.presentKeywords, keyword])),
              });
              try { addXP(3); updateQuestProgress('resume_scan', 1); playDuoSound('correct'); } catch {}
              toast(`“${keyword}” added to ${section}. Keep it only if it is accurate.`);
            }}
          />
        </div>
      )}

      <div className="rb-layout">
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--line)', paddingBottom: '.5rem' }}>
              <h3 style={{ margin: 0 }}>Projects</h3>
            </div>
            {data.projects.map((project) => (
              <div key={project.id} style={{ background: 'var(--bg-2)', padding: '1rem', borderRadius: 'var(--r-md)', marginBottom: '1rem', position: 'relative' }}>
                <button aria-label="Remove project" onClick={() => removeProject(project.id)} style={{ position: 'absolute', top: '.5rem', right: '.5rem', background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                <div className="dash-grid-2" style={{ marginBottom: '.5rem' }}>
                  <div><label>Project</label><input type="text" className="input" value={project.name} onChange={(e) => handleProjectChange(project.id, 'name', e.target.value)} /></div>
                  <div><label>Date</label><input type="text" className="input" value={project.date} onChange={(e) => handleProjectChange(project.id, 'date', e.target.value)} /></div>
                </div>
                <div style={{ marginBottom: '.5rem' }}><label>Description</label><textarea className="input" rows={3} value={project.desc} onChange={(e) => handleProjectChange(project.id, 'desc', e.target.value)} /></div>
                <div><label>Technologies</label><input type="text" className="input" value={project.technologies} onChange={(e) => handleProjectChange(project.id, 'technologies', e.target.value)} /></div>
              </div>
            ))}
            <button className="btn btn-ghost btn-sm" onClick={addProject}><Plus size={15}/> Add Project</button>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--line)', paddingBottom: '.5rem' }}>Achievements</h3>
            {data.achievements.map((achievement, index) => (
              <div key={index} style={{ display: 'flex', gap: '.5rem', alignItems: 'center', marginBottom: '.6rem' }}>
                <input className="input" value={achievement} onChange={(event) => updateAchievement(index, event.target.value)} placeholder="Add a truthful, measurable achievement" />
                <button type="button" aria-label="Remove achievement" className="btn btn-ghost btn-sm" onClick={() => removeAchievement(index)}><Trash2 size={15} /></button>
              </div>
            ))}
            <button className="btn btn-ghost btn-sm" onClick={addAchievement}><Plus size={15}/> Add Achievement</button>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--line)', paddingBottom: '.5rem' }}>Skills</h3>
            <textarea className="input" rows={2} value={data.skills} onChange={(e) => handleChange('skills', e.target.value)}></textarea>
          </div>

        </div>

        {/* RIGHT: PREVIEW */}
        <div
          style={{ flex: '1 1 55%', height: '100%', overflowY: 'auto', background: '#e5e7eb', borderRadius: 'var(--r-md)', padding: '1.25rem' }}
          className="hide-scrollbar rb-preview"
        >
          {/* Quick switcher. Lives outside #resume-preview-container so the
              existing print rules automatically keep it out of the exported PDF. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap', marginBottom: '1rem', background: '#fff', borderRadius: 10, padding: '.6rem .7rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <span style={{ fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: '#6b7280' }}>Design</span>
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTemplateId(t.id)}
                title={t.blurb}
                style={{
                  fontSize: '.76rem', fontWeight: 600, padding: '.3rem .65rem', borderRadius: 999, cursor: 'pointer',
                  border: templateId === t.id ? `2px solid ${accent}` : '1px solid #d1d5db',
                  background: templateId === t.id ? accent : '#fff',
                  color: templateId === t.id ? '#fff' : '#374151',
                }}
              >
                {t.name}
              </button>
            ))}
            <span style={{ width: 1, height: 20, background: '#e5e7eb', margin: '0 .2rem' }} />
            {ACCENTS.slice(0, 8).map((c) => (
              <button
                key={c}
                onClick={() => setAccent(c)}
                title={`Accent ${c}`}
                aria-label={`Accent ${c}`}
                style={{ width: 20, height: 20, borderRadius: '50%', background: c, cursor: 'pointer', padding: 0, display: 'grid', placeItems: 'center', border: accent === c ? '2px solid #111827' : '1px solid #d1d5db' }}
              >
                {accent === c && <Check size={11} color="#fff" strokeWidth={3} />}
              </button>
            ))}
            <button className="btn btn-ghost btn-sm" onClick={() => setGalleryOpen(true)} style={{ marginLeft: 'auto', color: '#374151', fontSize: '.76rem' }}>
              <Palette size={13} /> All templates
            </button>
          </div>

          {/* The A4 page itself — this element is what gets printed. */}
          <div
            id="resume-preview-container"
            style={{ maxWidth: '210mm', margin: '0 auto', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', background: '#fff' }}
          >
            <ResumeTemplate templateId={templateId} data={data} accent={accent} />
          </div>
        </div>

        <TemplateGallery
          open={galleryOpen}
          onClose={() => setGalleryOpen(false)}
          data={data}
          templateId={templateId}
          accent={accent}
          onPick={pickTemplate}
        />
      </div>
    </>
  );
}
