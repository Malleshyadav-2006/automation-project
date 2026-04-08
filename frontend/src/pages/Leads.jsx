import React, { useState, useEffect } from 'react'
import axios from 'axios'

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = async () => {
    try {
      const res = await axios.get('https://automation-project-1-ia1w.onrender.com/api/leads');
      setLeads(res.data);
    } catch(err) {
      console.error(err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if(!file) return;

    const formData = new FormData();
    formData.append('file', file);
    
    try {
      await axios.post('https://automation-project-1-ia1w.onrender.com/api/leads/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchLeads();
      alert("Upload complete!");
    } catch(err) {
      console.error(err);
      alert("Failed to upload CSV");
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Leads</h1>
        <div className="space-x-3 flex items-center">
          <label className="cursor-pointer px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-sm inline-block">
            Import Excel / CSV
            <input type="file" accept=".csv, .xlsx, .xls" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      </div>

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
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="text-sm">
             {loading ? <tr><td colSpan="5" className="p-4 text-center">Loading...</td></tr> : 
              leads.map(lead => (
               <tr key={lead.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                 <td className="p-4 font-medium text-slate-800">{lead.name || 'Unknown'}</td>
                 <td className="p-4 text-slate-600">{lead.company}</td>
                 <td className="p-4 text-slate-600">{lead.email}</td>
                 <td className="p-4">
                   <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                     lead.status === 'Sent' ? 'bg-blue-100 text-blue-800' :
                     lead.status === 'Replied' ? 'bg-green-100 text-green-800' :
                     lead.status === 'Bounced' ? 'bg-red-100 text-red-800' :
                     'bg-yellow-100 text-yellow-800'
                   }`}>
                     {lead.status}
                   </span>
                 </td>
               </tr>
             ))}
             {leads.length === 0 && !loading && (
                <tr><td colSpan="5" className="p-8 text-center text-slate-500">No leads found. Please import a CSV.</td></tr>
             )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
