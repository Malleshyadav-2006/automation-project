import React from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { Home, Users, Search, Play, Settings, Mail } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Leads from './pages/Leads'
import Campaigns from './pages/Campaigns'
import Senders from './pages/Senders'

function Sidebar() {
  const location = useLocation()
  
  const navItems = [
    { name: 'Dashboard', path: '/', icon: <Home className="w-5 h-5 mr-3" /> },
    { name: 'Leads', path: '/leads', icon: <Users className="w-5 h-5 mr-3" /> },
    { name: 'Campaigns', path: '/campaigns', icon: <Play className="w-5 h-5 mr-3" /> },
    { name: 'Senders', path: '/senders', icon: <Mail className="w-5 h-5 mr-3" /> },
  ]

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 h-screen text-slate-300 flex flex-col">
      <div className="p-6 font-bold text-2xl text-white tracking-tight flex items-center">
        <Search className="w-6 h-6 mr-2 text-primary-500" />
        Autopilot
      </div>
      <nav className="flex-1 mt-6 px-4 space-y-1">
        {navItems.map(item => {
          const isActive = location.pathname === item.path
          return (
            <Link 
              key={item.name} 
              to={item.path} 
              className={`flex items-center py-3 px-4 rounded-lg transition-colors ${isActive ? 'bg-primary-600 text-white shadow-md font-medium' : 'hover:bg-slate-800 hover:text-white'}`}
            >
              {item.icon}
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-slate-800">
        <button className="flex items-center py-2 px-4 w-full rounded-lg hover:bg-slate-800 transition-colors">
          <Settings className="w-5 h-5 mr-3" />
          Settings
        </button>
      </div>
    </aside>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-end px-8 shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold border border-primary-200">
                A
              </div>
            </div>
          </header>
          <div className="p-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/senders" element={<Senders />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  )
}
