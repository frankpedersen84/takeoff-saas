import React, { useState, useRef, useEffect } from 'react';

export default function ChatView({ agent, chatHistory, isProcessing, onSendMessage, onBack }) {
  const [input, setInput] = useState('');
  const [contextSent, setContextSent] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Auto-send context message when chat opens with project data
  useEffect(() => {
    if (chatHistory.length === 1 && chatHistory[0].isContext && !contextSent) {
      setContextSent(true);
      // Automatically send the context to get agent's analysis
      onSendMessage(chatHistory[0].content);
    }
  }, [chatHistory, contextSent, onSendMessage]);

  // Reset contextSent when agent changes
  useEffect(() => {
    setContextSent(false);
  }, [agent?.id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isProcessing) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  if (!agent) return null;

  // Check if we have project context loaded
  const hasProjectContext = chatHistory.some(msg => msg.isContext);

  return (
    <div className="pt-[70px] h-screen flex flex-col">
      {/* Chat Header */}
      <div className="px-10 py-5 bg-bg-secondary border-b border-gray-700 flex items-center gap-4">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-bg-tertiary border border-gray-700 rounded-lg text-gray-400 text-sm hover:text-white transition-colors"
        >
          ← Back
        </button>
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
          style={{ backgroundColor: `${agent.color}22` }}
        >
          {agent.icon}
        </div>
        <div>
          <h2 className="text-lg font-semibold">{agent.name}</h2>
          <p className="text-sm" style={{ color: agent.color }}>{agent.specialty}</p>
        </div>
        {hasProjectContext && (
          <div className="ml-auto px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 rounded-full text-xs text-emerald-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
            Project Context Loaded
          </div>
        )}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-auto px-10 py-6">
        {chatHistory.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <div className="text-5xl mb-4">{agent.icon}</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Start a conversation with {agent.name}
            </h3>
            <p className="text-sm max-w-md mx-auto">
              Ask about system design, material selections, labor estimates, code requirements,
              or anything related to {agent.specialty.toLowerCase()}.
            </p>
          </div>
        )}

        {chatHistory.map((msg, i) => {
          // Show context messages as a collapsed summary
          if (msg.isContext) {
            return (
              <div key={i} className="flex justify-center mb-6">
                <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 text-xs flex items-center gap-2">
                  <span>📄</span>
                  <span>Project documents and context sent to agent</span>
                </div>
              </div>
            );
          }

          return (
            <div
              key={i}
              className={`flex mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-5 py-4 rounded-2xl ${
                  msg.role === 'user'
                    ? 'gradient-gold text-black rounded-br-sm'
                    : msg.isError
                    ? 'bg-red-500/20 border border-red-500/50 text-red-300 rounded-bl-sm'
                    : 'bg-bg-card border border-gray-700 text-white rounded-bl-sm'
                }`}
              >
                <div className="text-sm leading-relaxed whitespace-pre-wrap markdown-content">
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}

        {isProcessing && (
          <div className="flex items-center gap-3 px-5 py-4 bg-bg-card border border-gray-700 rounded-2xl w-fit">
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: agent.color }}
            />
            <span className="text-gray-400 text-sm">
              {agent.name} is thinking...
            </span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Chat Input */}
      <form onSubmit={handleSubmit} className="px-10 py-5 bg-bg-secondary border-t border-gray-700">
        <div className="flex gap-3 max-w-5xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask ${agent.name} anything...`}
            disabled={isProcessing}
            className="flex-1 px-5 py-4 bg-bg-tertiary border border-gray-700 rounded-xl text-white text-[15px] placeholder-gray-500 focus:border-gold transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isProcessing || !input.trim()}
            className="px-8 py-4 gradient-gold rounded-xl text-black text-[15px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
