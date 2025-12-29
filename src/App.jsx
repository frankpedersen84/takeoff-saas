import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import HomeView from './views/HomeView';
import ProcessingView from './views/ProcessingView';
import DashboardView from './views/DashboardView';
import AgentsView from './views/AgentsView';
import ChatView from './views/ChatView';
import SettingsView from './views/SettingsView';
import BlueprintVisionView from './views/BlueprintVisionView';
import ProfileView from './views/ProfileView';
import ProjectsListView from './views/ProjectsListView';
import ProjectView from './views/ProjectView';
import ApiKeyModal from './components/ApiKeyModal';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider, useToast } from './components/Toast';
import { api } from './services/api';
import AppLayout from './components/layout/AppLayout';

function AppContent() {
  const [currentView, setCurrentView] = useState('projects');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [processedDocuments, setProcessedDocuments] = useState([]);
  const [projectData, setProjectData] = useState(null);
  const [activeAgents, setActiveAgents] = useState([]);
  const [agentOutputs, setAgentOutputs] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [agents, setAgents] = useState({});
  const [companyProfile, setCompanyProfile] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [projectInfo, setProjectInfo] = useState({
    name: '',
    address: '',
    city: '',
    customer: '',
    contact: '',
    dueDate: ''
  });

  const { showToast } = useToast();

  // Load agents and profile on mount
  useEffect(() => {
    loadAgents();
    loadProfile();
  }, []);

  const loadAgents = async () => {
    try {
      const response = await api.getAgents();
      console.log('DEBUG: loadAgents response', response);
      if (response && response.agents) {
        const agentMap = {};
        response.agents.forEach(agent => {
          agentMap[agent.id] = agent;
        });
        setAgents(agentMap);
      } else {
        console.warn('API returned unexpected agents structure:', response);
        // Fallback to empty or default if needed, for now just don't crash
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
      // Don't show toast on mount as it might be annoying if offline
      // showToast('Failed to load agents', 'error');
    }
  };

  const loadProfile = async () => {
    try {
      const response = await api.getProfile();
      setCompanyProfile(response.profile);
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  // File upload handler
  const handleFileUpload = (files) => {
    const newFiles = Array.from(files).map(f => ({
      name: f.name,
      size: f.size,
      type: f.type,
      file: f,
      status: 'uploaded'
    }));
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  // Process documents with AI
  const processDocuments = async () => {
    if (uploadedFiles.length === 0) {
      showToast('Please upload at least one file', 'warning');
      return;
    }

    setIsProcessing(true);
    setCurrentView('processing');

    try {
      // Step 1: Upload and extract text from documents
      setProcessingStep('Uploading and extracting document contents...');

      const formData = new FormData();
      uploadedFiles.forEach(f => formData.append('files', f.file));

      const uploadResponse = await api.uploadDocuments(formData);

      if (uploadResponse.processed === 0) {
        throw new Error('No documents could be processed');
      }

      setProcessedDocuments(uploadResponse.documents);
      showToast(`Processed ${uploadResponse.processed} documents`, 'success');

      // Step 2: Analyze with orchestrator
      setProcessingStep('AI analyzing project scope...');

      const analysisResponse = await api.analyzeProject({
        projectInfo,
        documentContents: uploadResponse.documents
      });

      setProjectData({
        ...projectInfo,
        analysis: analysisResponse.analysis
      });

      // Step 3: Determine active systems (parse from analysis or use defaults)
      setProcessingStep('Identifying required systems...');
      await new Promise(r => setTimeout(r, 1000));

      // For now, activate common systems - in production, parse from analysis
      const detectedSystems = ['fireAlarm', 'dataCabling', 'cctv', 'accessControl'];
      setActiveAgents(detectedSystems);

      // Mark agents as complete
      const outputs = {};
      detectedSystems.forEach(agentId => {
        outputs[agentId] = {
          status: 'complete',
          summary: `Analysis complete for ${agents[agentId]?.specialty || agentId}`,
          timestamp: new Date().toISOString()
        };
      });
      setAgentOutputs(outputs);

      setProcessingStep('Analysis complete!');
      await new Promise(r => setTimeout(r, 500));

      setIsProcessing(false);
      setCurrentView('dashboard');
      showToast('Project analysis complete', 'success');

    } catch (error) {
      console.error('Processing error:', error);
      setIsProcessing(false);
      showToast(error.message || 'Failed to process documents', 'error');
      setCurrentView('home');
    }
  };

  // Send message to agent
  const sendMessage = async (message) => {
    if (!message.trim() || !selectedAgent) return;

    // Add user message to history
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    setChatHistory(prev => [...prev, userMessage]);

    setIsProcessing(true);

    try {
      const response = await api.chatWithAgent({
        agentId: selectedAgent,
        message,
        conversationHistory: chatHistory
      });

      const assistantMessage = {
        role: 'assistant',
        content: response.message,
        agent: selectedAgent,
        timestamp: new Date().toISOString()
      };
      setChatHistory(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Chat error:', error);
      showToast(error.message || 'Failed to send message', 'error');

      // Add error message to chat
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error.message || 'Failed to communicate with agent'}`,
        agent: selectedAgent,
        isError: true,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Navigation handler
  const navigateTo = (view, options = {}) => {
    if (options.agent) {
      setSelectedAgent(options.agent);
      // Initialize chat with project context if we have processed documents
      if (processedDocuments.length > 0 || projectData?.analysis) {
        const contextMessage = buildProjectContext(options.agent);
        setChatHistory([{
          role: 'user',
          content: contextMessage,
          isContext: true,
          timestamp: new Date().toISOString()
        }]);
      } else {
        setChatHistory([]);
      }
    }
    if (options.projectId) {
      setSelectedProjectId(options.projectId);
    }
    setCurrentView(view);
  };

  // Build project context message for agents
  const buildProjectContext = (agentId) => {
    const agent = agents[agentId];
    let context = `I'm working on a project and need your expertise as the ${agent?.name || 'specialist'}.\n\n`;

    context += `**PROJECT INFORMATION:**\n`;
    context += `- Project Name: ${projectInfo.name || 'Not specified'}\n`;
    context += `- Customer: ${projectInfo.customer || 'Not specified'}\n`;
    context += `- Location: ${projectInfo.address || ''} ${projectInfo.city || ''}\n`;
    context += `- Due Date: ${projectInfo.dueDate || 'Not specified'}\n\n`;

    if (processedDocuments.length > 0) {
      context += `**UPLOADED DOCUMENTS:**\n`;
      processedDocuments.forEach((doc, i) => {
        context += `\n--- Document ${i + 1}: ${doc.filename} ---\n`;
        // Include first 3000 chars of each document to stay within limits
        context += doc.content?.substring(0, 3000) || '[No content extracted]';
        if (doc.content?.length > 3000) {
          context += '\n[... content truncated ...]';
        }
        context += '\n';
      });
    }

    if (projectData?.analysis) {
      context += `\n**ORCHESTRATOR ANALYSIS:**\n${projectData.analysis.substring(0, 2000)}\n`;
    }

    context += `\nPlease analyze this information and provide your expert assessment for the ${agent?.specialty || 'system'} scope. Include device counts, material recommendations, and labor estimates where applicable.`;

    return context;
  };

  // Render current view
  const renderView = () => {
    switch (currentView) {
      case 'home':
        return (
          <HomeView
            agents={agents}
            uploadedFiles={uploadedFiles}
            projectInfo={projectInfo}
            onFileUpload={handleFileUpload}
            onProjectInfoChange={setProjectInfo}
            onProcess={processDocuments}
            onRemoveFile={(index) => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
          />
        );
      case 'processing':
        return (
          <ProcessingView
            processingStep={processingStep}
            activeAgents={activeAgents}
            agentOutputs={agentOutputs}
            agents={agents}
          />
        );
      case 'dashboard':
        return (
          <DashboardView
            projectInfo={projectInfo}
            projectData={projectData}
            activeAgents={activeAgents}
            agentOutputs={agentOutputs}
            agents={agents}
            onNavigate={navigateTo}
          />
        );
      case 'agents':
        return (
          <AgentsView
            agents={agents}
            onSelectAgent={(agentId) => navigateTo('chat', { agent: agentId })}
          />
        );
      case 'chat':
        return (
          <ChatView
            agent={agents[selectedAgent]}
            chatHistory={chatHistory}
            isProcessing={isProcessing}
            onSendMessage={sendMessage}
            onBack={() => setCurrentView('agents')}
          />
        );
      case 'settings':
        return <SettingsView />;
      case 'vision':
        return <BlueprintVisionView />;
      case 'profile':
        return (
          <ProfileView
            onToast={showToast}
          />
        );
      case 'projects':
        return (
          <ProjectsListView
            onNavigate={navigateTo}
            onToast={showToast}
          />
        );
      case 'project':
        return (
          <ProjectView
            projectId={selectedProjectId}
            companyProfile={companyProfile}
            onNavigate={navigateTo}
            onToast={showToast}
          />
        );
      default:
        return (
          <ProjectsListView
            onNavigate={navigateTo}
            onToast={showToast}
          />
        );
    }
  };

  // ... inside AppContent ...
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);

  // ... existing code ...

  return (
    <AppLayout
      currentView={currentView}
      onNavigate={navigateTo}
      isAdvancedMode={isAdvancedMode}
      setIsAdvancedMode={setIsAdvancedMode}
      onOpenApiSettings={() => setShowApiKeyModal(true)}
    >
      {/* If the current view expects isAdvancedMode, pass it down effectively by cloning or just props if we could, 
          but since we have a renderView switch, we pass it there. */}
      {(() => {
        // We need to pass isAdvancedMode to DashboardView
        if (currentView === 'dashboard') {
          return (
            <DashboardView
              projectInfo={projectInfo}
              projectData={projectData}
              activeAgents={activeAgents}
              agentOutputs={agentOutputs}
              agents={agents}
              onNavigate={navigateTo}
              isAdvancedMode={isAdvancedMode}
              onExampleLoad={() => {
                // Quick helper for the simple mode wizard to load example data
                setProjectInfo({ name: 'Example Office Tower', city: 'Austin, TX', customer: 'Nexus Corp' });
              }}
            />
          );
        }
        return renderView();
      })()}

      {showApiKeyModal && (
        <ApiKeyModal onClose={() => setShowApiKeyModal(false)} />
      )}
    </AppLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
