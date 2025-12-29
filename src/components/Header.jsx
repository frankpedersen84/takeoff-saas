import React from 'react';

const navItems = [
  { id: 'projects', label: 'Projects', icon: '📁' },
  { id: 'agents', label: 'Agents', icon: '🤖' },
  { id: 'vision', label: 'Vision', icon: '📐' },
  { id: 'profile', label: 'Profile', icon: '🏢' }
];

export default function Header({ currentView, onNavigate, onOpenApiSettings }) {
  const isProjectView = currentView === 'project';
  
  return (
    <header className="fixed top-0 left-0 right-0 h-[70px] bg-bg-primary/95 backdrop-blur-xl border-b border-gold/20 flex items-center justify-between px-10 z-50">
      {/* Logo */}
      <div 
        className="flex items-center gap-4 cursor-pointer"
        onClick={() => onNavigate('projects')}
      >
        <div className="w-[45px] h-[45px] gradient-gold rounded-xl flex items-center justify-center text-2xl shadow-glow-gold">
          ⚡
        </div>
        <div>
          <h1 className="text-[22px] font-extrabold gradient-text-gold tracking-tight">
            TakeoffAI
          </h1>
          <p className="text-[11px] text-gray-500 tracking-[2px] uppercase">
            3D Technology Services
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex gap-2">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
              currentView === item.id || (item.id === 'projects' && isProjectView)
                ? 'bg-gold/15 border border-gold/30 text-gold'
                : 'border border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* API Status */}
      <button
        onClick={onOpenApiSettings}
        className="px-5 py-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-lg text-emerald-400 text-[13px] font-medium flex items-center gap-2 hover:bg-emerald-500/25 transition-all"
      >
        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
        API Connected
      </button>
    </header>
  );
}
