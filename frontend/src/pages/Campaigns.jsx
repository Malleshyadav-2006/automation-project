import React from 'react'

export default function Campaigns() {
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Campaigns</h1>
        <button className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-sm">
          + Draft Campaign
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          {id: 1, name: 'Q3 Enterprise Outreach', status: 'Active', sent: 120, open: "35%"},
          {id: 2, name: 'SaaS Founders Q4', status: 'Draft', sent: 0, open: "0%"},
          {id: 3, name: 'E-commerce Reactivation', status: 'Paused', sent: 450, open: "42%"},
        ].map(camp => (
          <div key={camp.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-slate-800">{camp.name}</h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                  ${camp.status === 'Active' ? 'bg-green-100 text-green-800' : 
                    camp.status === 'Draft' ? 'bg-slate-100 text-slate-800' : 
                    'bg-yellow-100 text-yellow-800'}`}>
                  {camp.status}
                </span>
              </div>
              <p className="text-sm text-slate-500 mb-6">A targeted campaign fetching prospects from the recent CSV upload to convert free tier users.</p>
            </div>
            
            <div className="flex justify-between items-end border-t border-slate-100 pt-4">
               <div>
                 <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Sent</p>
                 <p className="text-xl font-bold text-slate-700 mt-1">{camp.sent}</p>
               </div>
               <div>
                 <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Open Rate</p>
                 <p className="text-xl font-bold text-slate-700 mt-1">{camp.open}</p>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
