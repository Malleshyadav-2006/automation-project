import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';
import { Bot, X, Send, Trash2, Sparkles, ChevronDown } from 'lucide-react';

export default function AiAgent() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', text: "Hi! I'm your email AI. Tell me how you want future emails written — tone, style, length, anything. e.g. \"Always mention the resume is attached\" or \"Make emails more casual and funny\"." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [rules, setRules] = useState('');
  const [showRules, setShowRules] = useState(false);
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

  const sendMessage = async () => {
    const msg = input.trim();
    if (!msg || loading) return;

    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setInput('');
    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/ai-chat`, { message: msg });
      setMessages(prev => [...prev, { role: 'ai', text: res.data.reply }]);
      setRules(res.data.rules || '');
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: '⚠️ Failed to process. Is the backend online?' }]);
    }
    setLoading(false);
  };

  const clearRules = async () => {
    if (!window.confirm('Clear all AI email rules?')) return;
    try {
      await axios.delete(`${API_BASE}/ai-chat/rules`);
      setRules('');
      setMessages(prev => [...prev, { role: 'ai', text: '✓ All rules cleared. Emails will use default style.' }]);
    } catch {}
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
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ height: '480px' }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-white font-semibold text-sm">Email AI Agent</span>
            </div>
            <span className="text-indigo-200 text-xs">Controls future emails</span>
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
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-200 border border-slate-700'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2">
                  <div className="flex gap-1">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-700 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="e.g. Make emails shorter and funnier"
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
        </div>
      )}
    </>
  );
}
