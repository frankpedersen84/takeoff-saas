import React, { useRef } from 'react';

export default function HomeView({ 
  agents, 
  uploadedFiles, 
  projectInfo, 
  onFileUpload, 
  onProjectInfoChange, 
  onProcess,
  onRemoveFile 
}) {
  const fileInputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onFileUpload(files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const projectFields = [
    { key: 'name', label: 'Project Name', placeholder: 'The Ivy Danville' },
    { key: 'customer', label: 'Customer', placeholder: 'CSI Construction' },
    { key: 'address', label: 'Address', placeholder: '123 Main Street' },
    { key: 'city', label: 'City, State', placeholder: 'Danville, CA' },
    { key: 'contact', label: 'Contact Name', placeholder: 'Luis Alvarez' },
    { key: 'dueDate', label: 'Bid Due Date', placeholder: 'MM/DD/YYYY' }
  ];

  return (
    <div className="pt-[70px] min-h-screen">
      {/* Hero Section */}
      <section className="py-20 px-10 text-center">
        <div className="animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gold/10 border border-gold/20 rounded-full mb-6">
            <span>🚀</span>
            <span className="text-sm text-gold font-medium">Powered by Claude AI</span>
          </div>
        </div>

        <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6 tracking-tight animate-fade-in-up">
          Transform Plans into
          <br />
          <span className="gradient-text-hero">Professional Proposals</span>
        </h1>

        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed animate-fade-in-up">
          Upload your project documents and let our AI agents analyze, design,
          and generate complete low-voltage system takeoffs in minutes.
        </p>

        {/* Upload Area */}
        <div className="max-w-3xl mx-auto animate-fade-in-up">
          <label
            className="block p-16 bg-gradient-to-br from-gold/5 to-teal/5 border-2 border-dashed border-gold/30 rounded-2xl cursor-pointer transition-all hover:border-gold/50 hover:bg-gold/10"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.xlsx,.xls,.doc,.docx,.txt"
              onChange={(e) => onFileUpload(e.target.files)}
              className="hidden"
            />
            <div className="text-5xl mb-4">📁</div>
            <p className="text-lg font-semibold mb-2">Drop your project files here</p>
            <p className="text-sm text-gray-500">
              PDF plans, specs, Excel scopes, RFPs • Multiple files supported
            </p>
          </label>

          {/* Uploaded Files */}
          {uploadedFiles.length > 0 && (
            <div className="mt-6 bg-bg-card rounded-2xl p-5 border border-gray-700">
              <h3 className="text-sm font-semibold text-gray-400 mb-4">
                Uploaded Files ({uploadedFiles.length})
              </h3>
              {uploadedFiles.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg mb-2 last:mb-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {file.name.endsWith('.pdf') ? '📄' : file.name.endsWith('.xlsx') ? '📊' : '📁'}
                    </span>
                    <span className="text-sm">{file.name}</span>
                    <span className="text-xs text-gray-500">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-emerald-400">✓ Ready</span>
                    <button
                      onClick={() => onRemoveFile(i)}
                      className="text-gray-500 hover:text-red-400 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Project Info */}
          {uploadedFiles.length > 0 && (
            <div className="mt-6 bg-bg-card rounded-2xl p-6 border border-gray-700">
              <h3 className="text-base font-semibold mb-5">Project Information</h3>
              <div className="grid grid-cols-2 gap-4">
                {projectFields.map(field => (
                  <div key={field.key}>
                    <label className="text-xs text-gray-500 mb-1.5 block">
                      {field.label}
                    </label>
                    <input
                      type="text"
                      placeholder={field.placeholder}
                      value={projectInfo[field.key]}
                      onChange={e => onProjectInfoChange(prev => ({ 
                        ...prev, 
                        [field.key]: e.target.value 
                      }))}
                      className="w-full px-4 py-3 bg-bg-secondary border border-gray-700 rounded-lg text-white text-sm focus:border-gold transition-colors"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Process Button */}
          {uploadedFiles.length > 0 && (
            <button
              onClick={onProcess}
              className="mt-8 px-12 py-4 gradient-gold rounded-xl text-black text-base font-bold shadow-glow-gold hover:opacity-90 transition-opacity"
            >
              🚀 Launch AI Analysis
            </button>
          )}
        </div>
      </section>

      {/* Agents Preview */}
      <section className="py-16 px-10 bg-bg-secondary">
        <h2 className="text-center text-3xl font-bold mb-12">Meet Your AI Agents</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 max-w-7xl mx-auto">
          {Object.values(agents).map(agent => (
            <div
              key={agent.id}
              className="bg-bg-card rounded-2xl p-6 border transition-all duration-300 hover:-translate-y-1 cursor-pointer"
              style={{ borderColor: `${agent.color}33` }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4"
                style={{ backgroundColor: `${agent.color}22` }}
              >
                {agent.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2">{agent.name}</h3>
              <p className="text-sm font-medium mb-2" style={{ color: agent.color }}>
                {agent.specialty}
              </p>
              <p className="text-sm text-gray-500 leading-relaxed">
                {agent.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
