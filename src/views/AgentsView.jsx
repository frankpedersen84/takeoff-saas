import React from 'react';

export default function AgentsView({ agents, onSelectAgent }) {
  return (
    <div className="pt-[90px] px-10 pb-10">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">AI Agent Hub</h1>
        <p className="text-gray-500 mb-8">
          Select an agent to start a conversation or view their capabilities
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Object.values(agents).map(agent => (
            <div
              key={agent.id}
              onClick={() => onSelectAgent(agent.id)}
              className="bg-level-2 rounded-2xl p-7 border cursor-pointer transition-all duration-300 hover:-translate-y-1"
              style={{ borderColor: `${agent.color}33` }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = agent.color;
                e.currentTarget.style.boxShadow = `0 10px 40px ${agent.color}22`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = `${agent.color}33`;
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div className="flex items-start gap-4 mb-4">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
                  style={{ backgroundColor: `${agent.color}22` }}
                >
                  {agent.icon}
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-1">{agent.name}</h3>
                  <p className="text-sm font-medium" style={{ color: agent.color }}>
                    {agent.specialty}
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-400 leading-relaxed mb-4">
                {agent.description}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                <span className="text-sm text-gray-500 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full" />
                  Ready
                </span>
                <span className="text-sm font-medium" style={{ color: agent.color }}>
                  Start Chat →
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
