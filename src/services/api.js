// In production (Cloudflare), this will be the Render backend URL.
// In development, it falls back to the Vite proxy ('/api').
const API_BASE = import.meta.env.VITE_API_URL || '/api';

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      data.error || `Request failed with status ${response.status}`,
      response.status,
      data
    );
  }

  return data;
}

export const api = {
  // Health check
  async healthCheck() {
    const response = await fetch(`${API_BASE}/health`);
    return handleResponse(response);
  },

  // Get available agents
  async getAgents() {
    const response = await fetch(`${API_BASE}/ai/agents`);
    return handleResponse(response);
  },

  // Chat with an agent
  async chatWithAgent({ agentId, message, conversationHistory = [] }) {
    const response = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, message, conversationHistory })
    });
    return handleResponse(response);
  },

  // Analyze project documents
  async analyzeProject({ projectInfo, documentContents }) {
    const response = await fetch(`${API_BASE}/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectInfo, documentContents })
    });
    return handleResponse(response);
  },

  // Upload documents
  async uploadDocuments(formData) {
    const response = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      body: formData
    });
    return handleResponse(response);
  },

  // Project CRUD
  async createProject(projectData) {
    const response = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectData)
    });
    return handleResponse(response);
  },

  async getProjects() {
    const response = await fetch(`${API_BASE}/projects`);
    return handleResponse(response);
  },

  async getProject(id) {
    const response = await fetch(`${API_BASE}/projects/${id}`);
    return handleResponse(response);
  },

  async updateProject(id, data) {
    const response = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  async deleteProject(id) {
    const response = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'DELETE'
    });
    return handleResponse(response);
  },

  async saveEstimate(projectId, systemId, estimate) {
    const response = await fetch(`${API_BASE}/projects/${projectId}/estimates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemId, estimate })
    });
    return handleResponse(response);
  },

  // Vision API - Floor Plan Analysis
  async analyzeFloorPlan(imageFile, analysisType = 'full', systemFocus = 'all') {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('analysisType', analysisType);
    formData.append('systemFocus', systemFocus);

    const response = await fetch(`${API_BASE}/vision/analyze-floorplan`, {
      method: 'POST',
      body: formData
    });
    return handleResponse(response);
  },

  async analyzeMultipleFloorPlans(imageFiles) {
    const formData = new FormData();
    imageFiles.forEach(file => formData.append('images', file));

    const response = await fetch(`${API_BASE}/vision/analyze-multiple`, {
      method: 'POST',
      body: formData
    });
    return handleResponse(response);
  },

  // Profile/Company Settings
  async getProfile() {
    const response = await fetch(`${API_BASE}/profile`);
    return handleResponse(response);
  },

  async updateProfile(profileData) {
    const response = await fetch(`${API_BASE}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData)
    });
    return handleResponse(response);
  },

  async uploadLogo(file) {
    const formData = new FormData();
    formData.append('logo', file);
    const response = await fetch(`${API_BASE}/profile/logo`, {
      method: 'POST',
      body: formData
    });
    return handleResponse(response);
  },

  async deleteLogo() {
    const response = await fetch(`${API_BASE}/profile/logo`, {
      method: 'DELETE'
    });
    return handleResponse(response);
  },

  async getApiKeyStatus() {
    const response = await fetch(`${API_BASE}/profile/api-key-status`);
    return handleResponse(response);
  },

  async setApiKey(apiKey) {
    const response = await fetch(`${API_BASE}/profile/api-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey })
    });
    return handleResponse(response);
  },

  async testApiKey(apiKey) {
    const response = await fetch(`${API_BASE}/profile/test-api-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey })
    });
    return handleResponse(response);
  },

  // Concierge Chat - Now includes knowledgeBase from Deep Research
  async conciergeChat({ message, conversationHistory = [], project, documents, companyProfile, knowledgeBase }) {
    const response = await fetch(`${API_BASE}/concierge/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, conversationHistory, project, documents, companyProfile, knowledgeBase })
    });
    return handleResponse(response);
  },

  async getOutputTypes() {
    const response = await fetch(`${API_BASE}/concierge/outputs`);
    return handleResponse(response);
  },

  // Phase 2: Negotiator Agent
  async negotiatePricing({ project, bomItems }) {
    const response = await fetch(`${API_BASE}/negotiator/draft-emails`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project, bomItems })
    });
    return handleResponse(response);
  },

  // Phase 3: Project Memory
  async askProjectMemory({ project, documents, query }) {
    const response = await fetch(`${API_BASE}/memory/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project, documents, query })
    });
    return handleResponse(response);
  },

  async generateOutput({ outputType, project, documents, companyProfile }) {
    const response = await fetch(`${API_BASE}/concierge/generate-output`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outputType, project, documents, companyProfile })
    });
    return handleResponse(response);
  },

  async extractProjectInfo(documents) {
    const response = await fetch(`${API_BASE}/concierge/extract-project-info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documents })
    });
    return handleResponse(response);
  },

  async analyzeBlueprints({ documents, project, analysisType = 'full' }) {
    const response = await fetch(`${API_BASE}/concierge/analyze-blueprints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documents, project, analysisType })
    });
    return handleResponse(response);
  },

  async getSystemCapabilities() {
    const response = await fetch(`${API_BASE}/system/capabilities`);
    return handleResponse(response);
  },

  async exportAllOutputs({ project, documents, companyProfile, outputTypes }) {
    const response = await fetch(`${API_BASE}/concierge/export-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project, documents, companyProfile, outputTypes })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error || 'Export failed', response.status);
    }

    // Return blob for download
    return response.blob();
  },

  async autoMarkup({ imageData, mediaType, pageNumber, projectName, pixelsPerFoot, blueprintContext }) {
    const response = await fetch(`${API_BASE}/concierge/auto-markup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageData, mediaType, pageNumber, projectName, pixelsPerFoot, blueprintContext })
    });
    return handleResponse(response);
  },

  // Blueprint Intelligence - Analyze all pages, extract legend, build shared context
  async runBlueprintIntelligence({ documents, projectId, projectName }) {
    const response = await fetch(`${API_BASE}/concierge/blueprint-intelligence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documents, projectId, projectName })
    });
    return handleResponse(response);
  },

  // Deep Research - Comprehensive analysis of ALL documents (blueprints, specs, RFPs)
  // Builds complete knowledge base that all agents can access
  async runDeepResearch({ documents, projectId, projectName, companyProfile }) {
    const response = await fetch(`${API_BASE}/concierge/deep-research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documents, projectId, projectName, companyProfile })
    });
    return handleResponse(response);
  }
};

export { ApiError };
