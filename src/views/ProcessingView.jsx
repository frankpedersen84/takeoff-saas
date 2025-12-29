import React from 'react';

export default function ProcessingView({ processingStep, activeAgents, agentOutputs, agents }) {
  return (
    <div className="pt-[70px] min-h-screen flex items-center justify-center">
      <div className="text-center max-w-2xl px-8">
        {/* Spinner */}
        <div className="w-32 h-32 mx-auto mb-8 relative">
          <div className="absolute inset-0 border-[3px] border-gray-700 border-t-gold rounded-full animate-spin" />
          <div 
            className="absolute inset-4 border-[3px] border-gray-700 border-t-teal rounded-full animate-spin"
            style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-4xl">
            ⚡
          </div>
        </div>

        <h2 className="text-3xl font-bold mb-4">AI Agents Working</h2>
        <p className="text-lg text-gold font-mono mb-8">{processingStep}</p>

        {/* Active Agents */}
        <div className="flex flex-wrap gap-3 justify-center">
          {activeAgents.map(agentId => {
            const agent = agents[agentId];
            const output = agentOutputs[agentId];
            if (!agent) return null;
            
            return (
              <div
                key={agentId}
                className={`px-5 py-3 rounded-full flex items-center gap-2 border ${
                  output?.status === 'complete'
                    ? 'bg-emerald-500/15 border-emerald-500'
                    : 'bg-gold/15 border-gold'
                }`}
              >
                <span>{agent.icon}</span>
                <span className="text-sm font-medium">{agent.name}</span>
                {output?.status === 'complete' && <span className="text-emerald-400">✓</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
