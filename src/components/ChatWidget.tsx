'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Send,
  Mic,
  FileText,
  CreditCard,
  GraduationCap,
  Shield,
  HelpCircle,
  ChevronRight,
  Sparkles,
  MessagesSquare,
} from 'lucide-react';

/* ======================================================
   TYPES
   ====================================================== */
interface Message {
  id: string;
  text: string;
  sender: 'bot' | 'user';
  timestamp: Date;
  followUps?: string[];
}

interface QA {
  keywords: RegExp;
  reply: string;
  followUps?: string[];
}

/* ======================================================
   KNOWLEDGE BASE — no LLM key required
   ====================================================== */
const knowledgeBase: QA[] = [
  {
    keywords: /(hi|hello|hey|namaste|hola|howdy|good morning|good evening)/,
    reply:
      "Hey there! 👋 I'm <b>Ace</b>, your InterviewAce assistant. I can help you with mock interviews, ATS resume analysis, coaching, pricing &amp; more. What would you like to know?",
    followUps: ['Mock interviews', 'ATS score', 'Pricing', 'Coaching'],
  },
  {
    keywords: /(mock|interview|avatar|practice|round|behavioral|technical|hr round)/,
    reply:
      'Our <b>AI mock interviews</b> simulate real interview environments — choose from HR, Technical, or Behavioral rounds. You\'ll face a live AI avatar interviewer with adaptive follow-up questions and a real-time transcript. A <b>3-strike discipline system</b> keeps you focused (silences, off-topic answers, and interruptions earn strikes). You receive a detailed <b>10-metric scorecard</b> within 2 minutes of finishing.',
    followUps: ['How many interviews can I do?', 'ATS score', 'Pricing'],
  },
  {
    keywords: /(ats|resume|cv|keyword|upload|score|scan|analy)/,
    reply:
      'The <b>ATS Analyzer</b> scores your resume 0–100 the same way recruiter software does — checking formatting, keyword match for your target role, quantified achievements, and structure. It supports <b>PDF, DOC &amp; DOCX</b>. You\'ll see exactly which keywords are missing, and our built-in <b>Resume Builder</b> lets you fix each section and re-score instantly.',
    followUps: ['What formats are supported?', 'Mock interviews', 'Pricing'],
  },
  {
    keywords: /(price|pricing|plan|cost|subscri|pro |premium|free|pay|billing|money)/,
    reply:
      "Here's our pricing:<br/><br/>🆓 <b>Free</b> — 1 mock interview + basic ATS analysis<br/>💎 <b>Pro</b> — ₹499/mo (₹399/mo yearly): unlimited interviews, advanced feedback, recordings &amp; resume builder<br/>👑 <b>Premium</b> — ₹999/mo (₹799/mo yearly): everything in Pro + 2 coaching sessions monthly, priority support &amp; career roadmap<br/><br/>You can start free anytime!",
    followUps: ['Start free trial', 'What does Pro include?', 'Coaching'],
  },
  {
    keywords: /(coach|mentor|book|session|expert|trainer|guidance)/,
    reply:
      'We have <b>500+ verified coaches</b> across 6 categories — Communication Coaches, Personality Trainers, Interview Experts, HR Professionals, Corporate Mentors &amp; Career Coaches. Each profile shows rating, experience &amp; price. Pick a slot, pay securely, and meet over video. Sessions start at <b>₹700</b>.',
    followUps: ['How to book a session?', 'Pricing', 'Mock interviews'],
  },
  {
    keywords: /(privacy|data|record|storage|secure|delete|encrypt|gdpr)/,
    reply:
      'Your privacy matters — resumes, recordings &amp; transcripts are <b>encrypted end-to-end</b> and visible only to you (and a coach only during a booked session). Recordings are stored <b>90 days</b> on Free/Pro and <b>12 months</b> on Premium. You can download or permanently delete them anytime from Settings.',
    followUps: ['Pricing', 'Contact support', 'Mock interviews'],
  },
  {
    keywords: /(contact|support|help|email|phone|human|complain|issue|bug)/,
    reply:
      'You can reach a human anytime!<br/><br/>💬 <b>Live chat</b>: 9 AM – 9 PM IST (replies in under 3 min)<br/>📧 <b>Email</b>: support@interviewace.ai (24-hour replies)<br/>📞 Students can use our <b>free career guidance helpline</b> for a 15-min direction call.',
    followUps: ['Pricing', 'Privacy policy', 'Mock interviews'],
  },
  {
    keywords: /(start|begin|try|get started|sign up|register|create account)/,
    reply:
      'Getting started is simple! Click the <b>"Start free"</b> button at the top of the page or navigate to the Dashboard. You can take your first mock interview and get an ATS resume score — completely free, no credit card needed.',
    followUps: ['Mock interviews', 'ATS score', 'Pricing'],
  },
  {
    keywords: /(how many|limit|unlimited|quota|cap)/,
    reply:
      'On the <b>Free</b> plan, you get 1 mock interview + basic ATS analysis. Upgrade to <b>Pro</b> for <b>unlimited interviews</b>, advanced feedback, recording playback, and the full resume builder. <b>Premium</b> adds 2 coaching sessions per month on top of everything in Pro.',
    followUps: ['Pricing', 'Start free trial', 'Coaching'],
  },
  {
    keywords: /(format|file type|pdf|doc|docx|word)/,
    reply:
      'The ATS Analyzer supports <b>PDF, DOC, and DOCX</b> file formats. Simply drag &amp; drop or click to upload your resume. The analysis runs in seconds and gives you a detailed breakdown with actionable suggestions.',
    followUps: ['ATS score', 'Mock interviews', 'Pricing'],
  },
  {
    keywords: /(star|star method|situation|task|action|result)/,
    reply:
      'We have a built-in <b>STAR Method Builder</b> that helps you structure your behavioral answers perfectly. Break down each experience into Situation, Task, Action &amp; Result — and practice delivering them in mock interviews for maximum impact.',
    followUps: ['Mock interviews', 'Coaching', 'ATS score'],
  },
  {
    keywords: /(history|past|previous|review|playback|recording)/,
    reply:
      'All your past interviews are saved in the <b>Interview History</b> section of your dashboard. You can review transcripts, watch recordings (Pro &amp; Premium), and track your progress over time with detailed analytics.',
    followUps: ['Mock interviews', 'Pricing', 'ATS score'],
  },
  {
    keywords: /(thank|thanks|awesome|great|nice|cool|perfect|wonderful)/,
    reply:
      "You're most welcome! 🙌 Remember — every mock round makes the real one easier. Is there anything else I can help you with?",
    followUps: ['Mock interviews', 'ATS score', 'Pricing', 'Coaching'],
  },
  {
    keywords: /(bye|goodbye|see you|later|exit|quit)/,
    reply:
      'Goodbye! 👋 Best of luck with your interviews. Come back anytime you need help — I\'m always here!',
    followUps: ['Mock interviews', 'ATS score', 'Pricing'],
  },
  {
    keywords: /(compare|vs|versus|difference|better)/,
    reply:
      '<b>Free vs Pro vs Premium</b>:<br/><br/>• <b>Free</b>: Try the platform — 1 interview, basic ATS<br/>• <b>Pro</b> (₹499/mo): Unlimited interviews, advanced feedback, recordings, resume builder<br/>• <b>Premium</b> (₹999/mo): Everything in Pro + 2 coaching sessions/month, priority support, career roadmap<br/><br/>Most users start with Pro!',
    followUps: ['Start free trial', 'Coaching', 'Contact support'],
  },
  {
    keywords: /(job description|jd|custom|role|position)/,
    reply:
      'You can paste a <b>custom Job Description</b> before starting your mock interview. Our AI will tailor questions specifically to that role — matching the exact skills, technologies, and experience level the employer is looking for.',
    followUps: ['Mock interviews', 'ATS score', 'STAR method'],
  },
];

