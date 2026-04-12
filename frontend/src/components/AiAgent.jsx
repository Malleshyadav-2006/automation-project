import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';
import { Bot, X, Send, Trash2, Sparkles, ChevronDown, Link2, Copy, UserPlus, Check, Loader2 } from 'lucide-react';

// Detect LinkedIn profile URLs in user input
const LINKEDIN_REGEX = /https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?/i;

export default function AiAgent() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      type: 'text',
      text: "Hi! I'm your outreach AI. You can:\n\n🔗 **Paste a LinkedIn URL** → I'll scrape the profile and draft a cold email.\n\n✏️ **Tell me rules** → e.g. \"Make emails shorter\" or \"Always mention the resume\"."
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [rules, setRules] = useState('');
  const [showRules, setShowRules] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) {
      axios.get(`${API_BASE}/ai-chat/rules`)
        .then(res => setRules(res.data.rules || ''))
        .catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sendMessage = async () => {
    const msg = input.trim();
    if (!msg || loading) return;

    setMessages(prev => [...prev, { role: 'user', type: 'text', text: msg }]);
    setInput('');
    setLoading(true);

    // Check if the message contains a LinkedIn URL
    const linkedinMatch = msg.match(LINKEDIN_REGEX);

    if (linkedinMatch) {
      // ─── LINKEDIN FLOW ─────────────────────────────────────────────
      const linkedinUrl = linkedinMatch[0];
      setMessages(prev => [...prev, {
        role: 'ai', type: 'text',
        text: '🔍 Scanning LinkedIn profile… this takes a few seconds.'
      }]);

      try {
        const res = await axios.post(`${API_BASE}/linkedin-email`, { url: linkedinUrl });
        const { profile, email } = res.data;

        setMessages(prev => [...prev, {
          role: 'ai',
          type: 'linkedin',
          profile,
          email,
        }]);
      } catch (err) {
        const errorMsg = err.response?.data?.error || err.message;
        setMessages(prev => [...prev, {
          role: 'ai', type: 'text',
          text: `⚠️ LinkedIn scrape failed: ${errorMsg}\n\nTip: Make sure the URL is a valid profile like linkedin.com/in/username`
        }]);
      }
    } else {
      // ─── NORMAL AI CHAT FLOW (email rules) ─────────────────────────
      try {
        const res = await axios.post(`${API_BASE}/ai-chat`, { message: msg });
        setMessages(prev => [...prev, { role: 'ai', type: 'text', text: res.data.reply }]);
        setRules(res.data.rules || '');
      } catch (err) {
        const errorMsg = err.response?.data?.error || 'Is the backend running? Start it with: node index.js in the backend folder.';
        setMessages(prev => [...prev, {
          role: 'ai', type: 'text',
          text: `⚠️ Failed to process: ${errorMsg}`
        }]);
      }
    }

    setLoading(false);
  };

  const clearRules = async () => {
    if (!window.confirm('Clear all AI email rules?')) return;
    try {
      await axios.delete(`${API_BASE}/ai-chat/rules`);
      setRules('');
      setMessages(prev => [...prev, { role: 'ai', type: 'text', text: '✓ All rules cleared. Emails will use default style.' }]);
    } catch {}
  };

  // ─── RENDER A SINGLE MESSAGE ────────────────────────────────────────────────
  const renderMessage = (msg, index) => {
    // User message
    if (msg.role === 'user') {
      return (
        <div key={index} className="flex justify-end">
          <div className="max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed bg-indigo-600 text-white">
            {msg.text}
          </div>
        </div>
      );
    }

    // AI: LinkedIn result
    if (msg.type === 'linkedin') {
      const { profile, email } = msg;
      const emailId = `email-${index}`;
      const fullEmail = `Subject: ${email.subject}\n\n${email.body}`;

      return (
        <div key={index} className="flex justify-start">
          <div className="max-w-[92%] rounded-xl overflow-hidden border border-slate-700 bg-slate-800">

            {/* Profile Card */}
            <div className="px-3 py-2.5 border-b border-slate-700 bg-gradient-to-r from-blue-900/40 to-slate-800">
              <div className="flex items-center gap-2 mb-1.5">
                <Link2 className="w-4 h-4 text-blue-400" />
                <span className="text-blue-300 text-xs font-semibold uppercase tracking-wider">Profile Found</span>
              </div>
              <p className="text-white font-semibold text-sm">{profile.name || 'Unknown'}</p>
              {profile.headline && (
                <p className="text-slate-300 text-xs mt-0.5">{profile.headline}</p>
              )}
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                {profile.company && (
                  <span className="text-xs text-slate-400">🏢 {profile.company}</span>
                )}
                {profile.location && (
                  <span className="text-xs text-slate-400">📍 {profile.location}</span>
                )}
              </div>
              {profile.summary && (
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed line-clamp-3">{profile.summary}</p>
              )}
            </div>

            {/* Generated Email */}
            <div className="px-3 py-2.5">
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-300 text-xs font-semibold uppercase tracking-wider">Generated Email</span>
              </div>

              <div className="bg-slate-900/60 rounded-lg p-2.5 border border-slate-700/50">
                <p className="text-slate-300 text-xs">
                  <span className="text-slate-500">Subject: </span>
                  <span className="font-medium text-white">{email.subject}</span>
                </p>
                <div className="border-t border-slate-700/50 my-1.5" />
                <p className="text-slate-200 text-xs leading-relaxed whitespace-pre-line">{email.body}</p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => copyToClipboard(fullEmail, emailId)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
                >
                  {copiedId === emailId ? (
                    <><Check className="w-3 h-3 text-emerald-400" /> Copied!</>
                  ) : (
                    <><Copy className="w-3 h-3" /> Copy Email</>
                  )}
                </button>
                <button
                  onClick={() => copyToClipboard(email.subject, `subj-${index}`)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
                >
                  {copiedId === `subj-${index}` ? (
                    <><Check className="w-3 h-3 text-emerald-400" /> Copied!</>
                  ) : (
                    <>Copy Subject</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // AI: regular text
    return (
      <div key={index} className="flex justify-start">
        <div className="max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed bg-slate-800 text-slate-200 border border-slate-700 whitespace-pre-line">
          {msg.text}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-2xl shadow-indigo-500/40 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        title="AI Email Agent"
      >
        {open ? <X className="w-5 h-5" /> : <Bot className="w-6 h-6" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ height: '520px' }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-white font-semibold text-sm">Outreach AI</span>
            </div>
            <span className="text-indigo-200 text-xs flex items-center gap-1">
              <Link2 className="w-3 h-3" /> URL → Email
            </span>
          </div>

          {/* Active rules banner */}
          {rules && (
            <div className="bg-slate-800 border-b border-slate-700">
              <button
                onClick={() => setShowRules(s => !s)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs text-emerald-400 hover:bg-slate-700/50"
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  {rules.split('\n').filter(Boolean).length} active rule{rules.split('\n').filter(Boolean).length !== 1 ? 's' : ''}
                </span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showRules ? 'rotate-180' : ''}`} />
              </button>
              {showRules && (
                <div className="px-3 pb-2">
                  <pre className="text-slate-300 text-xs whitespace-pre-wrap font-mono leading-relaxed">{rules}</pre>
                  <button onClick={clearRules} className="mt-2 flex items-center gap-1 text-xs text-red-400 hover:text-red-300">
                    <Trash2 className="w-3 h-3" /> Clear all rules
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg, i) => renderMessage(msg, i))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                  <span className="text-slate-400 text-xs">Processing…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Paste LinkedIn URL or type a rule…"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-slate-600 text-[10px] mt-1.5 text-center">
              Tip: Paste a LinkedIn URL like linkedin.com/in/username
            </p>
          </div>
        </div>
      )}
    </>
  );
}
