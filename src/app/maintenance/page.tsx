'use client';

import React from 'react';
import { Settings } from 'lucide-react';

export default function MaintenancePage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center', padding: '2rem' }}>
      <style>{`
        @keyframes spinSlow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes spinSlowReverse {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(-360deg); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(37, 99, 235, 0.4); }
          50% { box-shadow: 0 0 40px rgba(37, 99, 235, 0.8); }
        }
        .gear-container {
          position: relative;
          width: 120px;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 2.5rem;
          background: rgba(37, 99, 235, 0.1);
          border-radius: 50%;
          animation: pulseGlow 3s infinite ease-in-out;
        }
        .gear-main {
          animation: spinSlow 8s infinite linear;
          color: var(--blue);
        }
        .gear-small {
          position: absolute;
          bottom: -5px;
          right: -5px;
          background: var(--bg);
          border-radius: 50%;
          padding: 4px;
          animation: spinSlowReverse 6s infinite linear;
          color: #7C3AED;
        }
        .maintenance-heading {
          background: linear-gradient(to right, #60A5FA, #A78BFA);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>

      <div className="gear-container">
        <Settings size={64} className="gear-main" />
        <div style={{ position: 'absolute', bottom: '-5px', right: '-5px', background: 'var(--bg)', borderRadius: '50%', padding: '4px' }}>
            <Settings size={32} className="gear-small" style={{ position: 'static', padding: 0, bottom: 'auto', right: 'auto', background: 'transparent' }} />
        </div>
      </div>

      <h1 className="maintenance-heading" style={{ fontSize: '3rem', marginBottom: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
        We'll be right back
      </h1>
      
      <p style={{ color: 'var(--text-3)', fontSize: '1.15rem', maxWidth: '500px', lineHeight: 1.7 }}>
        InterviewAce AI is currently undergoing scheduled maintenance to improve our platform and bring you new features. We are working hard to get everything back online shortly.
      </p>
      
      <div style={{ marginTop: '3rem', width: '200px', height: '4px', background: 'var(--bg-2)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ width: '40%', height: '100%', background: 'var(--blue)', borderRadius: '4px', animation: 'indeterminate 2s infinite ease-in-out' }} />
        <style>{`
          @keyframes indeterminate {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(300%); }
          }
        `}</style>
      </div>
    </div>
  );
}