const defaultReply: Message = {
  id: '',
  text: "Great question! I can help with <b>AI mock interviews</b>, <b>ATS resume analysis</b>, <b>coaching sessions</b>, <b>pricing</b>, and <b>privacy</b>. Try asking about one of those — or hit <b>'Start free'</b> to jump into your first mock interview!",
  sender: 'bot',
  timestamp: new Date(),
  followUps: ['Mock interviews', 'ATS score', 'Pricing', 'Coaching'],
};

function getReply(input: string): { reply: string; followUps: string[] } {
  const t = input.toLowerCase().trim();
  for (const qa of knowledgeBase) {
    if (qa.keywords.test(t)) {
      return {
        reply: qa.reply,
        followUps: qa.followUps || [],
      };
    }
  }
  return {
    reply: defaultReply.text,
    followUps: defaultReply.followUps || [],
  };
}

/* ======================================================
   QUICK CHIPS (initial state)
   ====================================================== */
const initialChips = [
  { label: 'Mock interviews', icon: Mic },
  { label: 'ATS score', icon: FileText },
  { label: 'Pricing', icon: CreditCard },
  { label: 'Coaching', icon: GraduationCap },
  { label: 'Privacy', icon: Shield },
  { label: 'Help', icon: HelpCircle },
];

import { usePathname } from 'next/navigation';

/* ======================================================
   UNIQUE ID
   ====================================================== */
let _msgId = 0;
function uid(): string {
  return `msg_${Date.now()}_${++_msgId}`;
}

/* ======================================================
   COMPONENT
   ====================================================== */
