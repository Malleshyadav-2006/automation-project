import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { UserPlus, X } from 'lucide-react'

const API = 'https://automation-project-1-ia1w.onrender.com/api'

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', company: '', notes: '', email: '' });
  const [error, setError] = useState('');

  const fetchLeads = async () => {
    try {
      const res = await axios.get(`${API}/leads`);
      setLeads(res.data);
    } catch(err) {
      console.error(err);
    }
    setLoading(false);
  }

  useEffect(() => { fetchLeads(); }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email) { setError('Email is required.'); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API}/leads`, {
        name: form.name,
        company: form.company,
        notes: form.notes,
        email: form.email,
        status: 'Pending',
      });
      setForm({ name: '', company: '', notes: '', email: '' });
      setShowForm(false);
      await fetchLeads();
    } catch(err) {
      setError(err.response?.data?.error || 'Failed to add lead. Please try again.');
      console.error(err);
    }
    setSubmitting(false);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Leads</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
        >
          {showForm ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Add Lead'}
        </button>
      </div>

      {/* Manual Entry Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <h2 className="text-lg font-bold text-slate-800 mb-5">Add New Lead</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-600">Full Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="John Doe"
                className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-600">Company Name</label>
              <input
                type="text"
                name="company"
                value={form.company}
                onChange={handleChange}
                placeholder="Acme Corp"
                className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-600">Email Address <span className="text-red-500">*</span></label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="john@acmecorp.com"
                required
                className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="flex flex-col gap-1.5 md:row-span-2">
              <label className="text-sm font-medium text-slate-600">Overview / Notes</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Brief overview about this lead — their role, company context, why they'd be a good fit…"
                rows={5}
                className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="flex items-end gap-3 md:col-start-1">
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? 'Adding...' : 'Add Lead'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Leads Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between bg-zinc-50/50">
          <input
            type="text"
            placeholder="Search leads..."
            className="px-4 py-2 border border-slate-300 rounded-lg w-64 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 border-opacity-50"
          />
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
              <th className="p-4">Name</th>
              <th className="p-4">Company</th>
              <th className="p-4">Email</th>
              <th className="p-4">Notes</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {loading ? (
              <tr><td colSpan="5" className="p-4 text-center text-slate-400">Loading...</td></tr>
            ) : leads.map(lead => (
              <tr key={lead.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                <td className="p-4 font-medium text-slate-800">{lead.name || '—'}</td>
                <td className="p-4 text-slate-600">{lead.company || '—'}</td>
                <td className="p-4 text-slate-600">{lead.email}</td>
                <td className="p-4 text-slate-500 max-w-xs truncate" title={lead.notes}>{lead.notes || '—'}</td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    lead.status === 'Sent'    ? 'bg-blue-100 text-blue-800'   :
                    lead.status === 'Replied' ? 'bg-green-100 text-green-800' :
                    lead.status === 'Bounced' ? 'bg-red-100 text-red-800'     :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {lead.status}
                  </span>
                </td>
              </tr>
            ))}
            {leads.length === 0 && !loading && (
              <tr><td colSpan="5" className="p-8 text-center text-slate-500">No leads yet. Click "Add Lead" to get started.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
