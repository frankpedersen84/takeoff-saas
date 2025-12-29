import React from 'react';

export default function ApiKeyModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[2000]">
      <div className="bg-bg-card rounded-2xl p-8 w-full max-w-lg border border-gray-700">
        <h2 className="text-2xl font-bold mb-2">🔑 API Configuration</h2>
        <p className="text-gray-400 text-sm mb-6">
          The API key is now configured on the server. No client-side configuration needed.
        </p>
        
        <div className="bg-bg-secondary rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-gold mb-2">Server Configuration</h3>
          <p className="text-gray-400 text-sm mb-3">
            Set your Anthropic API key in the server's <code className="bg-bg-tertiary px-2 py-1 rounded">.env</code> file:
          </p>
          <code className="block bg-bg-tertiary p-3 rounded text-sm font-mono text-teal">
            ANTHROPIC_API_KEY=sk-ant-api03-...
          </code>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-emerald-400 font-medium mb-1">
            <span>✓</span> Secure Configuration
          </div>
          <p className="text-gray-400 text-sm">
            Your API key is stored securely on the server and never exposed to the browser.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 gradient-gold rounded-lg text-black font-semibold hover:opacity-90 transition-opacity"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