export default function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uid(),
      text: "Hi! I'm <b>Ace</b> — your InterviewAce assistant. Ask me about mock interviews, ATS scores, coaching or pricing. How can I help you today?",
      sender: 'bot',
      timestamp: new Date(),
      followUps: ['Mock interviews', 'ATS score', 'Pricing', 'Coaching'],
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [showInitialChips, setShowInitialChips] = useState(true);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);


  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (bodyRef.current) {
        bodyRef.current.scrollTo({
          top: bodyRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing, scrollToBottom]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [open]);

  function sendMessage(text: string) {
    if (!text.trim()) return;
    const trimmed = text.trim();

    const userMsg: Message = {
      id: uid(),
      text: trimmed,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setShowInitialChips(false);
    setTyping(true);

    // Simulate bot typing delay
    const delay = 400 + Math.random() * 600;
    setTimeout(() => {
      const { reply, followUps } = getReply(trimmed);
      const botMsg: Message = {
        id: uid(),
        text: reply,
        sender: 'bot',
        timestamp: new Date(),
        followUps,
      };
      setMessages((prev) => [...prev, botMsg]);
      setTyping(false);
    }, delay);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') sendMessage(input);
  }

  const lastBotMsg = [...messages].reverse().find((m) => m.sender === 'bot');

  if (pathname?.startsWith('/admin') || pathname?.startsWith('/dashboard')) {
    return null;
  }

  return (
    <>
      {/* -------- FAB -------- */}
      <button
        className={`ace-fab${open ? ' ace-fab--open' : ''}`}
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close chat' : 'Open chat'}
      >
        <span className="ace-fab__icon">
          {open ? (
            <X size={22} strokeWidth={2.5} />
          ) : (
            <MessagesSquare size={24} strokeWidth={2} />
          )}
        </span>
      </button>

      {/* -------- PANEL -------- */}
      <div className={`ace-chat${open ? ' ace-chat--open' : ''}`}>
        {/* HEADER */}
        <div className="ace-chat__head">
          <div className="ace-chat__avatar">
            <svg viewBox="0 0 40 40" width="32" height="32" fill="none">
              <rect x="4" y="10" width="32" height="24" rx="12" fill="rgba(255,255,255,.25)" />
              <circle cx="15" cy="22" r="3" fill="#fff" />
              <circle cx="25" cy="22" r="3" fill="#fff" />
              <circle cx="16" cy="21.5" r="1.3" fill="#0B0E14" />
              <circle cx="26" cy="21.5" r="1.3" fill="#0B0E14" />
              <rect x="16" y="7" width="8" height="5" rx="4" fill="rgba(255,255,255,.3)" />
              <circle cx="20" cy="5" r="2.5" fill="rgba(255,255,255,.35)" stroke="rgba(255,255,255,.6)" strokeWidth="1" />
            </svg>
          </div>
          <div className="ace-chat__head-info">
            <span className="ace-chat__name">Ace · AI Assistant</span>
            <span className="ace-chat__status">
              <i className="ace-chat__dot" />
              Online · replies instantly
            </span>
          </div>
          <button
            className="ace-chat__close"
            onClick={() => setOpen(false)}
            aria-label="Close chat"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* BODY */}
        <div className="ace-chat__body" ref={bodyRef}>
          {messages.map((msg) => (
            <div key={msg.id} className={`ace-bubble ace-bubble--${msg.sender}`}>
              {msg.sender === 'bot' && (
                <div className="ace-bubble__icon">
                  <Sparkles size={14} />
                </div>
              )}
              <div
                className="ace-bubble__text"
                dangerouslySetInnerHTML={{ __html: msg.text }}
              />
            </div>
          ))}

          {typing && (
            <div className="ace-bubble ace-bubble--bot">
              <div className="ace-bubble__icon">
                <Sparkles size={14} />
              </div>
              <div className="ace-bubble__text">
                <span className="ace-dots">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            </div>
          )}

          {/* Follow-up suggestions from last bot message */}
          {!typing && lastBotMsg?.followUps && lastBotMsg.followUps.length > 0 && (
            <div className="ace-suggestions">
              {lastBotMsg.followUps.map((text) => (
                <button
                  key={text}
                  className="ace-suggestion"
                  onClick={() => sendMessage(text)}
                >
                  {text}
                  <ChevronRight size={12} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* QUICK CHIPS (initial) */}
        {showInitialChips && (
          <div className="ace-chips">
            {initialChips.map((chip) => {
              const Icon = chip.icon;
              return (
                <button
                  key={chip.label}
                  className="ace-chip"
                  onClick={() => sendMessage(chip.label)}
                >
                  <Icon size={14} />
                  <span>{chip.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* INPUT */}
        <div className="ace-chat__input">
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className="ace-chat__send"
            onClick={() => sendMessage(input)}
            disabled={!input.trim()}
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </>
  );
}
