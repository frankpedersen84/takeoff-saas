import React from 'react';

export default function Sidebar({ currentView, onNavigate, isAdvancedMode }) {
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: '⚡' },
        { id: 'projects', label: 'Projects', icon: '📁' },
        // Only show these in Advanced Mode
        ...(isAdvancedMode ? [
            { id: 'agents', label: 'AI Workforce', icon: '🤖' },
            { id: 'vision', label: 'Blueprint Vision', icon: '📐' },
            { id: 'chat', label: 'Chat', icon: '💬' },
        ] : []),
    ];

    const bottomItems = [
        { id: 'profile', label: 'Company Profile', icon: '🏢' },
        { id: 'settings', label: 'Settings', icon: '⚙️' },
    ];

    return (
        <aside className="fixed left-0 top-[70px] bottom-0 w-64 bg-level-2 border-r border-gold/10 flex flex-col z-40 transition-all duration-300">

            {/* Main Navigation */}
            <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
                <div className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Menu
                </div>
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${currentView === item.id
                            ? 'bg-gold/15 text-gold border border-gold/20'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <span className="text-lg">{item.icon}</span>
                        {item.label}
                    </button>
                ))}

                {/* Advanced Section Divider (Visual Cue) */}
                {isAdvancedMode && (
                    <div className="mt-6 pt-4 border-t border-gray-800">
                        <div className="px-3 mb-2 text-xs font-semibold text-teal uppercase tracking-wider">
                            Advanced Tools
                        </div>
                        {/* The advanced items are already in the map above, but we could separate them if we wanted distinct styling */}
                    </div>
                )}
            </div>

            {/* Bottom Navigation */}
            <div className="p-3 border-t border-gold/10 bg-level-1/30">
                {bottomItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${currentView === item.id
                            ? 'bg-gold/15 text-gold border border-gold/20'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <span className="text-lg">{item.icon}</span>
                        {item.label}
                    </button>
                ))}
            </div>
        </aside>
    );
}
