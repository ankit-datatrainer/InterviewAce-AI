'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Check, Plus } from 'lucide-react';

/** A named bucket of related job titles, used to group the dropdown. */
export interface RoleGroup {
  category: string;
  roles: string[];
}

// Raw, hand-curated set of commonly posted job titles across IT and non-IT
// industries — the same kind of breadth LinkedIn's job-title field offers.
// This is only ever a shortcut: users can always type a role that isn't here.
const RAW_ROLE_GROUPS: RoleGroup[] = [
  {
    category: 'Software & Engineering',
    roles: [
      'Software Engineer',
      'Senior Software Engineer',
      'Staff Software Engineer',
      'Principal Software Engineer',
      'Lead Software Engineer',
      'Junior Software Engineer',
      'Software Engineer Intern',
      'Frontend Developer',
      'Backend Developer',
      'Full Stack Developer',
      'Web Developer',
      'Mobile App Developer',
      'Android Developer',
      'iOS Developer',
      'React Native Developer',
      'Flutter Developer',
      'Game Developer',
      'Embedded Systems Engineer',
      'Firmware Engineer',
      'Java Developer',
      'Python Developer',
      '.NET Developer',
      'C++ Developer',
      'PHP Developer',
      'Node.js Developer',
      'React Developer',
      'Angular Developer',
      'Salesforce Developer',
      'Blockchain Developer',
      'Software Architect',
      'Solutions Architect',
      'Enterprise Architect',
      'Technical Lead',
      'Engineering Manager',
      'Director of Engineering',
      'VP of Engineering',
      'QA Engineer',
      'QA Automation Engineer',
      'Manual Test Engineer',
      'Software Development Engineer in Test',
      'QA Lead',
      'Developer Advocate',
      'Technical Writer',
      'Scrum Master',
      'Agile Coach',
    ],
  },
  {
    category: 'Data & AI',
    roles: [
      'Data Analyst',
      'Senior Data Analyst',
      'Data Scientist',
      'Senior Data Scientist',
      'Principal Data Scientist',
      'Data Engineer',
      'Senior Data Engineer',
      'Analytics Engineer',
      'Big Data Engineer',
      'Machine Learning Engineer',
      'Senior Machine Learning Engineer',
      'AI Engineer',
      'Applied Scientist',
      'Computer Vision Engineer',
      'NLP Engineer',
      'MLOps Engineer',
      'Prompt Engineer',
      'Data Architect',
      'Database Administrator',
      'Business Intelligence Analyst',
      'Quantitative Analyst',
      'Statistician',
      'Head of Data',
      'Director of Data Science',
      'Chief Data Officer',
    ],
  },
  {
    category: 'Infrastructure, Security & IT',
    roles: [
      'DevOps Engineer',
      'Senior DevOps Engineer',
      'Site Reliability Engineer',
      'Platform Engineer',
      'Cloud Engineer',
      'Cloud Architect',
      'Infrastructure Engineer',
      'Systems Engineer',
      'System Administrator',
      'Network Engineer',
      'Network Administrator',
      'Network Security Engineer',
      'Cybersecurity Analyst',
      'Security Engineer',
      'Information Security Analyst',
      'Penetration Tester',
      'Security Architect',
      'IT Support Specialist',
      'IT Support Engineer',
      'Help Desk Technician',
      'Desktop Support Engineer',
      'Technical Support Engineer',
      'IT Manager',
      'IT Director',
      'Chief Information Officer',
      'Chief Technology Officer',
      'Chief Information Security Officer',
    ],
  },
  {
    category: 'Product, Design & Project',
    roles: [
      'Product Manager',
      'Associate Product Manager',
      'Senior Product Manager',
      'Technical Product Manager',
      'Product Owner',
      'Product Analyst',
      'Director of Product Management',
      'VP of Product',
      'Chief Product Officer',
      'Project Manager',
      'Senior Project Manager',
      'Technical Project Manager',
      'Program Manager',
      'Technical Program Manager',
      'Business Analyst',
      'Senior Business Analyst',
      'Product Designer',
      'Senior Product Designer',
      'UI/UX Designer',
      'UX Designer',
      'UI Designer',
      'UX Researcher',
      'UX Writer',
      'Interaction Designer',
      'Visual Designer',
      'Design Manager',
      'Head of Design',
    ],
  },
  {
    category: 'Marketing & Communications',
    roles: [
      'Marketing Executive',
      'Marketing Specialist',
      'Marketing Manager',
      'Marketing Analyst',
      'Digital Marketing Specialist',
      'Digital Marketing Manager',
      'Performance Marketing Manager',
      'Growth Marketing Manager',
      'Demand Generation Manager',
      'Product Marketing Manager',
      'Brand Manager',
      'Brand Strategist',
      'SEO Specialist',
      'SEO Manager',
      'PPC Specialist',
      'Email Marketing Specialist',
      'CRM Manager',
      'Social Media Manager',
      'Social Media Specialist',
      'Community Manager',
      'Content Marketing Manager',
      'Content Strategist',
      'Content Writer',
      'Copywriter',
      'Communications Manager',
      'Public Relations Specialist',
      'Public Relations Manager',
      'Marketing Director',
      'VP of Marketing',
      'Chief Marketing Officer',
    ],
  },
  {
    category: 'Sales & Business Development',
    roles: [
      'Sales Executive',
      'Sales Representative',
      'Sales Development Representative',
      'Business Development Representative',
      'Inside Sales Representative',
      'Account Executive',
      'Senior Account Executive',
      'Enterprise Account Executive',
      'Account Manager',
      'Key Account Manager',
      'Sales Manager',
      'Regional Sales Manager',
      'Sales Director',
      'VP of Sales',
      'Chief Revenue Officer',
      'Business Development Executive',
      'Business Development Manager',
      'Business Development Director',
      'Partnerships Manager',
      'Sales Engineer',
      'Solutions Consultant',
      'Sales Operations Manager',
      'Revenue Operations Manager',
      'Relationship Manager',
      'Retail Store Manager',
    ],
  },
  {
    category: 'Finance & Accounting',
    roles: [
      'Financial Analyst',
      'Senior Financial Analyst',
      'FP&A Analyst',
      'FP&A Manager',
      'Finance Manager',
      'Finance Director',
      'Financial Controller',
      'Chief Financial Officer',
      'Accountant',
      'Senior Accountant',
      'Chartered Accountant',
      'Certified Public Accountant',
      'Accounts Payable Specialist',
      'Bookkeeper',
      'Payroll Specialist',
      'Tax Accountant',
      'Tax Consultant',
      'Auditor',
      'Internal Auditor',
      'Investment Banking Analyst',
      'Equity Research Analyst',
      'Credit Analyst',
      'Risk Analyst',
      'Risk Manager',
      'Portfolio Manager',
      'Wealth Manager',
      'Financial Advisor',
      'Actuary',
      'Underwriter',
    ],
  },
  {
    category: 'Human Resources & Recruiting',
    roles: [
      'HR Executive',
      'HR Generalist',
      'HR Business Partner',
      'Human Resources Manager',
      'HR Director',
      'Head of People',
      'Chief Human Resources Officer',
      'People Operations Manager',
      'Talent Acquisition Specialist',
      'Talent Acquisition Manager',
      'Recruiter',
      'Senior Recruiter',
      'Technical Recruiter',
      'Recruitment Consultant',
      'Compensation and Benefits Analyst',
      'Payroll Manager',
      'Learning and Development Manager',
      'Corporate Trainer',
      'Diversity and Inclusion Manager',
    ],
  },
  {
    category: 'Operations & Supply Chain',
    roles: [
      'Operations Analyst',
      'Operations Manager',
      'Business Operations Manager',
      'Director of Operations',
      'VP of Operations',
      'Supply Chain Analyst',
      'Supply Chain Manager',
      'Logistics Coordinator',
      'Logistics Manager',
      'Warehouse Supervisor',
      'Warehouse Manager',
      'Inventory Manager',
      'Procurement Specialist',
      'Procurement Manager',
      'Purchasing Manager',
      'Category Manager',
      'Production Manager',
      'Plant Manager',
      'Manufacturing Engineer',
      'Process Engineer',
      'Industrial Engineer',
      'Quality Analyst',
      'Quality Assurance Manager',
      'Facilities Manager',
    ],
  },
  {
    category: 'Consulting & Strategy',
    roles: [
      'Management Consultant',
      'Strategy Consultant',
      'Business Consultant',
      'Senior Consultant',
      'Engagement Manager',
      'Strategy Analyst',
      'Strategy Manager',
      'Corporate Development Manager',
      'Technology Consultant',
      'Implementation Consultant',
      'SAP Consultant',
      'ERP Consultant',
      'Management Trainee',
      'Chief of Staff',
    ],
  },
  {
    category: 'Healthcare & Clinical',
    roles: [
      'Registered Nurse',
      'Staff Nurse',
      'Nurse Practitioner',
      'Nurse Manager',
      'Physician',
      'General Practitioner',
      'Physician Assistant',
      'Surgeon',
      'Pediatrician',
      'Psychiatrist',
      'Dentist',
      'Veterinarian',
      'Pharmacist',
      'Pharmacy Technician',
      'Physical Therapist',
      'Occupational Therapist',
      'Paramedic',
      'Medical Laboratory Technician',
      'Medical Assistant',
      'Medical Coder',
      'Clinical Research Associate',
      'Clinical Research Coordinator',
      'Regulatory Affairs Specialist',
      'Medical Representative',
      'Medical Science Liaison',
      'Healthcare Administrator',
      'Dietitian',
      'Clinical Psychologist',
      'Counselor',
      'Social Worker',
    ],
  },
  {
    category: 'Education & Academia',
    roles: [
      'Teacher',
      'High School Teacher',
      'Special Education Teacher',
      'Teaching Assistant',
      'Lecturer',
      'Assistant Professor',
      'Associate Professor',
      'Professor',
      'Postdoctoral Researcher',
      'Research Assistant',
      'Academic Counselor',
      'Career Counselor',
      'School Principal',
      'Curriculum Developer',
      'Instructional Designer',
      'Education Consultant',
      'Librarian',
    ],
  },
  {
    category: 'Legal & Compliance',
    roles: [
      'Lawyer',
      'Attorney',
      'Legal Associate',
      'Legal Counsel',
      'General Counsel',
      'Corporate Lawyer',
      'Intellectual Property Attorney',
      'Paralegal',
      'Legal Assistant',
      'Contract Manager',
      'Compliance Analyst',
      'Compliance Officer',
      'Compliance Manager',
      'Regulatory Affairs Manager',
      'Data Protection Officer',
    ],
  },
  {
    category: 'Civil, Mechanical & Electrical Engineering',
    roles: [
      'Civil Engineer',
      'Structural Engineer',
      'Environmental Engineer',
      'Site Engineer',
      'Surveyor',
      'Mechanical Engineer',
      'Design Engineer',
      'CAD Engineer',
      'HVAC Engineer',
      'Automotive Engineer',
      'Aerospace Engineer',
      'Robotics Engineer',
      'Electrical Engineer',
      'Electronics Engineer',
      'Instrumentation Engineer',
      'Hardware Engineer',
      'Chemical Engineer',
      'Petroleum Engineer',
      'Mining Engineer',
      'Materials Engineer',
      'Biomedical Engineer',
      'Maintenance Engineer',
      'Project Engineer',
      'Health and Safety Engineer',
    ],
  },
  {
    category: 'Science & Research',
    roles: [
      'Research Scientist',
      'Research Associate',
      'Laboratory Technician',
      'Biologist',
      'Microbiologist',
      'Biotechnologist',
      'Biochemist',
      'Bioinformatics Scientist',
      'Chemist',
      'Physicist',
      'Geologist',
      'Environmental Scientist',
      'Food Scientist',
      'Epidemiologist',
      'Quality Control Analyst',
    ],
  },
  {
    category: 'Creative, Media & Content',
    roles: [
      'Graphic Designer',
      'Art Director',
      'Creative Director',
      'Illustrator',
      'Motion Graphics Designer',
      '3D Artist',
      'Animator',
      'Video Editor',
      'Videographer',
      'Photographer',
      'Sound Engineer',
      'Film Director',
      'Producer',
      'Content Creator',
      'Journalist',
      'Reporter',
      'Editor',
      'Managing Editor',
      'Translator',
      'Fashion Designer',
      'Interior Designer',
      'Industrial Designer',
    ],
  },
  {
    category: 'Hospitality, Travel & Food',
    roles: [
      'Hotel Manager',
      'Hospitality Manager',
      'Front Office Executive',
      'Restaurant Manager',
      'Chef',
      'Executive Chef',
      'Sous Chef',
      'Food and Beverage Manager',
      'Catering Manager',
      'Event Manager',
      'Event Coordinator',
      'Travel Agent',
      'Travel Consultant',
      'Flight Attendant',
      'Pilot',
    ],
  },
  {
    category: 'Real Estate & Construction',
    roles: [
      'Real Estate Agent',
      'Real Estate Broker',
      'Real Estate Analyst',
      'Property Manager',
      'Construction Manager',
      'Construction Project Manager',
      'Site Supervisor',
      'Quantity Surveyor',
      'Architect',
      'Landscape Architect',
      'Urban Planner',
      'Safety Officer',
    ],
  },
  {
    category: 'Non-profit & Government',
    roles: [
      'Program Coordinator',
      'Grant Writer',
      'Fundraising Manager',
      'Development Director',
      'Community Outreach Coordinator',
      'Policy Analyst',
      'Public Policy Manager',
      'Legislative Assistant',
      'Government Affairs Manager',
      'Case Manager',
      'Intelligence Analyst',
      'Police Officer',
      'Firefighter',
    ],
  },
  {
    category: 'Skilled Trades & Manufacturing',
    roles: [
      'Electrician',
      'Plumber',
      'Carpenter',
      'Welder',
      'Machinist',
      'CNC Operator',
      'HVAC Technician',
      'Automotive Technician',
      'Aircraft Maintenance Technician',
      'Maintenance Technician',
      'Painter',
      'Heavy Equipment Operator',
      'Truck Driver',
      'Delivery Driver',
      'Machine Operator',
    ],
  },
  {
    category: 'Customer Support & Success',
    roles: [
      'Customer Support Executive',
      'Customer Service Representative',
      'Customer Service Manager',
      'Technical Support Specialist',
      'Customer Success Manager',
      'Senior Customer Success Manager',
      'Director of Customer Success',
      'Client Services Manager',
      'Customer Experience Manager',
      'Support Team Lead',
      'Call Center Manager',
    ],
  },
  {
    category: 'Executive & General Management',
    roles: [
      'Chief Executive Officer',
      'Chief Operating Officer',
      'Managing Director',
      'General Manager',
      'President',
      'Vice President',
      'Executive Director',
      'Head of Growth',
      'Head of Operations',
      'Founder',
      'Co-Founder',
      'Administrative Officer',
      'Office Manager',
    ],
  },
];

