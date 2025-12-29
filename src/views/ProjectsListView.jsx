import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

export default function ProjectsListView({ onNavigate, onToast }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [modalStep, setModalStep] = useState('upload'); // 'upload' | 'extracting' | 'review'
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [processedDocs, setProcessedDocs] = useState([]);
  const [extractedInfo, setExtractedInfo] = useState(null);
  const [newProject, setNewProject] = useState({
    name: '',
    customer: '',
    address: '',
    city: '',
    contact: '',
    dueDate: ''
  });
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await api.getProjects();
      setProjects(response.projects || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
      onToast?.('Failed to load projects', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setUploadedFiles(fileArray.map(f => ({ name: f.name, size: f.size, file: f })));
    setModalStep('extracting');

    try {
      // Upload and process documents
      const formData = new FormData();
      fileArray.forEach(f => formData.append('files', f));

      const uploadResponse = await api.uploadDocuments(formData);

      if (uploadResponse.processed === 0) {
        throw new Error('Could not process any documents');
      }

      setProcessedDocs(uploadResponse.documents);

      // Extract project info using AI
      const extractResponse = await api.extractProjectInfo(uploadResponse.documents);
      const info = extractResponse.extractedInfo;

      setExtractedInfo(info);

      // Pre-fill the form with extracted data
      setNewProject({
        name: info.projectName || '',
        customer: info.customer || '',
        address: info.address || '',
        city: info.city ? `${info.city}${info.state ? ', ' + info.state : ''}` : '',
        contact: info.contactName || '',
        dueDate: info.dueDate || ''
      });

      setModalStep('review');

      if (info.confidence === 'high') {
        onToast?.('Project info extracted successfully!', 'success');
      } else if (info.confidence === 'medium') {
        onToast?.('Some info extracted - please review', 'info');
      } else {
        onToast?.('Limited info found - please fill in details', 'warning');
      }

    } catch (error) {
      console.error('Failed to process documents:', error);
      onToast?.(error.message || 'Failed to process documents', 'error');
      setModalStep('review'); // Still allow manual entry
    }
  };

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) {
      onToast?.('Project name is required', 'warning');
      return;
    }

    setCreating(true);
    try {
      // Create the project
      const response = await api.createProject(newProject);
      const projectId = response.project.id;

      // If we have processed documents, add them to the project
      if (processedDocs.length > 0) {
        await api.updateProject(projectId, {
          documents: processedDocs,
          systems: extractedInfo?.systemsInScope || []
        });
      }

      setProjects(prev => [response.project, ...prev]);
      resetModal();
      onToast?.('Project created successfully', 'success');

      // Navigate to the new project
      onNavigate('project', { projectId });
    } catch (error) {
      console.error('Failed to create project:', error);
      onToast?.('Failed to create project', 'error');
    } finally {
      setCreating(false);
    }
  };

  const resetModal = () => {
    setShowNewProjectModal(false);
    setModalStep('upload');
    setUploadedFiles([]);
    setProcessedDocs([]);
    setExtractedInfo(null);
    setNewProject({ name: '', customer: '', address: '', city: '', contact: '', dueDate: '' });
  };

  const handleSkipUpload = () => {
    setModalStep('review');
  };

  const handleDeleteProject = async (projectId, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      await api.deleteProject(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      onToast?.('Project deleted', 'success');
    } catch (error) {
      console.error('Failed to delete project:', error);
      onToast?.('Failed to delete project', 'error');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'analyzing': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'ready': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'submitted': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'won': return 'bg-gold/20 text-gold border-gold/30';
      case 'lost': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="pt-[70px] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-[70px] min-h-screen">
      <div className="max-w-7xl mx-auto px-8 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Projects</h1>
            <p className="text-gray-400">Manage your takeoff projects and proposals</p>
          </div>
          <button
            onClick={() => setShowNewProjectModal(true)}
            className="px-6 py-3 gradient-gold rounded-xl text-black font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <span className="text-xl">+</span>
            New Project
          </button>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-6">📁</div>
            <h2 className="text-2xl font-semibold mb-3">No projects yet</h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              Create your first project to start analyzing documents and generating professional proposals.
            </p>
            <button
              onClick={() => setShowNewProjectModal(true)}
              className="px-8 py-4 gradient-gold rounded-xl text-black font-semibold hover:opacity-90 transition-opacity"
            >
              🚀 Create Your First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => (
              <div
                key={project.id}
                onClick={() => onNavigate('project', { projectId: project.id })}
                className="bg-level-2 rounded-2xl border border-gray-700 p-6 cursor-pointer transition-all hover:border-gold/50 hover:-translate-y-1 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold truncate group-hover:text-gold transition-colors">
                      {project.name}
                    </h3>
                    <p className="text-sm text-gray-400 truncate">{project.customer || 'No customer'}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-400 mb-4">
                  {project.city && (
                    <div className="flex items-center gap-2">
                      <span>📍</span>
                      <span className="truncate">{project.address ? `${project.address}, ` : ''}{project.city}</span>
                    </div>
                  )}
                  {project.dueDate && (
                    <div className="flex items-center gap-2">
                      <span>📅</span>
                      <span>Due: {formatDate(project.dueDate)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span>📄</span>
                    <span>{project.documents?.length || 0} documents</span>
                  </div>
                </div>

                {/* Systems badges */}
                {project.systems && project.systems.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {project.systems.slice(0, 4).map(system => (
                      <span key={system} className="px-2 py-0.5 bg-level-1 rounded text-xs text-gray-400">
                        {system}
                      </span>
                    ))}
                    {project.systems.length > 4 && (
                      <span className="px-2 py-0.5 bg-level-1 rounded text-xs text-gray-400">
                        +{project.systems.length - 4}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                  <span className="text-xs text-gray-500">
                    Updated {formatDate(project.updatedAt)}
                  </span>
                  <button
                    onClick={(e) => handleDeleteProject(project.id, e)}
                    className="p-2 text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-level-2 rounded-2xl border border-gray-700 w-full max-w-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">
                    {modalStep === 'upload' && '📁 Upload Project Documents'}
                    {modalStep === 'extracting' && '🤖 Analyzing Documents...'}
                    {modalStep === 'review' && '✏️ Review Project Details'}
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    {modalStep === 'upload' && 'Drop your RFP, specs, or plans - AI will extract project info'}
                    {modalStep === 'extracting' && 'AI is reading your documents and extracting information'}
                    {modalStep === 'review' && 'Review and edit the extracted information'}
                  </p>
                </div>
                {/* Step indicator */}
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${modalStep === 'upload' ? 'bg-gold' : 'bg-emerald-400'}`} />
                  <div className={`w-8 h-0.5 ${modalStep !== 'upload' ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                  <div className={`w-3 h-3 rounded-full ${modalStep === 'extracting' ? 'bg-gold animate-pulse' : modalStep === 'review' ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                  <div className={`w-8 h-0.5 ${modalStep === 'review' ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                  <div className={`w-3 h-3 rounded-full ${modalStep === 'review' ? 'bg-gold' : 'bg-gray-600'}`} />
                </div>
              </div>
            </div>

            {/* Step 1: Upload */}
            {modalStep === 'upload' && (
              <>
                <div className="p-8">
                  <label
                    className="block p-12 bg-level-1 border-2 border-dashed border-gray-600 rounded-2xl cursor-pointer hover:border-gold/50 transition-colors text-center"
                    onDrop={(e) => { e.preventDefault(); handleFileUpload(e.dataTransfer.files); }}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.xlsx,.xls,.doc,.docx,.txt"
                      onChange={(e) => handleFileUpload(e.target.files)}
                      className="hidden"
                    />
                    <div className="text-5xl mb-4">📄</div>
                    <p className="text-lg font-semibold mb-2">Drop your project files here</p>
                    <p className="text-sm text-gray-400 mb-4">
                      RFPs, Specifications, Bid Invitations, Plans
                    </p>
                    <p className="text-xs text-gray-500">
                      PDF, Excel, Word, Text • AI will auto-extract project details
                    </p>
                  </label>

                  <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                    <p className="text-sm text-blue-400">
                      💡 <strong>Pro tip:</strong> Upload your bid invitation or RFP first - AI will extract project name, customer, due date, and more automatically!
                    </p>
                  </div>
                </div>

                <div className="p-6 border-t border-gray-700 flex justify-between">
                  <button
                    onClick={resetModal}
                    className="px-5 py-2.5 bg-level-1 border border-gray-600 rounded-xl text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSkipUpload}
                    className="px-5 py-2.5 text-gray-400 hover:text-white transition-colors"
                  >
                    Skip, enter manually →
                  </button>
                </div>
              </>
            )}

            {/* Step 2: Extracting */}
            {modalStep === 'extracting' && (
              <div className="p-12 text-center">
                <div className="w-16 h-16 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-6" />
                <h3 className="text-lg font-semibold mb-2">AI is analyzing your documents</h3>
                <p className="text-gray-400 mb-6">Extracting project name, customer, due date, and more...</p>

                {uploadedFiles.length > 0 && (
                  <div className="bg-level-1 rounded-xl p-4 max-w-sm mx-auto">
                    {uploadedFiles.map((file, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm text-gray-400">
                        <span>📄</span>
                        <span className="truncate">{file.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Review */}
            {modalStep === 'review' && (
              <>
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                  {/* Extraction status */}
                  {extractedInfo && (
                    <div className={`p-4 rounded-xl border mb-4 ${extractedInfo.confidence === 'high'
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : extractedInfo.confidence === 'medium'
                          ? 'bg-yellow-500/10 border-yellow-500/30'
                          : 'bg-gray-500/10 border-gray-500/30'
                      }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span>{extractedInfo.confidence === 'high' ? '✅' : extractedInfo.confidence === 'medium' ? '⚠️' : 'ℹ️'}</span>
                        <span className="font-medium">
                          {extractedInfo.confidence === 'high' && 'High confidence extraction'}
                          {extractedInfo.confidence === 'medium' && 'Some fields extracted - please review'}
                          {extractedInfo.confidence === 'low' && 'Limited info found - please fill in details'}
                        </span>
                      </div>
                      {extractedInfo.notes && (
                        <p className="text-sm text-gray-400 ml-6">{extractedInfo.notes}</p>
                      )}
                    </div>
                  )}

                  {/* Uploaded files indicator */}
                  {processedDocs.length > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-level-1 rounded-lg mb-4">
                      <span className="text-emerald-400">✓</span>
                      <span className="text-sm text-gray-400">
                        {processedDocs.length} document{processedDocs.length > 1 ? 's' : ''} will be attached to this project
                      </span>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Project Name *</label>
                    <input
                      type="text"
                      value={newProject.name}
                      onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="The Ivy Apartments"
                      className="w-full px-4 py-3 bg-level-1 border border-gray-700 rounded-xl text-white focus:border-gold transition-colors"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Customer / General Contractor</label>
                    <input
                      type="text"
                      value={newProject.customer}
                      onChange={(e) => setNewProject(prev => ({ ...prev, customer: e.target.value }))}
                      placeholder="CSI Construction"
                      className="w-full px-4 py-3 bg-level-1 border border-gray-700 rounded-xl text-white focus:border-gold transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Address</label>
                      <input
                        type="text"
                        value={newProject.address}
                        onChange={(e) => setNewProject(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="123 Main St"
                        className="w-full px-4 py-3 bg-level-1 border border-gray-700 rounded-xl text-white focus:border-gold transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">City, State</label>
                      <input
                        type="text"
                        value={newProject.city}
                        onChange={(e) => setNewProject(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="Danville, CA"
                        className="w-full px-4 py-3 bg-level-1 border border-gray-700 rounded-xl text-white focus:border-gold transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Contact Name</label>
                      <input
                        type="text"
                        value={newProject.contact}
                        onChange={(e) => setNewProject(prev => ({ ...prev, contact: e.target.value }))}
                        placeholder="John Smith"
                        className="w-full px-4 py-3 bg-level-1 border border-gray-700 rounded-xl text-white focus:border-gold transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Bid Due Date</label>
                      <input
                        type="date"
                        value={newProject.dueDate}
                        onChange={(e) => setNewProject(prev => ({ ...prev, dueDate: e.target.value }))}
                        className="w-full px-4 py-3 bg-level-1 border border-gray-700 rounded-xl text-white focus:border-gold transition-colors"
                      />
                    </div>
                  </div>

                  {/* Detected systems */}
                  {extractedInfo?.systemsInScope?.length > 0 && (
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Detected Systems</label>
                      <div className="flex flex-wrap gap-2">
                        {extractedInfo.systemsInScope.map((system, i) => (
                          <span key={i} className="px-3 py-1.5 bg-gold/20 border border-gold/30 rounded-lg text-sm text-gold">
                            {system}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-gray-700 flex justify-between">
                  <button
                    onClick={resetModal}
                    className="px-5 py-2.5 bg-level-1 border border-gray-600 rounded-xl text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateProject}
                    disabled={creating || !newProject.name.trim()}
                    className="px-8 py-3 gradient-gold rounded-xl text-black font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
                  >
                    {creating ? '⏳ Creating...' : '🚀 Create Project'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
