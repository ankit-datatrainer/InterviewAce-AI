'use client';

import { useState, useEffect } from 'react';
import { Star, Plus, Trash2, Edit3, Save, X } from 'lucide-react';
import { useToast } from '@/components/Toast';

type StarStory = {
  id: string;
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
};

export default function StarBuilderPage() {
  const [stories, setStories] = useState<StarStory[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentStory, setCurrentStory] = useState<StarStory | null>(null);
  const [loaded, setLoaded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const saved = localStorage.getItem('interviewace_star_stories');
    if (saved) {
      try {
        setStories(JSON.parse(saved));
      } catch (e) {}
    }
    setLoaded(true);
  }, []);

  const saveStories = (newStories: StarStory[]) => {
    setStories(newStories);
    localStorage.setItem('interviewace_star_stories', JSON.stringify(newStories));
  };

  const handleAddNew = () => {
    setCurrentStory({
      id: Date.now().toString(),
      title: '',
      situation: '',
      task: '',
      action: '',
      result: '',
    });
    setEditingId('new');
  };

  const handleSave = () => {
    if (!currentStory?.title.trim()) {
      toast('Please enter a title for your story.');
      return;
    }
    let newStories;
    if (editingId === 'new') {
      newStories = [currentStory, ...stories];
    } else {
      newStories = stories.map((s) => (s.id === currentStory.id ? currentStory : s));
    }
    saveStories(newStories);
    setEditingId(null);
    setCurrentStory(null);
    toast('Story saved successfully!');
  };

  const handleCancel = () => {
    setEditingId(null);
    setCurrentStory(null);
  };

  const handleEdit = (story: StarStory) => {
    setCurrentStory({ ...story });
    setEditingId(story.id);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this story?')) {
      const newStories = stories.filter((s) => s.id !== id);
      saveStories(newStories);
      toast('Story deleted.');
    }
  };

  if (!loaded) return null;

  return (
    <>
      <div className="app-head">
        <div>
          <h2>STAR Method Builder</h2>
          <p>Prepare your behavioral stories using the Situation, Task, Action, Result framework.</p>
        </div>
        {!editingId && (
          <button className="btn btn-primary" onClick={handleAddNew}>
            <Plus size={18} /> New Story
          </button>
        )}
      </div>

      {editingId && currentStory ? (
        <div className="widget" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <Star size={20} color="var(--accent)" /> {editingId === 'new' ? 'Create New Story' : 'Edit Story'}
          </h3>
          
          <div className="field">
            <label>Story Title (e.g., "Conflict with a difficult stakeholder")</label>
            <input 
              type="text" 
              placeholder="Give your story a memorable title"
              value={currentStory.title}
              onChange={(e) => setCurrentStory({ ...currentStory, title: e.target.value })}
            />
          </div>

          <div className="dash-grid-2" style={{ marginTop: '1.5rem' }}>
            <div className="field">
              <label style={{ display: 'flex', alignItems: 'center', gap: '.4rem', color: 'var(--star-s-text)' }}><div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--star-s-bg)', display: 'grid', placeItems: 'center', fontSize: '.8rem', fontWeight: 800 }}>S</div>ituation</label>
              <textarea 
                rows={4} 
                placeholder="Set the scene and provide necessary context. What was the challenge?"
                value={currentStory.situation}
                onChange={(e) => setCurrentStory({ ...currentStory, situation: e.target.value })}
              />
            </div>
            <div className="field">
              <label style={{ display: 'flex', alignItems: 'center', gap: '.4rem', color: 'var(--star-t-text)' }}><div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--star-t-bg)', display: 'grid', placeItems: 'center', fontSize: '.8rem', fontWeight: 800 }}>T</div>ask</label>
              <textarea 
                rows={4} 
                placeholder="What was your specific responsibility or goal in this situation?"
                value={currentStory.task}
                onChange={(e) => setCurrentStory({ ...currentStory, task: e.target.value })}
              />
            </div>
            <div className="field">
              <label style={{ display: 'flex', alignItems: 'center', gap: '.4rem', color: 'var(--star-a-text)' }}><div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--star-a-bg)', display: 'grid', placeItems: 'center', fontSize: '.8rem', fontWeight: 800 }}>A</div>ction</label>
              <textarea 
                rows={4} 
                placeholder="What specific actions did you take to address the task? Focus on 'I', not 'we'."
                value={currentStory.action}
                onChange={(e) => setCurrentStory({ ...currentStory, action: e.target.value })}
              />
            </div>
            <div className="field">
              <label style={{ display: 'flex', alignItems: 'center', gap: '.4rem', color: 'var(--star-r-text)' }}><div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--star-r-bg)', display: 'grid', placeItems: 'center', fontSize: '.8rem', fontWeight: 800 }}>R</div>esult</label>
              <textarea 
                rows={4} 
                placeholder="What was the outcome? Share measurable results and what you learned."
                value={currentStory.result}
                onChange={(e) => setCurrentStory({ ...currentStory, result: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button className="btn btn-primary" onClick={handleSave}>
              <Save size={18} /> Save Story
            </button>
            <button className="btn btn-ghost" onClick={handleCancel}>
              <X size={18} /> Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="dash-grid-2">
        {stories.map((story) => (
          <div key={story.id} className="widget" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--text)' }}>{story.title}</h3>
              <div style={{ display: 'flex', gap: '.5rem' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(story)} style={{ padding: '.4rem' }}>
                  <Edit3 size={16} color="var(--text-2)" />
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(story.id)} style={{ padding: '.4rem' }}>
                  <Trash2 size={16} color="#ef4444" />
                </button>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.8rem', fontSize: '.85rem' }}>
              <div>
                <strong style={{ color: 'var(--star-s-text)' }}>S:</strong> <span style={{ color: 'var(--text-2)' }}>{story.situation || 'Not filled out'}</span>
              </div>
              <div>
                <strong style={{ color: 'var(--star-t-text)' }}>T:</strong> <span style={{ color: 'var(--text-2)' }}>{story.task || 'Not filled out'}</span>
              </div>
              <div>
                <strong style={{ color: 'var(--star-a-text)' }}>A:</strong> <span style={{ color: 'var(--text-2)' }}>{story.action || 'Not filled out'}</span>
              </div>
              <div>
                <strong style={{ color: 'var(--star-r-text)' }}>R:</strong> <span style={{ color: 'var(--text-2)' }}>{story.result || 'Not filled out'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!editingId && stories.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--surface-hover)', borderRadius: 'var(--r-lg)', border: '1px dashed var(--line-2)' }}>
          <Star size={48} color="var(--text-3)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <p style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-2)' }}>
            You haven't added any behavioral stories yet.
          </p>
          <button className="btn btn-primary" onClick={handleAddNew} style={{ margin: '0 auto' }}>
            <Plus size={18} /> Create your first STAR story
          </button>
        </div>
      )}
    </>
  );
}
