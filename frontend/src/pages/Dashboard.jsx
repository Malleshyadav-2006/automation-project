import React, { useState, useEffect } from 'react'
import axios from 'axios'

export default function Dashboard() {
  const [stats, setStats] = useState({ totalLeads: 0, sent: 0, replied: 0, bounced: 0 });
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    // Fetch stats
    axios.get('https://automation-project-1-ia1w.onrender.com/api/stats')
      .then(res => setStats(res.data))
      .catch(err => console.error("Error fetching stats:", err));

    // Fetch engine state
    axios.get('https://automation-project-1-ia1w.onrender.com/api/settings')
      .then(res => setIsRunning(res.data.isRunning))
      .catch(console.error);
  }, []);

  const toggleEngine = async () => {
    try {
      const res = await axios.post('https://automation-project-1-ia1w.onrender.com/api/settings', { isRunning: !isRunning });
      setIsRunning(res.data.isRunning);
    } catch (e) {
      const errorMsg = e.response ? `Server Error: ${e.response.status}` : e.message;
      alert(`Failed to toggle engine. Check console for details.\nReason: ${errorMsg}`);
      console.error("Toggle engine failed:", e);
    }
  };

  const replyRate = stats.sent > 0 ? ((stats.replied / stats.sent) * 100).toFixed(1) : 0;
  const bounceRate = stats.sent > 0 ? ((stats.bounced / stats.sent) * 100).toFixed(1) : 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Dashboard</h1>
        <button 
          onClick={toggleEngine}
          className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95 ${
            isRunning 
              ? 'bg-emerald-500 shadow-emerald-500/30' 
              : 'bg-slate-700 shadow-slate-700/30'
          }`}
        >
          {isRunning ? (
            <><span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></span> ONLINE</>
          ) : (
            <><span className="w-2.5 h-2.5 bg-slate-400 rounded-full"></span> OFFLINE</>
          )}
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wider">Total Leads</h3>
          <p className="text-4xl font-bold text-slate-800 mt-2">{stats.totalLeads}</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wider">Emails Sent</h3>
          <p className="text-4xl font-bold text-slate-800 mt-2">{stats.sent}</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-green-100 rounded-bl-full -mr-8 -mt-8"></div>
          <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wider relative z-10">Replies</h3>
          <p className="text-4xl font-bold text-green-600 mt-2 relative z-10">{stats.replied}</p>
          <div className="mt-4 text-sm text-slate-500 relative z-10">
            {replyRate}% reply rate
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-red-100 rounded-bl-full -mr-8 -mt-8"></div>
          <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wider relative z-10">Bounces</h3>
          <p className="text-4xl font-bold text-red-500 mt-2 relative z-10">{stats.bounced}</p>
          <div className="mt-4 text-sm text-slate-500 relative z-10">
            {bounceRate}% bounce rate
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[400px]">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Email Activity</h3>
          {/* Chart placeholder */}
          <div className="flex h-64 items-end space-x-2 w-full mt-8">
            {[30, 45, 20, 60, 80, 50, 90, 40, 70, 85, 55, 65, 30, 50].map((h, i) => (
              <div key={i} className="flex-1 bg-primary-200 rounded-t-md relative hover:bg-primary-500 transition-colors group cursor-pointer" style={{ height: `${h}%` }}>
                <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  {h * 2}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
           <h3 className="text-lg font-bold text-slate-800 mb-4">Recent Activity</h3>
           <div className="space-y-4">
               <div className="flex items-start border-b border-slate-100 pb-4 last:border-0">
                  <div className="w-2 h-2 mt-2 rounded-full mr-4 bg-primary-500"></div>
                  <div>
                    <p className="text-slate-800 text-sm font-medium">System initialized</p>
                    <p className="text-slate-400 text-xs mt-1">Just now</p>
                  </div>
               </div>
           </div>
        </div>
      </div>
    </div>
  )
}