/** Drops case-insensitive duplicates while preserving group and role order. */
function dedupeGroups(groups: RoleGroup[]): RoleGroup[] {
  const seen = new Set<string>();
  const out: RoleGroup[] = [];
  for (const g of groups) {
    const roles: string[] = [];
    for (const role of g.roles) {
      const key = role.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      roles.push(role);
    }
    if (roles.length > 0) out.push({ category: g.category, roles });
  }
  return out;
}

/** Job titles grouped by category — used to render the dropdown sections. */
export const ROLE_GROUPS: RoleGroup[] = dedupeGroups(RAW_ROLE_GROUPS);

// A comprehensive flat list of popular target roles across IT and non-IT
// industries. Users can pick one of these OR type a completely new role.
export const COMMON_ROLES: string[] = ROLE_GROUPS.flatMap((g) => g.roles);

/** Category each known role belongs to (lowercased role -> category). */
const CATEGORY_BY_ROLE = new Map<string, string>(
  ROLE_GROUPS.flatMap((g) => g.roles.map((r) => [r.toLowerCase(), g.category] as const)),
);

const OTHER_CATEGORY = 'Other';

/** Max items shown per category when the user hasn't typed anything yet. */
const UNFILTERED_PER_GROUP = 3;
/** Max items shown in total when the user hasn't typed anything yet. */
const UNFILTERED_TOTAL_CAP = 60;
/** Max items rendered while filtering (searching still covers the full list). */
const FILTERED_TOTAL_CAP = 120;

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
  const listRef = useRef<HTMLDivElement>(null);

  // Turn whatever flat `options` array we were given back into categories.
  // Anything we don't recognise (e.g. the consumer's "Custom Job Description")
  // is kept, in its original order, under a trailing "Other" group.
  const groups = useMemo<RoleGroup[]>(() => {
    const buckets = new Map<string, string[]>();
    const seen = new Set<string>();
    for (const role of options) {
      const key = role.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const category = CATEGORY_BY_ROLE.get(key) ?? OTHER_CATEGORY;
      const bucket = buckets.get(category);
      if (bucket) bucket.push(role);
      else buckets.set(category, [role]);
    }
    const ordered: RoleGroup[] = [];
    for (const g of ROLE_GROUPS) {
      const roles = buckets.get(g.category);
      if (roles && roles.length > 0) ordered.push({ category: g.category, roles });
    }
    const other = buckets.get(OTHER_CATEGORY);
    if (other && other.length > 0) ordered.push({ category: OTHER_CATEGORY, roles: other });
    return ordered;
  }, [options]);

  const query = value.trim().toLowerCase();
  const isFiltering = query.length > 0;

  // Visible groups + the flattened list the keyboard actually walks through.
  // `offset` is the index of a group's first role inside `flatRoles`, which is
  // what makes the highlight index line up across group boundaries.
  const { visibleGroups, flatRoles, totalMatches } = useMemo(() => {
    const vis: Array<{ category: string; roles: string[]; offset: number }> = [];
    const flat: string[] = [];
    let matches = 0;

    for (const g of groups) {
      const matched = isFiltering ? g.roles.filter((r) => r.toLowerCase().includes(query)) : g.roles;
      if (matched.length === 0) continue;
      matches += matched.length;

      const remaining = (isFiltering ? FILTERED_TOTAL_CAP : UNFILTERED_TOTAL_CAP) - flat.length;
      if (remaining <= 0) continue;
      const perGroup = isFiltering ? matched.length : Math.min(matched.length, UNFILTERED_PER_GROUP);
      const shown = matched.slice(0, Math.min(perGroup, remaining));
      if (shown.length === 0) continue;

      vis.push({ category: g.category, roles: shown, offset: flat.length });
      flat.push(...shown);
    }

    return { visibleGroups: vis, flatRoles: flat, totalMatches: matches };
  }, [groups, isFiltering, query]);

  const totalRoles = useMemo(
    () => groups.reduce((n, g) => n + g.roles.length, 0),
    [groups],
  );

  // Whether the typed value exactly matches an existing option.
  const exactMatch = options.some((o) => o.toLowerCase() === query);
  const showCustom = query.length > 0 && !exactMatch;
  const customIndex = flatRoles.length;
  const totalItems = flatRoles.length + (showCustom ? 1 : 0);
  const hiddenCount = totalMatches - flatRoles.length;

  // Close on outside click.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  useEffect(() => setHighlight(0), [value, open]);

  // Keep the highlighted row inside the scrollable dropdown.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${highlight}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open]);

  const pick = (role: string) => {
    onChange(role);
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, Math.max(0, totalItems - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && totalItems > 0) {
        e.preventDefault();
        if (showCustom && highlight === customIndex) pick(value.trim());
        else {
          const role = flatRoles[highlight];
          if (role) pick(role);
        }
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const headerLabelStyle: React.CSSProperties = {
    fontSize: '0.72rem',
    textTransform: 'uppercase',
    letterSpacing: '.06em',
    color: 'var(--text-3, #6b7280)',
    fontWeight: 700,
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

      {open && totalItems > 0 && (
        <div
          ref={listRef}
          role="listbox"
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 50,
            background: 'var(--bg-2, #12131a)', border: '1px solid var(--line-2, rgba(255,255,255,0.1))',
            borderRadius: 12, boxShadow: '0 18px 44px rgba(0,0,0,0.5)',
            maxHeight: 280, overflowY: 'auto', padding: 6,
          }}
        >
          {/* Makes it explicit that the list is a shortcut, not a fixed menu —
              any role at all can simply be typed. */}
          <div style={{ ...headerLabelStyle, padding: '6px 12px 8px' }}>
            {isFiltering ? `${totalMatches} matching role${totalMatches === 1 ? '' : 's'}` : 'Popular roles'} · type any role
          </div>

          {visibleGroups.map((group) => (
            <div key={group.category}>
              <div
                style={{
                  ...headerLabelStyle,
                  position: 'sticky',
                  top: -6,
                  zIndex: 1,
                  padding: '6px 12px 4px',
                  background: 'var(--bg-2, #12131a)',
                }}
              >
                {group.category}
              </div>
              {group.roles.map((role, i) => {
                const idx = group.offset + i;
                const selected = role.toLowerCase() === query;
                const active = idx === highlight;
                return (
                  <button
                    key={role}
                    type="button"
                    role="option"
                    data-idx={idx}
                    aria-selected={selected}
                    onMouseEnter={() => setHighlight(idx)}
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
            </div>
          ))}

          {hiddenCount > 0 && (
            <div style={{ padding: '8px 12px 4px', fontSize: '0.76rem', color: 'var(--text-3, #6b7280)' }}>
              {isFiltering
                ? `+${hiddenCount} more matches — keep typing to narrow down`
                : `Keep typing to search all ${totalRoles} roles`}
            </div>
          )}

          {showCustom && (
            <button
              type="button"
              role="option"
              data-idx={customIndex}
              aria-selected={false}
              onMouseEnter={() => setHighlight(customIndex)}
              onClick={() => pick(value.trim())}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                marginTop: flatRoles.length > 0 ? 4 : 0,
                borderTop: flatRoles.length > 0 ? '1px solid var(--line-2, rgba(255,255,255,0.08))' : 'none',
                background: highlight === customIndex ? 'var(--blue, #2563eb)' : 'transparent',
                color: highlight === customIndex ? '#fff' : 'var(--text-2, #9ca3af)', fontSize: '0.92rem',
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
