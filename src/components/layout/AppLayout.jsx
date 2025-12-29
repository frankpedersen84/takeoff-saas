import React from 'react';
import Header from '../Header';
import Sidebar from './Sidebar';

export default function AppLayout({
    children,
    currentView,
    onNavigate,
    isAdvancedMode,
    setIsAdvancedMode,
    onOpenApiSettings
}) {
    return (
        <div className="min-h-screen bg-base text-primary flex flex-col font-sans">
            {/* Fixed Header */}
            <Header
                currentView={currentView}
                onNavigate={onNavigate}
                isAdvancedMode={isAdvancedMode}
                setIsAdvancedMode={setIsAdvancedMode}
                onOpenApiSettings={onOpenApiSettings}
            />

            {/* Main Content Area with Sidebar */}
            <div className="flex flex-1 pt-[70px]">
                {/* Fixed Sidebar */}
                <Sidebar
                    currentView={currentView}
                    onNavigate={onNavigate}
                    isAdvancedMode={isAdvancedMode}
                />

                {/* Scrollable Page Content */}
                <main className={`flex-1 ml-64 min-h-[calc(100vh-70px)] transition-all duration-300 relative overflow-x-hidden`}>
                    {/* Content Wrapper */}
                    <div className="relative z-10 p-6">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
