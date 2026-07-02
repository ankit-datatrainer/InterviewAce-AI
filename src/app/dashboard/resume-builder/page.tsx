'use client';
import { useState, useEffect } from 'react';
import { Download, Plus, Trash2 } from 'lucide-react';
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
    }
  }, []);

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
    toast('Enhancing your summary with NVIDIA NIM AI...');
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

      <div className="app-head">
        <div>
          <h2>AI Resume Builder</h2>
          <p>Create and refine a professional, ATS-friendly resume</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
          <Download size={15} /> Export PDF
        </button>
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
              color: '#000', 
              width: '100%', 
              maxWidth: '210mm', 
              minHeight: '297mm', 
              margin: '0 auto',
              padding: '40px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              fontFamily: '"Inter", sans-serif'
            }}
          >
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #000', paddingBottom: '15px' }}>
              <h1 style={{ fontSize: '28px', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 10px 0', color: '#111' }}>{data.name || 'Your Name'}</h1>
              <div style={{ fontSize: '14px', color: '#444', display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap' }}>
                {data.email && <span>{data.email}</span>}
                {data.phone && <span>{data.phone}</span>}
                {data.location && <span>{data.location}</span>}
                {data.linkedin && <span>{data.linkedin}</span>}
              </div>
            </div>

            {/* Summary */}
            {data.summary && (
              <div style={{ marginBottom: '20px' }}>
                <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#333' }}>{data.summary}</p>
              </div>
            )}

            {/* Experience */}
            {data.experience.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '16px', textTransform: 'uppercase', color: '#111', borderBottom: '1px solid #ccc', paddingBottom: '5px', marginBottom: '15px' }}>Professional Experience</h2>
                {data.experience.map(exp => (
                  <div key={exp.id} style={{ marginBottom: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px' }}>
                      <h3 style={{ fontSize: '15px', margin: 0, color: '#111' }}>{exp.role} <span style={{ fontWeight: 'normal', color: '#555' }}>at {exp.company}</span></h3>
                      <span style={{ fontSize: '13px', color: '#666' }}>{exp.date}</span>
                    </div>
                    <p style={{ fontSize: '13px', lineHeight: '1.5', color: '#333', whiteSpace: 'pre-wrap' }}>{exp.desc}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Education */}
            {data.education.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '16px', textTransform: 'uppercase', color: '#111', borderBottom: '1px solid #ccc', paddingBottom: '5px', marginBottom: '15px' }}>Education</h2>
                {data.education.map(edu => (
                  <div key={edu.id} style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <h3 style={{ fontSize: '15px', margin: 0, color: '#111' }}>{edu.school}</h3>
                      <span style={{ fontSize: '13px', color: '#666' }}>{edu.date}</span>
                    </div>
                    <p style={{ fontSize: '14px', color: '#444' }}>{edu.degree}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Skills */}
            {data.skills && (
              <div>
                <h2 style={{ fontSize: '16px', textTransform: 'uppercase', color: '#111', borderBottom: '1px solid #ccc', paddingBottom: '5px', marginBottom: '15px' }}>Skills</h2>
                <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#333' }}>{data.skills}</p>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
