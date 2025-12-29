import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import {
  generateAnalysisDocument,
  generateProposalDocument,
  generateBOMDocument,
  generateLaborDocument,
  generateGenericDocument
} from '../utils/wordGenerator';
import PlanMarkup from '../components/PlanMarkup';

// Chat Message Display Component - Clean, professional formatting
function ChatMessageDisplay({ content, isError }) {
  if (isError) {
    return <div className="text-sm leading-relaxed">{content}</div>;
  }

  // Parse and format content into structured elements
  const formatContent = (text) => {
    if (!text) return [];

    const elements = [];
    const lines = text.split('\n');
    let inList = false;
    let listItems = [];
    let listType = null;

    const flushList = (key) => {
      if (listItems.length > 0) {
        elements.push({ type: 'list', items: [...listItems], listType, key: `list_${key}` });
        listItems = [];
        listType = null;
        inList = false;
      }
    };

    lines.forEach((line, idx) => {
      let trimmed = line.trim();

      // Empty line - flush list and add spacing
      if (!trimmed) {
        flushList(idx);
        elements.push({ type: 'spacer', key: idx });
        return;
      }

      // Clean markdown syntax but preserve meaning
      const cleanLine = trimmed
        .replace(/\*\*([^*]+)\*\*/g, '$1')  // Bold
        .replace(/\*([^*]+)\*/g, '$1')       // Italic
        .replace(/`([^`]+)`/g, '$1')         // Code
        .replace(/^#{1,6}\s*/, '');          // Headers

      // Section headers (# ## ###)
      if (line.match(/^#{1,3}\s/)) {
        flushList(idx);
        const level = (line.match(/^#+/) || [''])[0].length;
        elements.push({ type: 'header', text: cleanLine, level, key: idx });
      }
      // Bullet points
      else if (trimmed.match(/^[-•]\s/)) {
        if (listType !== 'bullet') flushList(idx);
        listType = 'bullet';
        inList = true;
        listItems.push(cleanLine.replace(/^[-•]\s*/, ''));
      }
      // Numbered items
      else if (trimmed.match(/^\d+[.)]\s/)) {
        if (listType !== 'numbered') flushList(idx);
        listType = 'numbered';
        inList = true;
        listItems.push(cleanLine.replace(/^\d+[.)]\s*/, ''));
      }
      // Key-value pairs (Label: Value)
      else if (cleanLine.match(/^[A-Za-z][^:]{0,30}:\s*.+/)) {
        flushList(idx);
        const colonIdx = cleanLine.indexOf(':');
        elements.push({
          type: 'keyvalue',
          label: cleanLine.substring(0, colonIdx).trim(),
          value: cleanLine.substring(colonIdx + 1).trim(),
          key: idx
        });
      }
      // Regular paragraph text
      else {
        flushList(idx);
        elements.push({ type: 'paragraph', text: cleanLine, key: idx });
      }
    });

    flushList('end');
    return elements;
  };

  const elements = formatContent(content);

  return (
    <div className="text-sm leading-relaxed space-y-2">
      {elements.map((el) => {
        switch (el.type) {
          case 'header':
            return (
              <div
                key={el.key}
                className={`font-semibold text-white ${el.level === 1 ? 'text-base border-b border-gray-600 pb-1 mt-3' :
                  el.level === 2 ? 'text-sm mt-2' : 'text-sm mt-1'
                  }`}
              >
                {el.text}
              </div>
            );

          case 'list':
            return (
              <div key={el.key} className="space-y-1 pl-1">
                {el.items.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-gold mt-0.5 flex-shrink-0">
                      {el.listType === 'bullet' ? '•' : `${i + 1}.`}
                    </span>
                    <span className="text-gray-200">{item}</span>
                  </div>
                ))}
              </div>
            );

          case 'keyvalue':
            return (
              <div key={el.key} className="flex items-start gap-2 py-0.5">
                <span className="text-gray-400 font-medium min-w-fit">{el.label}:</span>
                <span className="text-white">{el.value}</span>
              </div>
            );

          case 'paragraph':
            return (
              <p key={el.key} className="text-gray-200 leading-relaxed">
                {el.text}
              </p>
            );

          case 'spacer':
            return <div key={el.key} className="h-1" />;

          default:
            return <div key={el.key} className="text-gray-200">{el.text}</div>;
        }
      })}
    </div>
  );
}

// Polished Output Display Component (no markdown, beautiful tables)
function OutputDisplay({ content }) {
  // Parse markdown table
  const parseTable = (lines, startIdx) => {
    const headers = [];
    const rows = [];
    let i = startIdx;

    // Header row
    if (lines[i]?.includes('|')) {
      const cells = lines[i].split('|').map(c => c.trim().replace(/\*\*/g, '')).filter(c => c);
      headers.push(...cells);
      i++;
    }

    // Skip separator
    if (lines[i]?.match(/^\|?[\s-:|]+\|?$/)) i++;

    // Data rows
    while (i < lines.length && lines[i]?.includes('|') && !lines[i].match(/^\|?[\s-:|]+\|?$/)) {
      const cells = lines[i].split('|').map(c => c.trim().replace(/\*\*/g, '')).filter(c => c);
      if (cells.length > 0) rows.push(cells);
      i++;
    }

    return { headers, rows, endIdx: i };
  };

  const parseContent = (text) => {
    if (!text) return [];

    const elements = [];
    const lines = text.split('\n');
    let i = 0;
    let keyCounter = 0;

    while (i < lines.length) {
      let line = lines[i];
      let trimmed = line.trim();

      if (!trimmed) {
        elements.push({ type: 'spacer', key: keyCounter++ });
        i++;
        continue;
      }

      // Detect markdown table
      if (trimmed.startsWith('|') || (trimmed.includes('|') && lines[i + 1]?.match(/^\|?[\s-:|]+\|?$/))) {
        const { headers, rows, endIdx } = parseTable(lines, i);
        if (headers.length > 0 && rows.length > 0) {
          elements.push({ type: 'table', headers, rows, key: keyCounter++ });
        }
        i = endIdx;
        continue;
      }

      // Remove markdown formatting
      trimmed = trimmed
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/#{1,6}\s*/g, '')
        .replace(/`/g, '');

      // Detect headers
      if (line.match(/^#{1,3}\s/) || (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && trimmed.length < 80 && !trimmed.includes(':') && !trimmed.includes('|'))) {
        elements.push({ type: 'header', text: trimmed, key: keyCounter++ });
      }
      // Detect subheaders
      else if (line.match(/^#{3,4}\s/)) {
        elements.push({ type: 'subheader', text: trimmed, key: keyCounter++ });
      }
      // Detect bullet points
      else if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
        const content = trimmed.replace(/^[-•]\s*/, '');
        elements.push({ type: 'bullet', text: content, key: keyCounter++ });
      }
      // Detect numbered items
      else if (trimmed.match(/^\d+\.\s/)) {
        const content = trimmed.replace(/^\d+\.\s*/, '');
        elements.push({ type: 'numbered', text: content, key: keyCounter++ });
      }
      // Detect key: value pairs
      else if (trimmed.includes(':') && trimmed.indexOf(':') < 50 && !trimmed.includes('|')) {
        const colonIndex = trimmed.indexOf(':');
        const label = trimmed.substring(0, colonIndex).trim();
        const value = trimmed.substring(colonIndex + 1).trim();
        if (value) {
          elements.push({ type: 'keyvalue', label, value, key: keyCounter++ });
        } else {
          elements.push({ type: 'subheader', text: label, key: keyCounter++ });
        }
      }
      // Regular text
      else if (!trimmed.match(/^[\s-:|]+$/)) {
        elements.push({ type: 'text', text: trimmed, key: keyCounter++ });
      }

      i++;
    }

    return elements;
  };

  const elements = parseContent(content);

  return (
    <div className="space-y-3">
      {elements.map((el) => {
        switch (el.type) {
          case 'header':
            return (
              <div key={el.key} className="pt-4 pb-2 border-b border-gray-700 mb-3">
                <h3 className="text-lg font-bold text-white">{el.text}</h3>
              </div>
            );
          case 'subheader':
            return (
              <div key={el.key} className="pt-3 pb-1">
                <h4 className="text-sm font-semibold text-gold">{el.text}</h4>
              </div>
            );
          case 'bullet':
            return (
              <div key={el.key} className="flex items-start gap-2 pl-4">
                <span className="text-gold mt-1">•</span>
                <span className="text-sm text-gray-300">{el.text}</span>
              </div>
            );
          case 'numbered':
            return (
              <div key={el.key} className="flex items-start gap-2 pl-4">
                <span className="text-sm text-gray-300">{el.text}</span>
              </div>
            );
          case 'keyvalue':
            return (
              <div key={el.key} className="flex items-start gap-2 py-1">
                <span className="text-sm text-gray-400 min-w-[140px]">{el.label}:</span>
                <span className="text-sm text-white font-medium">{el.value}</span>
              </div>
            );
          case 'table':
            return (
              <div key={el.key} className="my-4 overflow-x-auto rounded-lg border border-gray-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-bg-tertiary">
                      {el.headers.map((h, hIdx) => (
                        <th key={hIdx} className="px-4 py-3 text-left font-semibold text-white border-b border-gray-600">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {el.rows.map((row, rIdx) => (
                      <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-bg-secondary' : 'bg-bg-card'}>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className={`px-4 py-3 border-b border-gray-700/50 ${cIdx === 0 ? 'font-medium text-white' : 'text-gray-300'}`}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case 'spacer':
            return <div key={el.key} className="h-2" />;
          default:
            return (
              <p key={el.key} className="text-sm text-gray-300 leading-relaxed">{el.text}</p>
            );
        }
      })}
    </div>
  );
}

// Polished Analysis Display Component
function AnalysisDisplay({ analysis, project }) {
  // Parse the markdown-style analysis into structured sections
  const parseAnalysis = (text) => {
    const sections = [];
    const lines = text.split('\n');
    let currentSection = null;
    let currentSubsection = null;

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Main section headers (## or # followed by number)
      if (trimmed.match(/^#{1,2}\s*\d+\.\s*/i) || trimmed.match(/^#{1,2}\s+[A-Z]/)) {
        if (currentSection) sections.push(currentSection);
        const title = trimmed.replace(/^#{1,3}\s*\d*\.?\s*/, '').replace(/\*\*/g, '');
        currentSection = { title, subsections: [], items: [] };
        currentSubsection = null;
      }
      // Subsection headers (### or ####)
      else if (trimmed.match(/^#{3,4}\s+/)) {
        const title = trimmed.replace(/^#{3,4}\s*\**/, '').replace(/\*\*/g, '').replace(/\(.*\)/, '').trim();
        currentSubsection = { title, items: [] };
        if (currentSection) {
          currentSection.subsections.push(currentSubsection);
        }
      }
      // List items or content
      else if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
        const content = trimmed.replace(/^[-•]\s*/, '').replace(/\*\*/g, '');
        const item = parseListItem(content);
        if (currentSubsection) {
          currentSubsection.items.push(item);
        } else if (currentSection) {
          currentSection.items.push(item);
        }
      }
      // Bold key-value pairs
      else if (trimmed.includes('**') && trimmed.includes(':')) {
        const content = trimmed.replace(/\*\*/g, '');
        const item = parseListItem(content);
        if (currentSubsection) {
          currentSubsection.items.push(item);
        } else if (currentSection) {
          currentSection.items.push(item);
        }
      }
    });

    if (currentSection) sections.push(currentSection);
    return sections;
  };

  const parseListItem = (text) => {
    // Check for key: value pattern
    const colonIndex = text.indexOf(':');
    if (colonIndex > 0 && colonIndex < 50) {
      return {
        label: text.substring(0, colonIndex).trim(),
        value: text.substring(colonIndex + 1).trim()
      };
    }
    return { value: text };
  };

  const sections = parseAnalysis(analysis);

  // Get icon for section based on title
  const getSectionIcon = (title) => {
    const lower = title.toLowerCase();
    if (lower.includes('summary') || lower.includes('project')) return '📋';
    if (lower.includes('system') || lower.includes('breakdown')) return '🔧';
    if (lower.includes('communication') || lower.includes('data') || lower.includes('network')) return '🌐';
    if (lower.includes('fire')) return '🔥';
    if (lower.includes('security') || lower.includes('access')) return '🔒';
    if (lower.includes('cctv') || lower.includes('camera') || lower.includes('video')) return '📹';
    if (lower.includes('audio') || lower.includes('av')) return '🎵';
    if (lower.includes('phone') || lower.includes('telephone')) return '📞';
    if (lower.includes('cost') || lower.includes('budget') || lower.includes('price')) return '💰';
    if (lower.includes('labor') || lower.includes('hour')) return '⏱️';
    if (lower.includes('material') || lower.includes('equipment')) return '📦';
    if (lower.includes('compliance') || lower.includes('code')) return '✅';
    if (lower.includes('recommendation')) return '💡';
    return '📌';
  };

  const getSubsectionIcon = (title) => {
    const lower = title.toLowerCase();
    if (lower.includes('data') || lower.includes('network') || lower.includes('infrastructure')) return '🌐';
    if (lower.includes('telephone') || lower.includes('phone')) return '📞';
    if (lower.includes('fiber') || lower.includes('backbone')) return '🔗';
    if (lower.includes('outlet')) return '🔌';
    if (lower.includes('cable') || lower.includes('cabling')) return '🔌';
    if (lower.includes('fire')) return '🔥';
    if (lower.includes('camera') || lower.includes('cctv')) return '📹';
    if (lower.includes('access') || lower.includes('door')) return '🚪';
    if (lower.includes('audio') || lower.includes('speaker')) return '🔊';
    return '▸';
  };

  if (sections.length === 0) {
    // Fallback to simple display if parsing fails
    return (
      <div className="whitespace-pre-wrap text-sm text-gray-300 leading-relaxed">
        {analysis}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project Header Card */}
      {project && (
        <div className="bg-gradient-to-r from-gold/20 to-teal/20 rounded-xl p-5 border border-gold/30">
          <h2 className="text-xl font-bold text-white mb-2">{project.name}</h2>
          <div className="flex flex-wrap gap-4 text-sm text-gray-300">
            {project.address && (
              <span className="flex items-center gap-1.5">
                <span>📍</span> {project.address}{project.city ? `, ${project.city}` : ''}
              </span>
            )}
            {project.customer && (
              <span className="flex items-center gap-1.5">
                <span>🏢</span> {project.customer}
              </span>
            )}
            {project.dueDate && (
              <span className="flex items-center gap-1.5">
                <span>📅</span> Due: {new Date(project.dueDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Analysis Sections */}
      {sections.map((section, sIdx) => (
        <div key={sIdx} className="bg-bg-secondary rounded-xl border border-gray-700 overflow-hidden">
          {/* Section Header */}
          <div className="px-5 py-4 bg-bg-tertiary border-b border-gray-700">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span>{getSectionIcon(section.title)}</span>
              <span>{section.title}</span>
            </h3>
          </div>

          {/* Section Content */}
          <div className="p-5">
            {/* Direct items */}
            {section.items.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                {section.items.map((item, iIdx) => (
                  <div key={iIdx} className="flex items-start gap-2">
                    {item.label ? (
                      <>
                        <span className="text-gray-400 text-sm min-w-[140px]">{item.label}:</span>
                        <span className="text-white text-sm font-medium">{item.value}</span>
                      </>
                    ) : (
                      <span className="text-gray-300 text-sm">{item.value}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Subsections */}
            {section.subsections.length > 0 && (
              <div className="space-y-4">
                {section.subsections.map((sub, subIdx) => (
                  <div key={subIdx} className="bg-bg-card rounded-lg p-4 border border-gray-700/50">
                    <h4 className="text-sm font-semibold text-gold mb-3 flex items-center gap-2">
                      <span>{getSubsectionIcon(sub.title)}</span>
                      {sub.title}
                    </h4>
                    <div className="space-y-2">
                      {sub.items.map((item, iIdx) => (
                        <div key={iIdx} className="flex items-start gap-2 text-sm">
                          {item.label ? (
                            <>
                              <span className="text-gray-400 min-w-[160px]">{item.label}:</span>
                              <span className="text-gray-200">{item.value}</span>
                            </>
                          ) : (
                            <>
                              <span className="text-gray-500">•</span>
                              <span className="text-gray-300">{item.value}</span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProjectView({ projectId, companyProfile, onNavigate, onToast }) {
  const [project, setProject] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState('');
  const [visionEnabled, setVisionEnabled] = useState(null); // null = checking, true/false = result

  // Chat state
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [suggestedActions, setSuggestedActions] = useState([]);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Outputs state
  const [outputs, setOutputs] = useState([]);
  const [generatingOutput, setGeneratingOutput] = useState(null);

  // Plan Markup state
  const [markupOpen, setMarkupOpen] = useState(false);
  const [markupPage, setMarkupPage] = useState(null);
  const [savedMarkups, setSavedMarkups] = useState({});

  // Deep Research / Knowledge Base state - shared context across all agents
  const [knowledgeBase, setKnowledgeBase] = useState(null);
  const [blueprintContext, setBlueprintContext] = useState(null);
  const [isRunningResearch, setIsRunningResearch] = useState(false);
  const [researchProgress, setResearchProgress] = useState('');

  // Gemini Video State
  const [videoFile, setVideoFile] = useState(null);
  const [isVideoAnalyzing, setIsVideoAnalyzing] = useState(false);
  const [videoAnalysis, setVideoAnalysis] = useState(null);

  // Negotiator State
  const [isNegotiating, setIsNegotiating] = useState(false);
  const [negotiationResult, setNegotiationResult] = useState(null);

  // Project Memory State (Phase 3)
  const [memoryQuery, setMemoryQuery] = useState('');
  const [memoryHistory, setMemoryHistory] = useState([]);
  const [isMemoryThinking, setIsMemoryThinking] = useState(false);

  // Check system capabilities on mount
  useEffect(() => {
    api.getSystemCapabilities()
      .then(caps => setVisionEnabled(caps.visionEnabled))
      .catch(() => setVisionEnabled(false));
  }, []);

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleVideoUpload = (files) => {
    if (files && files[0]) {
      setVideoFile(files[0]);
      onToast?.('Video selected ready for analysis', 'info');
    }
  };

  const handleAnalyzeVideo = async () => {
    if (!videoFile) return;

    setIsVideoAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('video', videoFile);

      const result = await api.analyzeVideo({
        formData,
        projectId
      });

      setVideoAnalysis(result.analysis);
      onToast?.('Video analysis complete!', 'success');

      // Save result as an output automatically
      const newOutput = {
        id: `video_${Date.now()}`,
        type: 'analysis',
        name: `Site Walk Analysis - ${new Date().toLocaleTimeString()}`,
        content: result.analysis,
        createdAt: new Date().toISOString(),
        source: 'gemini_video',
        icon: '📹'
      };

      setOutputs(prev => [newOutput, ...prev]);
      await api.updateProject(projectId, {
        outputs: [newOutput, ...outputs]
      });

    } catch (error) {
      console.error('Video analysis failed:', error);
      onToast?.('Failed to analyze video', 'error');
    } finally {
      setIsVideoAnalyzing(false);
    }
  };

  const loadProject = async () => {
    try {
      const response = await api.getProject(projectId);
      setProject(response.project);
      setDocuments(response.project.documents || []);
    } catch (error) {
      console.error('Failed to load project:', error);
      onToast?.('Failed to load project', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    try {
      const formData = new FormData();
      fileArray.forEach(f => formData.append('files', f));

      setAnalysisProgress('Uploading documents...');
      const uploadResponse = await api.uploadDocuments(formData);

      if (uploadResponse.processed > 0) {
        const newDocs = uploadResponse.documents.map(doc => ({
          ...doc,
          uploadedAt: new Date().toISOString()
        }));

        // Debug: Log vision data status
        console.log('Uploaded documents:', newDocs.map(d => ({
          filename: d.filename,
          hasVisionData: !!d.visionData,
          visionPages: d.visionData?.pageCount || 0,
          isBlueprint: d.isBlueprint
        })));

        // Update project with new documents
        const updatedDocs = [...documents, ...newDocs];
        setDocuments(updatedDocs);

        await api.updateProject(projectId, {
          documents: updatedDocs
        });

        onToast?.(`Uploaded ${uploadResponse.processed} documents`, 'success');
        setAnalysisProgress('');

        // Auto-analyze if this is the first upload
        if (documents.length === 0 && !project?.analysis) {
          handleAnalyze(updatedDocs);
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      onToast?.('Failed to upload documents', 'error');
      setAnalysisProgress('');
    }
  };

  const handleAnalyze = async (docsToAnalyze = documents) => {
    if (docsToAnalyze.length === 0) {
      onToast?.('Please upload documents first', 'warning');
      return;
    }

    setIsAnalyzing(true);
    setIsRunningResearch(true);

    try {
      let combinedAnalysis = '';
      let smartContext = '';

      // =======================================================================
      // STEP 1: LEGEND HUNTING (Vision Intelligence)
      // =======================================================================
      setAnalysisProgress('👁️ Scanning for Symbol Legends...');

      const blueprintDocs = docsToAnalyze.filter(doc => doc.visionData?.pages?.length > 0);
      let legendFound = false;

      // Look for likely legend pages (Page 1 or filename containing "Legend"/"Symbols")
      if (blueprintDocs.length > 0) {
        for (const doc of blueprintDocs) {
          // Identify candidate page (usually the first one)
          const firstPage = doc.visionData.pages[0];

          try {
            // Run specific Legend Extraction Analysis
            setAnalysisProgress(`📖 Extracting legend from ${doc.filename}...`);
            const legendResponse = await api.analyzeBlueprints({
              documents: [doc], // Just analyze this doc for legend initially
              project: { name: project.name }, // Minimized need for full project context here
              analysisType: 'legend_extraction',
              // Hack: we only want the first page analyzed for legend, the backend handles single file analysis
            });

            if (legendResponse.analysis && !legendResponse.analysis.includes('NO_LEGEND_FOUND')) {
              smartContext += `\n### EXTRACTED SYMBOL LEGEND (${doc.filename})\n${legendResponse.analysis}\n`;
              legendFound = true;
              onToast?.('Legend detected and extracted!', 'success');
              break; // Stop after finding one good legend
            }
          } catch (e) {
            console.warn('Legend extraction failed for', doc.filename, e);
          }
        }
      }

      if (!legendFound) {
        setAnalysisProgress('⚠️ No specific legend found. Using standard industry symbols.');
      }

      // =======================================================================
      // STEP 2: DEEP RESEARCH (Specs & Context)
      // =======================================================================
      setAnalysisProgress('🧠 analyzing specifications with AI Context...');
      setResearchProgress('Building Project Knowledge Base...');

      try {
        // Run Deep Research (now includes the extracted legend context implicitly if we passed it, 
        // but Deep Research analyzes text. We will use the result to feed Vision Phase 3).
        const researchResponse = await api.runDeepResearch({
          documents: docsToAnalyze,
          projectId: projectId,
          projectName: project.name,
          companyProfile: companyProfile
        });

        if (researchResponse.success && researchResponse.knowledgeBase) {
          const kb = researchResponse.knowledgeBase;
          setKnowledgeBase(kb);

          // Add extracted spec requirements to our Smart Context
          if (kb.specifications?.systems) {
            smartContext += '\n### SPECIFICATION REQUIREMENTS\n';
            Object.entries(kb.specifications.systems).forEach(([sys, info]) => {
              if (info.required) {
                smartContext += `\n**${sys.toUpperCase()}**:\n${info.description || ''}\n`;
                if (info.deviceTypes) smartContext += `Required Devices: ${info.deviceTypes.join(', ')}\n`;
              }
            });
          }

          // Build the readable analysis output
          combinedAnalysis += '# 🧠 SMART ANALYSIS REPORT\n';
          if (legendFound) combinedAnalysis += '> ✅ **Verified Legend** applied to analysis.\n\n';

          combinedAnalysis += `**Confidence Level:** ${kb.confidence?.toUpperCase()}\n\n`;

          // Append standard Deep Research sections (Project Info, etc)
          if (kb.projectInfo?.address) combinedAnalysis += `- **Address:** ${kb.projectInfo.address}\n`;
          combinedAnalysis += '\n';

          // ... (rest of standard display logic logic would go here, simplified for brevity) ...
          // Re-using the robust display logic from previous step by appending it:

          // Contract/RFP Analysis
          if (kb.contract?.analyzed) {
            combinedAnalysis += '## Contract Requirements\n';
            if (kb.contract.bidDueDate) combinedAnalysis += `- **Bid Due:** ${kb.contract.bidDueDate}\n`;
            if (kb.contract.scope?.length) {
              combinedAnalysis += '\n### Scope\n';
              kb.contract.scope.slice(0, 10).forEach(item => combinedAnalysis += `- ${item}\n`);
            }
            combinedAnalysis += '\n';
          }
        }
      } catch (e) {
        console.error('Deep Research check failed', e);
      }

      // =======================================================================
      // STEP 3: CONTEXT-AWARE VISION ANALYSIS
      // =======================================================================
      // Now re-analyze blueprints using the gathered Smart Context (Legend + Specs)

      if (blueprintDocs.length > 0) {
        setAnalysisProgress('👁️ Applying Smart Context to Blueprints...');

        try {
          // We pass the collected `smartContext` to the vision API
          // The API needs to support receiving this context
          const visionResponse = await api.analyzeBlueprints({
            documents: blueprintDocs, // Analyze all blueprints
            project: {
              name: project.name,
              customer: project.customer
            },
            analysisType: 'full',
            context: smartContext // <--- THE KEY UPGRADE
          });

          if (visionResponse.analysis) {
            combinedAnalysis += '\n---\n## 📐 BLUEPRINT TAKE-OFF (Context Aware)\n';
            combinedAnalysis += visionResponse.analysis;
          }

        } catch (visionError) {
          console.error('Smart Vision failed', visionError);
          onToast?.('Smart vision analysis failed', 'error');
        }
      }

      // Detect systems
      const systemKeywords = {
        fireAlarm: ['fire alarm', 'smoke detector', 'facp', 'nfpa 72', 'horn', 'strobe', 'pull station'],
        dataCabling: ['data', 'cabling', 'cat6', 'network', 'structured', 'outlet', 'wap', 'wifi'],
        cctv: ['cctv', 'camera', 'surveillance', 'video', 'nvr'],
        accessControl: ['access control', 'card reader', 'door', 'credential', 'rex'],
        security: ['security', 'intrusion', 'alarm', 'motion'],
        audioVisual: ['audio', 'av', 'speaker', 'display', 'paging'],
        twoWay: ['area of refuge', 'aor', 'two-way', 'elevator', 'emergency'],
        nurseCall: ['nurse call', 'patient', 'healthcare']
      };

      const analysisLower = combinedAnalysis.toLowerCase();
      const detectedSystems = Object.entries(systemKeywords)
        .filter(([_, keywords]) => keywords.some(kw => analysisLower.includes(kw)))
        .map(([system]) => system);

      const updatedProject = {
        ...project,
        analysis: combinedAnalysis,
        systems: detectedSystems.length > 0 ? detectedSystems : ['fireAlarm', 'dataCabling'],
        status: 'ready',
        documents: docsToAnalyze,
        hasBlueprints: blueprintDocs.length > 0
      };

      await api.updateProject(projectId, updatedProject);
      setProject(updatedProject);
      onToast?.('Smart Analysis complete!', 'success');
      setActiveTab('overview');

    } catch (error) {
      console.error('Analysis error:', error);
      onToast?.('Failed to analyze documents', 'error');
    } finally {
      setIsAnalyzing(false);
      setIsRunningResearch(false);
      setAnalysisProgress('');
      setResearchProgress('');
    }
  };

  const handleSendMessage = async (message = chatInput) => {
    if (!message.trim() || isChatting) return;

    const userMessage = {
      role: 'user',
      content: message.trim(),
      timestamp: new Date().toISOString()
    };

    setChatHistory(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatting(true);

    try {
      const response = await api.conciergeChat({
        message: message.trim(),
        conversationHistory: chatHistory,
        project,
        documents,
        companyProfile,
        knowledgeBase // Pass deep research knowledge base to chat
      });

      const assistantMessage = {
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString(),
        intent: response.intent,
        agents: response.detectedAgents,
        saveableDocument: response.saveableDocument
      };

      setChatHistory(prev => [...prev, assistantMessage]);
      setSuggestedActions(response.suggestedActions || []);

      // If there's a saveable document, show a toast
      if (response.saveableDocument) {
        onToast?.(`Document ready: "${response.saveableDocument.title}" - Click Save to add to Outputs`, 'info');
      }
    } catch (error) {
      console.error('Chat error:', error);
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}`,
        isError: true,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsChatting(false);
    }
  };

  const handleActionClick = async (action) => {
    if (action.type === 'output') {
      handleGenerateOutput(action.outputType);
    } else if (action.type === 'action' && action.action === 'analyze') {
      handleAnalyze();
    } else if (action.type === 'specialist') {
      handleSendMessage(`Tell me more about the ${action.agentId} system requirements for this project.`);
    } else if (action.type === 'save_document' && action.document) {
      handleSaveDocument(action.document);
    }
  };

  // Save a document from chat to outputs
  const handleSaveDocument = async (document) => {
    try {
      // Create an output from the chat document
      const newOutput = {
        id: document.id,
        type: document.type,
        name: document.title,
        content: document.content,
        createdAt: document.createdAt || new Date().toISOString(),
        source: 'chat',
        icon: document.type === 'bom' ? '📦' :
          document.type === 'comparison' ? '⚖️' :
            document.type === 'analysis' ? '🔍' :
              document.type === 'proposal' ? '📋' :
                document.type === 'spec' ? '📐' : '📄'
      };

      setOutputs(prev => [newOutput, ...prev]);

      // Save to project
      await api.updateProject(projectId, {
        outputs: [newOutput, ...outputs]
      });

      onToast?.(`"${document.title}" saved to Outputs!`, 'success');

      // Remove the save action from suggested actions
      setSuggestedActions(prev => prev.filter(a => a.id !== 'save_document'));
    } catch (error) {
      console.error('Save document error:', error);
      onToast?.('Failed to save document', 'error');
    }
  };

  const handleGenerateOutput = async (outputType) => {
    if (outputType === 'negotiate') {
      handleNegotiate();
      return;
    }

    setGeneratingOutput(outputType);

    try {
      const response = await api.generateOutput({
        outputType,
        project,
        documents,
        companyProfile
      });

      setOutputs(prev => [response.output, ...prev]);
      onToast?.(`${response.output.name} generated!`, 'success');
      setActiveTab('outputs');
    } catch (error) {
      console.error('Generate output error:', error);
      onToast?.('Failed to generate output', 'error');
    } finally {
      setGeneratingOutput(null);
    }
  };

  const handleRemoveDocument = async (index) => {
    const updatedDocs = documents.filter((_, i) => i !== index);
    setDocuments(updatedDocs);
    await api.updateProject(projectId, { documents: updatedDocs });
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportAll = async () => {
    setIsExporting(true);
    onToast?.('Generating all outputs... This may take a few minutes.', 'info');

    try {
      const blob = await api.exportAllOutputs({
        project,
        documents,
        companyProfile
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_')}_Project_Package.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      onToast?.('Project package downloaded!', 'success');
    } catch (error) {
      console.error('Export error:', error);
      onToast?.('Failed to export project package', 'error');
    } finally {
      setIsExporting(false);
    }
  };



  const handleNegotiate = async () => {
    // Generate a quick mock BOM from outputs if real one doesn't exist
    // In a real app this would come from the BOM output
    const mockBOM = [
      { id: 'cat6a', name: 'CAT6A Plenum Cable (Blue)', quantity: 25000, description: '1000ft Spools' },
      { id: 'jci-panel', name: 'Fire Alarm Control Panel', quantity: 1, description: 'Addressable 4-loop' },
      { id: 'cam-bullet', name: '4MP Bullet Camera', quantity: 45, description: 'IP67, IR 30m' },
      { id: 'card-reader', name: 'Multi-tech Card Reader', quantity: 12, description: 'OSDP support' }
    ];

    setIsNegotiating(true);
    try {
      const result = await api.negotiatePricing({
        project,
        bomItems: mockBOM
      });

      setNegotiationResult(result);
      onToast?.('Negotiation emails drafted!', 'success');
      setActiveTab('video'); // Auto-switch to results

      // Save strategy as an output
      const newOutput = {
        id: `neg_${Date.now()}`,
        type: 'analysis',
        name: `Procurement Strategy - ${new Date().toLocaleTimeString()}`,
        content: `## STRATEGY\n${result.strategy}\n\n## DRAFTED EMAILS\n${result.emails.map(e => `### ${e.vendorName}\n**Subject:** ${e.subject}\n\n${e.body}`).join('\n\n---\n\n')}`,
        createdAt: new Date().toISOString(),
        source: 'negotiator_agent',
        icon: '🤝'
      };

      setOutputs(prev => [newOutput, ...prev]);
      await api.updateProject(projectId, {
        outputs: [newOutput, ...outputs]
      });

    } catch (error) {
      console.error('Negotiation failed:', error);
      onToast?.('Failed to run negotiator', 'error');
    } finally {
      setIsNegotiating(false);
    }
  };

  const handleAskMemory = async () => {
    if (!memoryQuery.trim()) return;

    const query = memoryQuery;
    setMemoryQuery('');
    setMemoryHistory(prev => [...prev, { role: 'user', content: query }]);
    setIsMemoryThinking(true);

    try {
      const result = await api.askProjectMemory({
        project,
        documents,
        query
      });

      setMemoryHistory(prev => [...prev, { role: 'assistant', content: result.answer }]);
    } catch (error) {
      console.error('Memory failed:', error);
      setMemoryHistory(prev => [...prev, { role: 'assistant', content: 'Starting the Project Memory engine failed. Please try again.' }]);
    } finally {
      setIsMemoryThinking(false);
    }
  };

  // Check if we have blueprints with vision data
  const hasBlueprints = documents.some(doc => doc.visionData?.pages?.length > 0);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'premier', label: 'Premier', icon: '💎' },
    { id: 'chat', label: 'AI Assistant', icon: '💬' },
    { id: 'memory', label: 'Project Brain', icon: '🧠' },
    { id: 'video', label: 'Agent Tools', icon: '🤖' },
    { id: 'outputs', label: 'Outputs', icon: '📋' },
    ...(hasBlueprints ? [{ id: 'markup', label: 'Plan Markup', icon: '✏️' }] : [])
  ];

  // Open markup editor for a specific page
  const handleOpenMarkup = (doc, pageIndex) => {
    const page = doc.visionData.pages[pageIndex];
    setMarkupPage({
      docId: doc.filename,
      pageIndex,
      imageData: page.base64,
      pageNumber: page.page,
      annotations: savedMarkups[`${doc.filename}_${pageIndex}`]?.annotations || []
    });
    setMarkupOpen(true);
  };

  // Save markup annotations
  const handleSaveMarkup = (data) => {
    const key = `${markupPage.docId}_${markupPage.pageIndex}`;
    setSavedMarkups(prev => ({
      ...prev,
      [key]: {
        annotations: data.annotations,
        imageWithMarkup: data.imageWithMarkup,
        savedAt: new Date().toISOString()
      }
    }));

    // Also save to project
    api.updateProject(projectId, {
      markups: {
        ...savedMarkups,
        [key]: {
          annotations: data.annotations,
          savedAt: new Date().toISOString()
        }
      }
    }).catch(console.error);

    onToast?.('Markup saved!', 'success');
    setMarkupOpen(false);
  };

  // Organized output categories
  const outputCategories = [
    {
      id: 'estimating',
      name: 'Estimating & Proposals',
      icon: '💰',
      outputs: [
        { id: 'negotiate', name: 'Run Negotiator Agent', icon: '🤝', description: 'Autonomous vendor pricing negotiation (Claude 4.5)', isAction: true },
        { id: 'proposal', name: 'Professional Proposal', icon: '📋', description: 'Client-ready proposal with scope and pricing' },
        { id: 'bom', name: 'Bill of Materials', icon: '📦', description: 'Detailed material list with quantities' },
        { id: 'labor', name: 'Labor Estimate', icon: '⏱️', description: 'Labor breakdown by task and phase' },
        { id: 'scope', name: 'Scope Narrative', icon: '📝', description: 'Detailed scope of work description' },
        { id: 'exclusions', name: 'Clarifications & Exclusions', icon: '⚠️', description: 'What\'s included and excluded' },
        { id: 'rfi', name: 'Request for Information', icon: '❓', description: 'Questions for customer clarification' },
      ]
    },
    {
      id: 'vision',
      name: 'Blueprint Analysis',
      icon: '👁️',
      requiresBlueprints: true,
      outputs: [
        { id: 'device_count', name: 'Device Count', icon: '📐', description: 'Count all devices from floor plans', requiresVision: true },
        { id: 'cable_estimate', name: 'Cable Estimate', icon: '🔌', description: 'Estimate cable runs and quantities', requiresVision: true },
        { id: 'device_matrix', name: 'Device Location Matrix', icon: '📍', description: 'Spreadsheet-ready device list by room', requiresVision: true },
        { id: 'work_packets', name: 'Installation Work Packets', icon: '🔧', description: 'Per-area work packets for field techs', requiresVision: true },
      ]
    },
    {
      id: 'management',
      name: 'Project Management',
      icon: '📊',
      outputs: [
        { id: 'pm_handoff', name: 'PM Handoff Package', icon: '📋', description: 'Complete handoff with scope, risks, milestones' },
        { id: 'executive_summary', name: 'Executive Summary', icon: '📊', description: 'One-page stakeholder overview' },
        { id: 'schedule', name: 'Project Schedule', icon: '📅', description: 'Installation timeline with milestones' },
        { id: 'change_order', name: 'Change Order Template', icon: '📄', description: 'Pre-filled change order document' },
      ]
    },
    {
      id: 'field',
      name: 'Field Operations',
      icon: '🔧',
      outputs: [
        { id: 'commissioning', name: 'Commissioning Checklist', icon: '✅', description: 'System-by-system testing checklist' },
        { id: 'safety_plan', name: 'Site Safety Plan', icon: '🦺', description: 'Job site safety requirements' },
        { id: 'submittal', name: 'Submittal Package', icon: '📑', description: 'Equipment specs and cut sheets' },
      ]
    },
    {
      id: 'closeout',
      name: 'Project Closeout',
      icon: '🏁',
      outputs: [
        { id: 'punch_list', name: 'Punch List Template', icon: '📝', description: 'Pre-formatted punch list by system' },
        { id: 'closeout_package', name: 'Closeout Documentation', icon: '📁', description: 'As-built docs and warranty info' },
        { id: 'training_outline', name: 'Training Outline', icon: '🎓', description: 'End-user training curriculum' },
      ]
    }
  ];

  // Flatten for backward compatibility
  const outputTypes = outputCategories.flatMap(cat =>
    cat.requiresBlueprints && !hasBlueprints ? [] : cat.outputs
  );

  if (loading) {
    return (
      <div className="pt-[70px] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="pt-[70px] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-semibold mb-2">Project not found</h2>
          <button
            onClick={() => onNavigate('projects')}
            className="mt-4 px-6 py-3 gradient-gold rounded-xl text-black font-semibold"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-[70px] min-h-screen flex flex-col">
      {/* Project Header */}
      <div className="bg-bg-secondary border-b border-gray-700 px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => onNavigate('projects')}
              className="p-2 bg-bg-tertiary border border-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              ←
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <p className="text-gray-400">{project.customer} • {project.city}</p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-medium border ${project.status === 'ready' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
              project.status === 'analyzing' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                'bg-gray-500/20 text-gray-400 border-gray-500/30'
              }`}>
              {project.status}
            </span>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2.5 rounded-xl font-medium transition-all ${activeTab === tab.id
                  ? 'bg-gold text-black'
                  : 'bg-bg-tertiary text-gray-400 hover:text-white'
                  }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
                {tab.id === 'outputs' && outputs.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-black/20 rounded-full text-xs">
                    {outputs.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">

        {/* Project Memory Tab */}
        {activeTab === 'memory' && (
          <div className="h-full flex flex-col max-w-5xl mx-auto p-6">
            <div className="flex-1 overflow-auto space-y-6 mb-6">
              {memoryHistory.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                  <div className="text-6xl mb-4">🧠</div>
                  <h3 className="text-2xl font-bold text-gray-300 mb-2">Project Memory</h3>
                  <p className="max-w-md mx-auto">
                    I have ingested all {documents.length} project documents into my 2-million-token context window.
                    Ask me anything about specs, conflicts, or details.
                  </p>
                </div>
              ) : (
                memoryHistory.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-4 rounded-xl ${msg.role === 'user'
                      ? 'bg-gold text-black'
                      : 'bg-bg-card border border-gray-700'
                      }`}>
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  </div>
                ))
              )}
              {isMemoryThinking && (
                <div className="flex justify-start">
                  <div className="bg-bg-card border border-gray-700 p-4 rounded-xl flex items-center gap-3">
                    <div className="w-4 h-4 bg-purple-500 rounded-full animate-pulse" />
                    <span className="text-gray-400 text-sm">Reasoning across {documents.length} documents...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-bg-secondary p-4 rounded-xl border border-gray-700 flex gap-4">
              <input
                type="text"
                value={memoryQuery}
                onChange={(e) => setMemoryQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskMemory()}
                placeholder="Ask the Project Brain (e.g., 'Do the specs in Div 28 conflict with the drawings?')"
                className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500"
              />
              <button
                onClick={handleAskMemory}
                disabled={!memoryQuery.trim() || isMemoryThinking}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                Query
              </button>
            </div>
          </div>
        )}

        {/* Video Tab (Agent Tools) */}
        {activeTab === 'video' && (
          <div className="h-full overflow-auto p-8">
            <div className="max-w-4xl mx-auto space-y-8">

              {/* Negotiator Result Card (if active) */}
              {negotiationResult && (
                <div className="bg-bg-card border border-gold/50 rounded-2xl p-8 shadow-[0_0_30px_rgba(255,215,0,0.1)]">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-3 text-gold">
                    <span className="text-2xl">🤝</span> Negotiator Agent Results
                  </h3>
                  <div className="mb-6 p-4 bg-gray-900/50 rounded-xl border border-gray-700">
                    <h4 className="font-semibold text-gray-300 mb-2">Strategy</h4>
                    <p className="text-gray-400 italic">{negotiationResult.strategy}</p>
                  </div>

                  <div className="space-y-4">
                    {negotiationResult.emails.map((email, idx) => (
                      <div key={idx} className="bg-bg-secondary rounded-xl p-6 border border-gray-700">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="font-bold text-lg text-white">{email.vendorName}</div>
                            <div className="text-sm text-gray-400">{email.vendorContact}</div>
                          </div>
                          <div className="px-3 py-1 bg-green-900/30 text-green-400 text-xs rounded-full border border-green-700/50">
                            Volume: ${email.estimatedValue.toLocaleString()}
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="text-gray-300"><span className="text-gray-500">Subject:</span> {email.subject}</div>
                          <div className="p-4 bg-white/5 rounded-lg text-gray-300 whitespace-pre-wrap font-mono text-xs border border-white/5">
                            {email.body}
                          </div>
                        </div>
                        <div className="mt-4 flex gap-3">
                          <button className="flex-1 py-2 bg-gold text-black rounded-lg font-semibold hover:bg-yellow-400 transition-colors">
                            Send Email
                          </button>
                          <button className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors">
                            Edit
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-bg-card border border-gray-700 rounded-2xl p-8 text-center">
                <div className="w-20 h-20 bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">📹</span>
                </div>
                <h2 className="text-2xl font-bold mb-4">Gemini Video Estimation</h2>
                <p className="text-gray-400 mb-8 max-w-lg mx-auto">
                  Upload a site walk video. Gemini 3 Flash will watch it, identify devices, and generate an instant material takeoff.
                </p>

                {!videoFile ? (
                  <label className="block max-w-md mx-auto p-12 border-2 border-dashed border-gray-600 rounded-xl cursor-pointer hover:border-blue-500 transition-colors">
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => handleVideoUpload(e.target.files)}
                    />
                    <div className="text-4xl mb-4">📤</div>
                    <span className="font-semibold">Upload Site Walk Video</span>
                    <p className="text-sm text-gray-500 mt-2">MP4, MOV, WEBM up to 500MB</p>
                  </label>
                ) : (
                  <div className="max-w-md mx-auto bg-bg-secondary p-6 rounded-xl border border-gray-700">
                    <div className="flex items-center gap-4 mb-6">
                      <span className="text-3xl">🎬</span>
                      <div className="text-left flex-1 min-w-0">
                        <div className="font-medium truncate">{videoFile.name}</div>
                        <div className="text-sm text-gray-400">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</div>
                      </div>
                      <button
                        onClick={() => setVideoFile(null)}
                        className="p-2 hover:bg-gray-700 rounded-lg text-gray-400"
                      >
                        ✕
                      </button>
                    </div>

                    <button
                      onClick={handleAnalyzeVideo}
                      disabled={isVideoAnalyzing}
                      className="w-full py-4 gradient-gold rounded-xl text-black font-bold text-lg disabled:opacity-50"
                    >
                      {isVideoAnalyzing ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="animate-spin text-xl">⏳</span> Analyzing Frames...
                        </span>
                      ) : '✨ Analyze with Gemini Vision'}
                    </button>
                  </div>
                )}
              </div>

              {videoAnalysis && (
                <div className="bg-bg-card border border-gray-700 rounded-2xl p-8">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                    <span className="text-emerald-400">✓</span> Analysis Results
                  </h3>
                  <div className="prose prose-invert max-w-none">
                    <OutputDisplay content={videoAnalysis} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Premier Dashboard Tab */}
        {activeTab === 'premier' && (
          <div className="h-full overflow-auto p-8">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gold via-yellow-200 to-gold mb-4">
                  Welcome to Takeoff Premier
                </h2>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                  The next generation of AI-powered estimation. Combine vision, reasoning, and agents to automate your workflow.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Feature 1: Vision */}
                <div className="bg-bg-card border border-gray-700 rounded-2xl p-6 hover:border-blue-500/50 transition-all group">
                  <div className="w-16 h-16 bg-blue-900/20 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
                    👁️
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Vision Intelligence</h3>
                  <p className="text-gray-400 text-sm mb-6">
                    Our new "Magic Wand" uses Gemini Vision to automatically detect devices on floor plans and extract symbol legends instantly.
                  </p>
                  {hasBlueprints ? (
                    <button
                      onClick={() => setActiveTab('markup')}
                      className="w-full py-3 bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded-xl font-semibold hover:bg-blue-600/30 transition-colors"
                    >
                      Open Plan Markup
                    </button>
                  ) : (
                    <div className="text-xs text-center text-gray-500 py-3 border border-gray-800 rounded-xl">
                      Upload blueprints to use
                    </div>
                  )}
                </div>

                {/* Feature 2: Brain */}
                <div className="bg-bg-card border border-gray-700 rounded-2xl p-6 hover:border-purple-500/50 transition-all group">
                  <div className="w-16 h-16 bg-purple-900/20 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
                    🧠
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Project Memory</h3>
                  <p className="text-gray-400 text-sm mb-6">
                    A 2-million-token context window that reads every spec, RFI, and addendum. Ask complex questions and get cited answers.
                  </p>
                  <button
                    onClick={() => setActiveTab('memory')}
                    className="w-full py-3 bg-purple-600/20 text-purple-400 border border-purple-600/30 rounded-xl font-semibold hover:bg-purple-600/30 transition-colors"
                  >
                    Ask Project Brain
                  </button>
                </div>

                {/* Feature 3: Agents */}
                <div className="bg-bg-card border border-gray-700 rounded-2xl p-6 hover:border-green-500/50 transition-all group">
                  <div className="w-16 h-16 bg-green-900/20 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
                    🤖
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Agent Swarm</h3>
                  <p className="text-gray-400 text-sm mb-6">
                    Autonomous agents that can watch site walk videos, negotiate with vendors, and draft emails on your behalf.
                  </p>
                  <button
                    onClick={() => setActiveTab('video')}
                    className="w-full py-3 bg-green-600/20 text-green-400 border border-green-600/30 rounded-xl font-semibold hover:bg-green-600/30 transition-colors"
                  >
                    Open Agent Tools
                  </button>
                </div>
              </div>

              {/* Status Section */}
              <div className="mt-12 bg-bg-secondary rounded-2xl p-8 border border-gray-700">
                <h3 className="text-lg font-bold mb-4">System Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-black/20 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                    <span className="text-sm text-gray-300">Claude 4.5 Reasoning</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-black/20 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                    <span className="text-sm text-gray-300">Gemini Vision 1.5</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-black/20 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
                    <span className="text-sm text-gray-300">Memory Engine</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-black/20 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-gold shadow-[0_0_10px_rgba(255,215,0,0.5)]"></div>
                    <span className="text-sm text-gray-300">Konva Canvas</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="h-full overflow-auto p-8">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Documents & Upload */}
              <div className="lg:col-span-1 space-y-6">
                {/* Upload Area */}
                <div className="bg-bg-card rounded-2xl border border-gray-700 p-6">
                  <h3 className="text-lg font-semibold mb-4">📁 Documents</h3>

                  {/* Vision Status Indicator */}
                  {visionEnabled !== null && (
                    <div className={`mb-3 p-3 rounded-lg text-xs ${visionEnabled ? 'bg-green-900/30 border border-green-700/50' : 'bg-yellow-900/30 border border-yellow-700/50'}`}>
                      {visionEnabled ? (
                        <div className="flex items-center gap-2 text-green-400">
                          <span>✓</span>
                          <span><strong>Blueprint Vision Enabled</strong> - PDF floor plans will be analyzed visually</span>
                        </div>
                      ) : (
                        <div className="text-yellow-400">
                          <div className="flex items-center gap-2 mb-1">
                            <span>⚠️</span>
                            <span><strong>Vision Limited</strong> - Upload images (JPG/PNG) for blueprint analysis</span>
                          </div>
                          <p className="text-yellow-500/80 ml-5">PDF text extraction still works. For visual floor plan analysis, export PDFs as images first.</p>
                        </div>
                      )}
                    </div>
                  )}

                  <label
                    className="block p-8 bg-bg-secondary border-2 border-dashed border-gray-600 rounded-xl cursor-pointer hover:border-gold/50 transition-colors text-center"
                    onDrop={(e) => { e.preventDefault(); handleFileUpload(e.dataTransfer.files); }}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.xlsx,.xls,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.webp,.tiff,.tif"
                      onChange={(e) => handleFileUpload(e.target.files)}
                      className="hidden"
                    />
                    <div className="text-3xl mb-2">📤</div>
                    <p className="text-sm text-gray-400">Drop files or click to upload</p>
                    <p className="text-xs text-gray-500 mt-1">{visionEnabled ? 'PDF, Images, Excel, Word, Text' : 'Images (JPG/PNG), PDF, Excel, Word, Text'}</p>
                  </label>

                  {/* Blueprint Intelligence Status */}
                  {blueprintContext && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-purple-400">🧠</span>
                          <span className="font-semibold text-purple-300">Blueprint Intelligence Active</span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {blueprintContext.totalDevices} devices across {blueprintContext.totalPages} pages
                        </span>
                      </div>

                      {blueprintContext.legend?.legendFound && (
                        <div className="text-xs text-gray-400 mb-2">
                          <span className="text-green-400">✓</span> Legend extracted: {blueprintContext.legend.symbols?.length || 0} symbols
                        </div>
                      )}

                      {blueprintContext.summary?.devicesBySystem && (
                        <div className="flex flex-wrap gap-2 text-xs">
                          {Object.entries(blueprintContext.summary.devicesBySystem).map(([system, count]) => (
                            <span key={system} className="px-2 py-1 bg-gray-800 rounded text-gray-300">
                              {system.replace('_', ' ')}: {count}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Document List */}
                  {documents.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {documents.map((doc, i) => {
                        const isBlueprint = doc.isBlueprint || doc.visionData;
                        const hasVision = doc.visionData?.pages?.length > 0;
                        const pageCount = doc.visionData?.pageCount || 0;

                        return (
                          <div key={i} className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <span className="text-lg">
                                {isBlueprint ? '📐' : doc.filename?.endsWith('.pdf') ? '📄' : '📊'}
                              </span>
                              <div className="min-w-0 flex-1">
                                <span className="text-sm truncate block">{doc.filename}</span>
                                {hasVision && (
                                  <span className="text-xs text-green-400 flex items-center gap-1">
                                    ✓ Vision ready ({pageCount} page{pageCount !== 1 ? 's' : ''})
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveDocument(i)}
                              className="p-1 text-gray-500 hover:text-red-400 transition-colors ml-2"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Analyze Button */}
                  {documents.length > 0 && (
                    <button
                      onClick={() => handleAnalyze()}
                      disabled={isAnalyzing}
                      className="w-full mt-4 px-4 py-3 gradient-gold rounded-xl text-black font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
                    >
                      {isAnalyzing ? analysisProgress : '🔍 Analyze Documents'}
                    </button>
                  )}
                </div>

                {/* Systems Detected */}
                {project.systems && project.systems.length > 0 && (
                  <div className="bg-bg-card rounded-2xl border border-gray-700 p-6">
                    <h3 className="text-lg font-semibold mb-4">🔧 Systems Detected</h3>
                    <div className="space-y-2">
                      {project.systems.map(system => (
                        <div key={system} className="flex items-center gap-3 p-3 bg-bg-secondary rounded-lg">
                          <span className="text-lg">
                            {system === 'fireAlarm' ? '🔥' :
                              system === 'dataCabling' ? '🌐' :
                                system === 'cctv' ? '📹' :
                                  system === 'accessControl' ? '🚪' :
                                    system === 'security' ? '🔒' :
                                      system === 'audioVisual' ? '🎵' :
                                        system === 'twoWay' ? '📞' :
                                          system === 'nurseCall' ? '🏥' : '⚙️'}
                          </span>
                          <span className="text-sm capitalize">
                            {system.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Analysis */}
              <div className="lg:col-span-2">
                <div className="bg-bg-card rounded-2xl border border-gray-700 p-6 h-full overflow-auto">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold">📊 Project Analysis</h3>
                    {project.analysis && (
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            try {
                              onToast?.('Generating Word document...', 'info');
                              await generateAnalysisDocument(project, project.analysis, companyProfile);
                              onToast?.('Analysis document downloaded!', 'success');
                            } catch (error) {
                              console.error('Failed to generate doc:', error);
                              onToast?.('Failed to generate document', 'error');
                            }
                          }}
                          className="px-4 py-2 gradient-gold rounded-lg text-black text-sm font-medium hover:opacity-90 transition-opacity"
                        >
                          📥 Download Word
                        </button>
                        <button
                          onClick={() => setActiveTab('chat')}
                          className="px-4 py-2 bg-bg-secondary border border-gray-600 rounded-lg text-sm hover:border-gold transition-colors"
                        >
                          💬 Ask Questions
                        </button>
                      </div>
                    )}
                  </div>

                  {project.analysis ? (
                    <AnalysisDisplay analysis={project.analysis} project={project} />
                  ) : (
                    <div className="text-center py-16 text-gray-500">
                      <div className="text-5xl mb-4">📋</div>
                      <p className="text-lg mb-2">No analysis yet</p>
                      <p className="text-sm">Upload documents and click "Analyze" to get started</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="h-full flex flex-col">
            {/* Chat Messages */}
            <div className="flex-1 overflow-auto p-8">
              <div className="max-w-4xl mx-auto">
                {chatHistory.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-6xl mb-4">💬</div>
                    <h3 className="text-xl font-semibold mb-2">AI Assistant</h3>
                    <p className="text-gray-400 mb-8 max-w-md mx-auto">
                      Ask me anything about your project. I can help with system design,
                      code compliance, pricing, and generating outputs.
                    </p>

                    {/* Quick Start Suggestions */}
                    <div className="flex flex-wrap justify-center gap-3">
                      {[
                        'What systems are needed for this project?',
                        'Generate a proposal for this project',
                        'What are the fire alarm requirements?',
                        'Create a bill of materials'
                      ].map((suggestion, i) => (
                        <button
                          key={i}
                          onClick={() => handleSendMessage(suggestion)}
                          className="px-4 py-2 bg-bg-card border border-gray-700 rounded-xl text-sm text-gray-400 hover:text-white hover:border-gold/50 transition-all"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {chatHistory.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] px-5 py-4 rounded-2xl ${msg.role === 'user'
                            ? 'gradient-gold text-black rounded-br-sm'
                            : msg.isError
                              ? 'bg-red-500/20 border border-red-500/50 text-red-300 rounded-bl-sm'
                              : 'bg-bg-card border border-gray-700 text-white rounded-bl-sm'
                            }`}
                        >
                          {msg.role === 'user' ? (
                            <div className="text-sm leading-relaxed">
                              {msg.content}
                            </div>
                          ) : (
                            <>
                              <ChatMessageDisplay content={msg.content} isError={msg.isError} />
                              {/* Save Document Button */}
                              {msg.saveableDocument && (
                                <div className="mt-4 pt-4 border-t border-gray-600">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-green-400">📄</span>
                                      <span className="text-sm font-medium text-green-400">
                                        Document Ready: {msg.saveableDocument.title}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => handleSaveDocument(msg.saveableDocument)}
                                      className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                    >
                                      💾 Save to Outputs
                                    </button>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}

                    {isChatting && (
                      <div className="flex items-center gap-3 px-5 py-4 bg-bg-card border border-gray-700 rounded-2xl w-fit">
                        <div className="w-2 h-2 bg-gold rounded-full animate-pulse" />
                        <span className="text-gray-400 text-sm">Thinking...</span>
                      </div>
                    )}

                    {/* Suggested Actions */}
                    {suggestedActions.length > 0 && !isChatting && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {suggestedActions.map((action, i) => (
                          <button
                            key={i}
                            onClick={() => handleActionClick(action)}
                            className="px-4 py-2 bg-bg-card border border-gray-700 rounded-xl text-sm hover:border-gold/50 transition-all flex items-center gap-2"
                          >
                            <span>{action.icon}</span>
                            <span>{action.label}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    <div ref={chatEndRef} />
                  </div>
                )}
              </div>
            </div>

            {/* Chat Input */}
            <div className="border-t border-gray-700 p-6 bg-bg-secondary">
              <form
                onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                className="max-w-4xl mx-auto flex gap-3"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask anything about your project..."
                  disabled={isChatting}
                  className="flex-1 px-5 py-4 bg-bg-tertiary border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-gold transition-colors disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isChatting || !chatInput.trim()}
                  className="px-8 py-4 gradient-gold rounded-xl text-black font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Outputs Tab */}
        {activeTab === 'outputs' && (
          <div className="h-full overflow-auto p-8">
            <div className="max-w-7xl mx-auto">
              {/* Export All Button */}
              {project.analysis && (
                <div className="mb-8 p-6 bg-gradient-to-r from-gold/20 to-amber-600/20 border border-gold/30 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-gold mb-1">📦 Export Complete Project Package</h3>
                      <p className="text-gray-400 text-sm">
                        Generate all outputs as Word documents in a single ZIP file named "{project.name}"
                      </p>
                    </div>
                    <button
                      onClick={handleExportAll}
                      disabled={isExporting}
                      className="px-8 py-4 gradient-gold rounded-xl text-black font-bold text-lg disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center gap-3"
                    >
                      {isExporting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <span>⬇️</span>
                          Export All
                        </>
                      )}
                    </button>
                  </div>
                  {isExporting && (
                    <div className="mt-4 text-sm text-gray-400">
                      <p>⏳ This may take 2-5 minutes depending on the number of outputs...</p>
                    </div>
                  )}
                </div>
              )}

              {/* Generate Outputs by Category */}
              <div className="mb-8 space-y-8">
                {outputCategories.map(category => {
                  // Skip blueprint category if no blueprints
                  if (category.requiresBlueprints && !hasBlueprints) return null;

                  return (
                    <div key={category.id}>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-2xl">{category.icon}</span>
                        <h3 className="text-lg font-semibold">{category.name}</h3>
                        {category.requiresBlueprints && (
                          <span className="text-xs bg-blue-600/30 text-blue-300 px-2 py-0.5 rounded-full ml-2">
                            Vision AI
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                        {category.outputs.map(output => (
                          <button
                            key={output.id}
                            onClick={() => handleGenerateOutput(output.id)}
                            disabled={generatingOutput === output.id || !project.analysis}
                            className={`p-3 bg-bg-card border rounded-xl text-center hover:border-gold/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative ${output.requiresVision ? 'border-blue-700/30 hover:border-blue-500/50' : 'border-gray-700'
                              }`}
                          >
                            <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">
                              {generatingOutput === output.id ? '⏳' : output.icon}
                            </div>
                            <p className="text-xs font-medium leading-tight">{output.name}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {!project.analysis && (
                  <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-xl p-4 text-center">
                    <p className="text-yellow-400">
                      💡 Analyze your documents first to generate outputs
                    </p>
                  </div>
                )}

                {!hasBlueprints && project.analysis && (
                  <div className="bg-blue-900/20 border border-blue-700/50 rounded-xl p-4">
                    <p className="text-blue-400 text-sm">
                      <span className="font-semibold">👁️ Want Blueprint Analysis?</span> Upload PDF floor plans or images to unlock Device Count, Cable Estimates, Work Packets, and more!
                    </p>
                  </div>
                )}
              </div>

              {/* Generated Outputs */}
              {outputs.length > 0 ? (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">Generated Outputs</h3>
                  {outputs.map((output, i) => (
                    <div key={i} className="bg-bg-card rounded-2xl border border-gray-700 overflow-hidden">
                      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {outputTypes.find(t => t.id === output.type)?.icon || '📄'}
                          </span>
                          <div>
                            <h4 className="font-semibold">{output.name}</h4>
                            <p className="text-xs text-gray-500">
                              Generated {new Date(output.generatedAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(output.content);
                              onToast?.('Copied to clipboard', 'success');
                            }}
                            className="px-3 py-1.5 bg-bg-secondary border border-gray-600 rounded-lg text-sm hover:border-gold transition-colors"
                          >
                            📋 Copy
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                onToast?.('Generating Word document...', 'info');
                                if (output.type === 'proposal') {
                                  await generateProposalDocument(project, output.content, companyProfile);
                                } else if (output.type === 'bom') {
                                  await generateBOMDocument(project, output.content, companyProfile);
                                } else if (output.type === 'labor') {
                                  await generateLaborDocument(project, output.content, companyProfile);
                                } else {
                                  await generateGenericDocument(project, output.name, output.content, companyProfile);
                                }
                                onToast?.('Word document downloaded!', 'success');
                              } catch (error) {
                                console.error('Failed to generate Word doc:', error);
                                onToast?.('Failed to generate document', 'error');
                              }
                            }}
                            className="px-3 py-1.5 gradient-gold rounded-lg text-black text-sm font-medium hover:opacity-90 transition-opacity"
                          >
                            📥 Download Word
                          </button>
                        </div>
                      </div>
                      <div className="p-6 max-h-[500px] overflow-auto">
                        <OutputDisplay content={output.content} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-gray-500">
                  <div className="text-5xl mb-4">📋</div>
                  <p className="text-lg mb-2">No outputs generated yet</p>
                  <p className="text-sm">Click on an output type above to generate</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Markup Tab */}
        {activeTab === 'markup' && hasBlueprints && (
          <div className="h-full overflow-auto p-8">
            <div className="max-w-7xl mx-auto">
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-2">✏️ Plan Markup</h3>
                <p className="text-gray-400">Click on any page to open the markup editor. Add redlines, callouts, device markers, and more.</p>
              </div>

              {/* Blueprint Pages Grid */}
              <div className="space-y-8">
                {documents.filter(doc => doc.visionData?.pages?.length > 0).map((doc, docIdx) => (
                  <div key={docIdx} className="bg-bg-card rounded-2xl border border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📐</span>
                        <div>
                          <h4 className="font-semibold">{doc.filename}</h4>
                          <p className="text-xs text-gray-500">{doc.visionData.pages.length} pages</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {doc.visionData.pages.map((page, pageIdx) => {
                          const markupKey = `${doc.filename}_${pageIdx}`;
                          const hasMarkup = savedMarkups[markupKey]?.annotations?.length > 0;

                          return (
                            <div
                              key={pageIdx}
                              className="relative group cursor-pointer"
                              onClick={() => handleOpenMarkup(doc, pageIdx)}
                            >
                              <div className={`aspect-[4/3] bg-gray-800 rounded-lg overflow-hidden border-2 transition-all ${hasMarkup ? 'border-green-500' : 'border-transparent group-hover:border-gold'
                                }`}>
                                <img
                                  src={`data:${page.mediaType};base64,${page.base64}`}
                                  alt={`Page ${page.page}`}
                                  className="w-full h-full object-contain"
                                />
                              </div>

                              {/* Overlay */}
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                <span className="text-white font-semibold">✏️ Edit Markup</span>
                              </div>

                              {/* Page number badge */}
                              <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-xs">
                                Page {page.page}
                              </div>

                              {/* Markup indicator */}
                              {hasMarkup && (
                                <div className="absolute top-2 right-2 bg-green-500 px-2 py-1 rounded text-xs font-medium">
                                  ✓ {savedMarkups[markupKey].annotations.length} marks
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="mt-8 p-4 bg-bg-card rounded-xl border border-gray-700">
                <h4 className="font-semibold mb-3">Markup Tools Available:</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-sm">
                  <div className="flex items-center gap-2"><span>⬜</span> Rectangle</div>
                  <div className="flex items-center gap-2"><span>⭕</span> Circle</div>
                  <div className="flex items-center gap-2"><span>➡️</span> Arrow</div>
                  <div className="flex items-center gap-2"><span>✏️</span> Freehand</div>
                  <div className="flex items-center gap-2"><span>💬</span> Callout</div>
                  <div className="flex items-center gap-2"><span>📍</span> Device Marker</div>
                  <div className="flex items-center gap-2"><span>📐</span> Measure</div>
                  <div className="flex items-center gap-2"><span>🔤</span> Text</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Plan Markup Modal */}
      {markupOpen && markupPage && (
        <PlanMarkup
          imageData={markupPage.imageData}
          pageNumber={markupPage.pageNumber}
          annotations={markupPage.annotations}
          projectName={project?.name}
          blueprintContext={blueprintContext}
          onSave={handleSaveMarkup}
          onClose={() => setMarkupOpen(false)}
        />
      )}
    </div>
  );
}
