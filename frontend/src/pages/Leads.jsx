import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { UserPlus, Plus, Trash2, Upload, X } from 'lucide-react'

const API = 'https://automation-project-1-ia1w.onrender.com/api'

const emptyRow = () => ({ name: '', company: '', email: '', notes: '' })

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rows, setRows] = useState(Array.from({ length: 5 }, emptyRow));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successCount, setSuccessCount] = useState(null);

  const fetchLeads = async () => {
    try {
      const res = await axios.get(`${API}/leads`);
      setLeads(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  useEffect(() => { fetchLeads(); }, []);

  const handleChange = (index, field, value) => {
    setRows(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
    setError('');
    setSuccessCount(null);
  };

  const addRow = () => setRows(prev => [...prev, emptyRow()]);

  const removeRow = (index) => {
    if (rows.length === 1) return;
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const valid = rows.filter(r => r.email.trim());
    if (valid.length === 0) { setError('Add at least one lead with an email address.'); return; }

    setSubmitting(true);
    setError('');
    setSuccessCount(null);

    try {
      const payload = valid.map(r => ({
        name:    r.name.trim(),
        company: r.company.trim(),
        email:   r.email.trim(),
        notes:   r.notes.trim(),
        status:  'Pending',
      }));

      // Use bulk insert endpoint if exists, fallback to sequential
      await axios.post(`${API}/leads/bulk`, payload);

      setSuccessCount(payload.length);
      setRows(Array.from({ length: 5 }, emptyRow));
      await fetchLeads();
    } catch (err) {
      // Fallback: insert one-by-one if /bulk doesn't exist
      if (err.response?.status === 404) {
        try {
          const payload = valid.map(r => ({
            name:    r.name.trim(),
            company: r.company.trim(),
            email:   r.email.trim(),
            notes:   r.notes.trim(),
            status:  'Pending',
          }));
          await Promise.all(payload.map(lead => axios.post(`${API}/leads`, lead)));
          setSuccessCount(payload.length);
          setRows(Array.from({ length: 5 }, emptyRow));
          await fetchLeads();
        } catch (e2) {
          setError(e2.response?.data?.error || 'Failed to add leads. Check console.');
          console.error(e2);
        }
      } else {
        setError(err.response?.data?.error || 'Failed to add leads. Check console.');
        console.error(err);
      }
    }
    setSubmitting(false);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Leads</h1>
        <button
          onClick={() => { setShowForm(!showForm); setError(''); setSuccessCount(null); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
        >
          {showForm ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          {showForm ? 'Close' : 'Add Leads'}
        </button>
      </div>

      {/* Bulk Entry Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Bulk Lead Entry</h2>
              <p className="text-sm text-slate-500 mt-0.5">Fill in as many rows as you need. Rows without an email will be skipped.</p>
            </div>
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Row
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_1fr_1.2fr_1.6fr_auto] gap-2 mb-2 px-1">
              {['Name', 'Company', 'Email *', 'Overview / Notes', ''].map(h => (
                <span key={h} className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</span>
              ))}
            </div>

            {/* Rows */}
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {rows.map((row, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1.2fr_1.6fr_auto] gap-2 items-center">
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={row.name}
                    onChange={e => handleChange(i, 'name', e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder="Acme Corp"
                    value={row.company}
                    onChange={e => handleChange(i, 'company', e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <input
                    type="email"
                    placeholder="john@acme.com"
                    value={row.email}
                    onChange={e => handleChange(i, 'email', e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder="Paste overview, role, context…"
                    value={row.notes}
                    onChange={e => handleChange(i, 'notes', e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    disabled={rows.length === 1}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-4">
                {error && <p className="text-red-500 text-sm">{error}</p>}
                {successCount !== null && (
                  <p className="text-emerald-600 text-sm font-medium">✓ {successCount} lead{successCount !== 1 ? 's' : ''} added successfully!</p>
                )}
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4" />
                {submitting ? 'Saving...' : `Save ${rows.filter(r => r.email.trim()).length || ''} Leads`}
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
          <span className="text-sm text-slate-500 self-center">{leads.length} total</span>
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
              <tr><td colSpan="5" className="p-8 text-center text-slate-500">No leads yet. Click "Add Leads" to get started.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
