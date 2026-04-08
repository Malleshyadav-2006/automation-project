import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Mail, Plus, Trash2, ShieldCheck, MailWarning } from 'lucide-react';
import { API_BASE } from '../config';

function Senders() {
  const [senders, setSenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    app_password: '',
    sender_name: '',
    sender_role: ''
  });

  const fetchSenders = async () => {
    try {
      const res = await axios.get(`${API_BASE}/senders`);
      setSenders(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSenders();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddSender = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/senders`, formData);
      setFormData({ email: '', app_password: '', sender_name: '', sender_role: '' });
      fetchSenders();
    } catch (err) {
      alert('Error adding sender. Check console.');
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this sender account?')) return;
    try {
      await axios.delete(`${API_BASE}/senders/${id}`);
      fetchSenders();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-100">Sender Fleet</h1>
        <p className="text-slate-400 mt-2 text-lg">Manage the Gmail accounts used for your cold outreach automation.</p>
      </header>

      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-slate-100 mb-6 flex items-center gap-2">
          <Plus className="w-5 h-5 text-indigo-400" />
          Add New Sender Account
        </h2>
        <form onSubmit={handleAddSender} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Gmail Address</label>
            <input required type="email" name="email" value={formData.email} onChange={handleChange} placeholder="hello@gmail.com" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Google App Password (16-chars)</label>
            <input required type="text" name="app_password" value={formData.app_password} onChange={handleChange} placeholder="abcd efgh ijkl mnop" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Sender Name (from)</label>
            <input required type="text" name="sender_name" value={formData.sender_name} onChange={handleChange} placeholder="John Doe" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Sender Role (for AI context)</label>
            <input required type="text" name="sender_role" value={formData.sender_role} onChange={handleChange} placeholder="Founder / Sales Engineer" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors">
              Add Sender
            </button>
          </div>
        </form>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-700/50 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
             <Mail className="w-5 h-5 text-indigo-400" />
             Active Senders
          </h2>
          <span className="bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-sm font-medium border border-indigo-500/20">
             {senders.length} active
          </span>
        </div>
        
        {loading ? (
           <div className="p-8 text-center text-slate-400">Loading fleet...</div>
        ) : senders.length === 0 ? (
           <div className="p-16 text-center">
              <MailWarning className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400 mb-2 font-medium">No sender accounts configured.</p>
              <p className="text-sm text-slate-500">Add a Gmail account above to start your automation engine.</p>
           </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-900/50 text-slate-400 text-sm">
                <tr>
                  <th className="px-6 py-4 font-medium">Sender</th>
                  <th className="px-6 py-4 font-medium">Role</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Last Sent</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {senders.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-200">{s.sender_name}</div>
                      <div className="text-sm text-slate-500">{s.email}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-300">{s.sender_role}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <ShieldCheck className="w-3 h-3" />
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {s.last_used_at ? new Date(s.last_used_at).toLocaleTimeString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleDelete(s.id)} className="text-slate-500 hover:text-red-400 transition-colors p-2">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

export default Senders;
