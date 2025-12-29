import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import { api } from '../services/api';

const ChecklistPanel = ({ items, onToggle }) => (
    <div className="h-full overflow-y-auto pr-2">
        <h3 className="text-lg font-semibold mb-4 text-gray-200">Validation Checklist</h3>
        {items.map((item) => (
            <div
                key={item.id}
                onClick={() => onToggle(item.id)}
                className={`p-3 mb-2 rounded-lg border cursor-pointer transition-all ${item.checked
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                        : 'bg-level-2 border-gray-700 text-gray-300 hover:border-gold/30'
                    }`}
            >
                <div className="flex items-start gap-3">
                    <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${item.checked ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-gray-500'
                        }`}>
                        {item.checked && '✓'}
                    </div>
                    <div>
                        <div className={`text-sm font-medium ${item.checked ? 'line-through opacity-75' : ''}`}>
                            {item.text}
                        </div>
                        <div className="text-xs opacity-60 mt-1">{item.category}</div>
                    </div>
                </div>
            </div>
        ))}
    </div>
);

const AnalysisStream = ({ messages, isAnalyzing }) => (
    <div className="flex-1 overflow-y-auto space-y-4 p-4 min-h-0">
        {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-xl text-sm ${msg.role === 'user'
                        ? 'bg-level-2 border border-gray-600 text-gray-200'
                        : 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-200'
                    }`}>
                    {msg.content}

                    {msg.data && msg.data.equipment && msg.data.equipment.length > 0 && (
                        <div className="mt-2 space-y-2">
                            {msg.data.equipment.map((eq, idx) => (
                                <div key={idx} className="bg-black/20 rounded p-2 text-xs border border-white/5">
                                    <div className="text-gold font-mono">{eq.type.toUpperCase()}</div>
                                    <div>{eq.manufacturer} {eq.model}</div>
                                    {eq.confidence === 'high' && <span className="text-emerald-400">Low Confidence</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        ))}
        {isAnalyzing && (
            <div className="flex items-center gap-2 text-gold animate-pulse text-sm p-2">
                <span>⚡</span> Gemini is analyzing...
            </div>
        )}
    </div>
);

export default function PreJobWalkView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const webcamRef = useRef(null);

    const [project, setProject] = useState(null);
    const [checklist, setChecklist] = useState([
        // Mock checklist for now - in real app, this comes from document analysis
        { id: 1, text: "Verify Fire Alarm Panel Model", category: "Fire Alarm", checked: false },
        { id: 2, text: "Count existing cameras in Lobby", category: "Security", checked: false },
        { id: 3, text: "Check TR-2 rack space", category: "Data", checked: false },
        { id: 4, text: "Confirm ceiling type in Corridors", category: "General", checked: false },
    ]);

    const [messages, setMessages] = useState([
        { role: 'ai', content: "Ready for site walk. Point camera at equipment to identify it." }
    ]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [facingMode, setFacingMode] = useState('environment');

    // Load project context
    useEffect(() => {
        // Mock fetching project
        api.getProject(id).then(setProject).catch(console.error);
    }, [id]);

    const toggleChecklist = (itemId) => {
        setChecklist(prev => prev.map(item =>
            item.id === itemId ? { ...item, checked: !item.checked } : item
        ));
    };

    const processFrame = useCallback(async () => {
        if (!webcamRef.current || isAnalyzing) return;

        setIsAnalyzing(true);
        const imageSrc = webcamRef.current.getScreenshot();

        if (!imageSrc) {
            setIsAnalyzing(false);
            return;
        }

        try {
            // Add user placeholder (could be "Analyzing..." or a snapshot thumbnail)
            const newMessage = {
                role: 'user',
                content: "Analyzing scene...",
            };
            setMessages(prev => [...prev, newMessage]);

            // Call Gemini Flash
            const result = await api.analyzeLiveFrame(
                imageSrc,
                "Identify any low-voltage equipment (fire alarm, cameras, card readers, network gear). Estimate condition and model if possible.",
                `Project: ${project?.name || 'Unknown'}. We are doing a pre-job walk.`
            );

            if (result.success && result.data) {
                const aiResponse = {
                    role: 'ai',
                    content: result.data.observations?.[0] || "I see equipment.",
                    data: result.data
                };
                setMessages(prev => [...prev, aiResponse]);
            }

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'ai', content: "Error analyzing frame. Try again." }]);
        } finally {
            setIsAnalyzing(false);
        }
    }, [webcamRef, isAnalyzing, project]);

    return (
        <div className="pt-[70px] min-h-screen bg-base text-white flex flex-col md:flex-row h-screen overflow-hidden">

            {/* LEFT: Camera / Vision */}
            <div className="flex-1 flex flex-col relative bg-black">
                {/* Camera Feed */}
                <div className="flex-1 relative overflow-hidden">
                    <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        videoConstraints={{ facingMode }}
                        className="w-full h-full object-cover"
                    />

                    {/* Overlay UI */}
                    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
                        <div className="flex justify-between items-start">
                            <div className="bg-black/60 backdrop-blur px-3 py-1 rounded-full text-xs font-mono text-gold border border-gold/20">
                                LIVE VISION
                            </div>
                            <button
                                pointerEvents="auto"
                                onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                                className="pointer-events-auto bg-black/60 p-2 rounded-full text-white hover:bg-white/20 transition"
                            >
                                🔄
                            </button>
                        </div>

                        <div className="flex justify-center mb-8">
                            <button
                                onClick={processFrame}
                                disabled={isAnalyzing}
                                className="pointer-events-auto w-16 h-16 rounded-full border-4 border-white flex items-center justify-center bg-white/10 hover:bg-white/30 backdrop-blur transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
                            >
                                <div className="w-12 h-12 bg-white rounded-full"></div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT: Dashboard (Collapsible on mobile?) */}
            <div className="w-full md:w-96 bg-level-1 border-l border-gray-700 flex flex-col h-[40vh] md:h-full">
                <div className="p-4 border-b border-gray-700 bg-level-2">
                    <h2 className="font-bold flex items-center gap-2">
                        <span className="text-xl">👷</span>
                        Site Walk
                        <span className="ml-auto text-xs text-gray-500">{project?.name}</span>
                    </h2>
                </div>

                {/* Tabs or Split View */}
                <div className="flex flex-col h-full min-h-0">
                    {/* Analysis Stream (Chat) */}
                    <div className="flex-1 flex flex-col min-h-0 border-b border-gray-700">
                        <AnalysisStream messages={messages} isAnalyzing={isAnalyzing} />
                    </div>

                    {/* Checklist items */}
                    <div className="h-1/3 bg-level-1 p-4 overflow-hidden flex flex-col">
                        <ChecklistPanel items={checklist} onToggle={toggleChecklist} />
                    </div>
                </div>
            </div>
        </div>
    );
}
