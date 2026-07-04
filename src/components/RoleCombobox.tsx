'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Check, Plus } from 'lucide-react';

// A comprehensive list of popular target roles across IT and non-IT industries.
// Users can pick one of these OR type a completely new role that isn't listed.
export const COMMON_ROLES: string[] = [
  // ---- Software & Engineering (IT) ----
  'Software Engineer',
  'Senior Software Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Mobile App Developer',
  'Android Developer',
  'iOS Developer',
  'Web Developer',
  'Game Developer',
  'Embedded Systems Engineer',
  'Firmware Engineer',
  'DevOps Engineer',
  'Site Reliability Engineer',
  'Cloud Engineer',
  'Platform Engineer',
  'Solutions Architect',
  'Software Architect',
  'QA Engineer',
  'Automation Test Engineer',
  'Manual Test Engineer',
  'Scrum Master',
  // ---- Data & AI (IT) ----
  'Data Analyst',
  'Data Scientist',
  'Data Engineer',
  'Machine Learning Engineer',
  'AI Engineer',
  'Business Intelligence Analyst',
  'Database Administrator',
  'Big Data Engineer',
  'Analytics Engineer',
  // ---- Infra, Security & Support (IT) ----
  'Cybersecurity Analyst',
  'Security Engineer',
  'Network Engineer',
  'System Administrator',
  'IT Support Engineer',
  'Technical Support Engineer',
  'Blockchain Developer',
  'Salesforce Developer',
  'SAP Consultant',
  // ---- Product & Design (IT) ----
  'Product Manager',
  'Associate Product Manager',
  'Senior Product Manager',
  'Technical Product Manager',
  'Project Manager',
  'Program Manager',
  'Business Analyst',
  'UI/UX Designer',
  'Product Designer',
  'UX Researcher',
  'Graphic Designer',
  'Interaction Designer',
  // ---- Marketing & Content (non-IT) ----
  'Digital Marketing Specialist',
  'Marketing Manager',
  'Social Media Manager',
  'SEO Specialist',
  'Content Writer',
  'Copywriter',
  'Content Strategist',
  'Brand Manager',
  'Public Relations Specialist',
  'Growth Marketer',
  // ---- Sales & Customer (non-IT) ----
  'Sales Executive',
  'Business Development Executive',
  'Business Development Manager',
  'Account Manager',
  'Key Account Manager',
  'Customer Success Manager',
  'Customer Support Executive',
  'Relationship Manager',
  'Inside Sales Representative',
  // ---- Finance & Accounting (non-IT) ----
  'Financial Analyst',
  'Investment Banking Analyst',
  'Accountant',
  'Chartered Accountant',
  'Auditor',
  'Tax Consultant',
  'Financial Advisor',
  'Actuary',
  'Credit Analyst',
  // ---- HR & Admin (non-IT) ----
  'Human Resources Manager',
  'HR Executive',
  'Talent Acquisition Specialist',
  'Recruiter',
  'HR Business Partner',
  'Administrative Officer',
  'Office Manager',
  // ---- Operations & Supply Chain (non-IT) ----
  'Operations Manager',
  'Operations Analyst',
  'Supply Chain Analyst',
  'Logistics Coordinator',
  'Procurement Manager',
  'Inventory Manager',
  'Quality Analyst',
  // ---- Consulting & Management (mixed) ----
  'Management Consultant',
  'Business Consultant',
  'Management Trainee',
  'Strategy Analyst',
  // ---- Healthcare (non-IT) ----
  'Registered Nurse',
  'Pharmacist',
  'Medical Representative',
  'Clinical Research Associate',
  'Healthcare Administrator',
  // ---- Education (non-IT) ----
  'Teacher',
  'Professor',
  'Instructional Designer',
  'Academic Counselor',
  // ---- Legal & Others (non-IT) ----
  'Legal Associate',
  'Paralegal',
  'Civil Engineer',
  'Mechanical Engineer',
  'Electrical Engineer',
  'Architect',
  'Hospitality Manager',
  'Event Manager',
];

interface RoleComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options?: string[];
  placeholder?: string;
  id?: string;
}

export default function RoleCombobox({
  value,
  onChange,
  options = COMMON_ROLES,
  placeholder = 'Type or select a role…',
  id,
}: RoleComboboxProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter options by what the user has typed (case-insensitive contains).
  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [value, options]);

  // Whether the typed value exactly matches an existing option.
  const exactMatch = options.some((o) => o.toLowerCase() === value.trim().toLowerCase());
  const showCustom = value.trim().length > 0 && !exactMatch;

  // Close on outside click.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  useEffect(() => setHighlight(0), [value, open]);

  const pick = (role: string) => {
    onChange(role);
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const list = filtered;
    const total = list.length + (showCustom ? 1 : 0);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, Math.max(0, total - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && total > 0) {
        e.preventDefault();
        if (showCustom && highlight === list.length) pick(value.trim());
        else if (list[highlight]) pick(list[highlight]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search
          size={16}
          style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }}
        />
        <input
          id={id}
          ref={inputRef}
          type="text"
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          style={{ paddingLeft: 40, width: '100%' }}
        />
      </div>

      {open && (filtered.length > 0 || showCustom) && (
        <div
          role="listbox"
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 50,
            background: 'var(--bg-2, #12131a)', border: '1px solid var(--line-2, rgba(255,255,255,0.1))',
            borderRadius: 12, boxShadow: '0 18px 44px rgba(0,0,0,0.5)',
            maxHeight: 280, overflowY: 'auto', padding: 6,
          }}
        >
          {filtered.map((role, i) => {
            const selected = role.toLowerCase() === value.trim().toLowerCase();
            const active = i === highlight;
            return (
              <button
                key={role}
                type="button"
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => pick(role)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                  padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: active ? 'var(--blue, #2563eb)' : 'transparent',
                  color: active ? '#fff' : 'var(--text, #e5e7eb)', fontSize: '0.92rem',
                }}
              >
                <Check size={15} style={{ opacity: selected ? 1 : 0, flexShrink: 0 }} />
                <span>{role}</span>
              </button>
            );
          })}

          {showCustom && (
            <button
              type="button"
              role="option"
              onMouseEnter={() => setHighlight(filtered.length)}
              onClick={() => pick(value.trim())}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                marginTop: filtered.length > 0 ? 4 : 0,
                borderTop: filtered.length > 0 ? '1px solid var(--line-2, rgba(255,255,255,0.08))' : 'none',
                background: highlight === filtered.length ? 'var(--blue, #2563eb)' : 'transparent',
                color: highlight === filtered.length ? '#fff' : 'var(--text-2, #9ca3af)', fontSize: '0.92rem',
              }}
            >
              <Plus size={15} style={{ flexShrink: 0 }} />
              <span>Use &ldquo;<b style={{ color: 'inherit' }}>{value.trim()}</b>&rdquo;</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
