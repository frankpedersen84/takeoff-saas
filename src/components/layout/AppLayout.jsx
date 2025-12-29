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
        <div className="min-h-screen bg-bg-primary text-white flex flex-col font-sans">
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
                <main className={`flex-1 ml-64 min-h-[calc(100vh-70px)] bg-bg-primary transition-all duration-300 relative overflow-x-hidden`}>
                    {/* Background Effects */}
                    <div className="fixed inset-0 pointer-events-none z-0">
                        <div className="absolute top-0 left-0 w-full h-full bg-pattern opacity-30" />
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold/5 blur-[120px] rounded-full pointer-events-none" />
                    </div>

                    {/* Content Wrapper */}
                    <div className="relative z-10 p-6">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
