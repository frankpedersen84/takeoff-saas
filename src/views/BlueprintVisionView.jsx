import React, { useState, useRef } from 'react';
import { api } from '../services/api';

export default function BlueprintVisionView() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [analysisType, setAnalysisType] = useState('full');
  const [systemFocus, setSystemFocus] = useState('all');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const analysisTypes = [
    { id: 'full', name: 'Full Takeoff', icon: '📋', description: 'Complete analysis with device counts, cable runs, and labor' },
    { id: 'count', name: 'Device Count', icon: '🔢', description: 'Count all devices by type and location' },
    { id: 'cable', name: 'Cable Estimation', icon: '🔌', description: 'Calculate cable runs and footage' },
    { id: 'pathway', name: 'Pathway Analysis', icon: '🛤️', description: 'Analyze routing, conduit, and infrastructure' },
  ];

  const systemOptions = [
    { id: 'all', name: 'All Systems' },
    { id: 'fire alarm', name: 'Fire Alarm' },
    { id: 'security/cctv', name: 'Security/CCTV' },
    { id: 'access control', name: 'Access Control' },
    { id: 'data/voice', name: 'Data/Voice' },
    { id: 'audio/visual', name: 'Audio/Visual' },
  ];

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(f =>
      f.type.startsWith('image/') || f.type === 'application/pdf'
    );

    setSelectedFiles(prev => [...prev, ...validFiles]);

    // Create previews for images
    validFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviews(prev => [...prev, { name: file.name, url: e.target.result }]);
        };
        reader.readAsDataURL(file);
      } else {
        setPreviews(prev => [...prev, { name: file.name, url: null, isPdf: true }]);
      }
    });
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one floor plan image');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      let result;

      if (selectedFiles.length === 1) {
        result = await api.analyzeFloorPlan(selectedFiles[0], analysisType, systemFocus);
      } else {
        result = await api.analyzeMultipleFloorPlans(selectedFiles);
      }

      setAnalysisResult(result);
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.message || 'Failed to analyze floor plan');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownload = () => {
    if (!analysisResult?.analysis) return;
    const blob = new Blob([analysisResult.analysis], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FloorPlan_Analysis_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="pt-[90px] px-10 pb-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <span className="text-4xl">📐</span>
            Blueprint Vision Agent
          </h1>
          <p className="text-gray-400">
            Upload floor plan images and let AI analyze devices, estimate cable runs, and generate takeoffs
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - Upload & Settings */}
          <div className="col-span-1 space-y-5">
            {/* Upload Area */}
            <div className="bg-level-2 rounded-2xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4">Upload Floor Plans</h3>

              <label className="block p-8 border-2 border-dashed border-indigo-500/30 rounded-xl cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="text-4xl mb-2">🖼️</div>
                <p className="text-sm font-medium">Drop images here or click to browse</p>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG, WebP supported</p>
              </label>

              {/* File List */}
              {selectedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {previews.map((preview, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 bg-level-1 rounded-lg">
                      {preview.url ? (
                        <img src={preview.url} alt="" className="w-12 h-12 object-cover rounded" />
                      ) : (
                        <div className="w-12 h-12 bg-level-2 rounded flex items-center justify-center text-xl">
                          📄
                        </div>
                      )}
                      <span className="flex-1 text-sm truncate">{preview.name}</span>
                      <button
                        onClick={() => removeFile(i)}
                        className="text-gray-500 hover:text-red-400"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Analysis Type */}
            <div className="bg-level-2 rounded-2xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4">Analysis Type</h3>
              <div className="space-y-2">
                {analysisTypes.map(type => (
                  <button
                    key={type.id}
                    onClick={() => setAnalysisType(type.id)}
                    className={`w-full p-3 rounded-lg text-left transition-all ${analysisType === type.id
                        ? 'bg-indigo-500/20 border border-indigo-500'
                        : 'bg-level-1 border border-transparent hover:border-gray-600'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{type.icon}</span>
                      <span className="font-medium text-sm">{type.name}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ml-6">{type.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* System Focus */}
            <div className="bg-level-2 rounded-2xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4">System Focus</h3>
              <select
                value={systemFocus}
                onChange={(e) => setSystemFocus(e.target.value)}
                className="w-full p-3 bg-level-1 border border-gray-700 rounded-lg text-white"
              >
                {systemOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.name}</option>
                ))}
              </select>
            </div>

            {/* Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || selectedFiles.length === 0}
              className="w-full py-4 gradient-gold rounded-xl text-black font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Analyzing...
                </>
              ) : (
                <>
                  <span>🔍</span>
                  Analyze Floor Plans
                </>
              )}
            </button>
          </div>

          {/* Right Column - Results */}
          <div className="col-span-2">
            <div className="bg-level-2 rounded-2xl border border-gray-700 h-full flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-gray-700">
                <h3 className="text-lg font-semibold">Analysis Results</h3>
                {analysisResult && (
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 bg-teal rounded-lg text-white text-sm font-medium hover:opacity-90"
                  >
                    ⬇️ Download
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-auto p-5">
                {error && (
                  <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 mb-4">
                    {error}
                  </div>
                )}

                {isAnalyzing && (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <div className="w-16 h-16 border-4 border-gray-700 border-t-indigo-500 rounded-full animate-spin mb-4" />
                    <p className="text-lg font-medium">Analyzing floor plans...</p>
                    <p className="text-sm">This may take 30-60 seconds</p>
                  </div>
                )}

                {!isAnalyzing && !analysisResult && !error && (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                    <div className="text-6xl mb-4">📐</div>
                    <p className="text-lg">Upload floor plans and click Analyze</p>
                    <p className="text-sm mt-2">The AI will count devices, estimate cable runs, and generate a complete takeoff</p>
                  </div>
                )}

                {analysisResult && (
                  <div className="space-y-4">
                    {/* Token Usage */}
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>Input tokens: {analysisResult.usage?.inputTokens?.toLocaleString()}</span>
                      <span>Output tokens: {analysisResult.usage?.outputTokens?.toLocaleString()}</span>
                    </div>

                    {/* Analysis Content */}
                    <pre className="whitespace-pre-wrap text-sm text-gray-300 leading-relaxed font-sans">
                      {analysisResult.analysis}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
