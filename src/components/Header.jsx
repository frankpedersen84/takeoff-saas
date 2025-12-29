import React from 'react';

const navItems = [
  { id: 'projects', label: 'Projects', icon: '📁' },
  { id: 'agents', label: 'Agents', icon: '🤖' },
  { id: 'vision', label: 'Vision', icon: '📐' },
  { id: 'profile', label: 'Profile', icon: '🏢' }
];



export default function Header({
  currentView,
  onNavigate,
  onOpenApiSettings,
  isAdvancedMode,
  setIsAdvancedMode
}) {
  return (
    <header className="fixed top-0 left-0 right-0 h-[70px] bg-bg-primary/95 backdrop-blur-xl border-b border-gold/20 flex items-center justify-between px-6 z-50">
      {/* Logo Area */}
      <div
        className="flex items-center gap-3 cursor-pointer w-60" // Matches sidebar width approx
        onClick={() => onNavigate('dashboard')}
      >
        <div className="w-10 h-10 gradient-gold rounded-lg flex items-center justify-center text-xl shadow-glow-gold">
          ⚡
        </div>
        <div>
          <h1 className="text-xl font-extrabold gradient-text-gold tracking-tight">
            TakeOff Pro
          </h1>
          <p className="text-[10px] text-gray-400 tracking-wider uppercase">
            AI Estimation
          </p>
        </div>
      </div>

      {/* Center - Global Search (Optional place holder for now) */}
      <div className="flex-1 max-w-xl px-8 hidden md:block">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500">🔍</span>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-700 rounded-lg leading-5 bg-bg-secondary text-gray-300 placeholder-gray-500 focus:outline-none focus:bg-bg-tertiary focus:border-gold/50 transition duration-150 ease-in-out sm:text-sm"
            placeholder="Search projects, items, or ask AI..."
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">

        {/* Simple / Advanced Toggle */}
        <div className="flex items-center gap-3 bg-bg-secondary/50 px-3 py-1.5 rounded-full border border-gray-700/50">
          <span className={`text-xs font-semibold ${!isAdvancedMode ? 'text-teal' : 'text-gray-500'}`}>
            SIMPLE
          </span>
          <button
            onClick={() => setIsAdvancedMode(!isAdvancedMode)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isAdvancedMode ? 'bg-gold' : 'bg-gray-700'
              }`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isAdvancedMode ? 'translate-x-5' : 'translate-x-0'
                }`}
            />
          </button>
          <span className={`text-xs font-semibold ${isAdvancedMode ? 'text-gold' : 'text-gray-500'}`}>
            ADVANCED
          </span>
        </div>

        {/* API Status Indicator */}
        <button
          onClick={onOpenApiSettings}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all cursor-pointer"
          title="API Connection Status"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
        </button>

        {/* User Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 border border-gray-600 flex items-center justify-center cursor-pointer hover:border-gold/50 transition-colors">
          <span className="text-sm font-bold text-gray-300">AD</span>
        </div>
      </div>
    </header>
  );
}
