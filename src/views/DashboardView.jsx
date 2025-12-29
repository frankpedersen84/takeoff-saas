import React, { useState, useMemo } from 'react';
import { api } from '../services/api';

// Sample device data for realistic exports
const DEVICE_CATALOG = {
  fireAlarm: [
    { partNumber: 'SIGA-PS', description: 'Intelligent Photoelectric Smoke Detector', unit: 'EA', unitCost: 125, laborHrs: 0.5 },
    { partNumber: 'SIGA-HRS', description: 'Intelligent Heat Detector', unit: 'EA', unitCost: 95, laborHrs: 0.5 },
    { partNumber: 'BG-12LX', description: 'Addressable Manual Pull Station', unit: 'EA', unitCost: 185, laborHrs: 0.75 },
    { partNumber: 'G4RF-S7VM', description: 'Wall Mount Horn/Strobe 15/75cd', unit: 'EA', unitCost: 145, laborHrs: 0.75 },
    { partNumber: 'SIGA-CT1', description: 'Single Input Module', unit: 'EA', unitCost: 85, laborHrs: 0.5 },
    { partNumber: 'SIGA-CR', description: 'Control Relay Module', unit: 'EA', unitCost: 95, laborHrs: 0.5 },
    { partNumber: 'EST3X-2DSP', description: 'Fire Alarm Control Panel 2-Loop', unit: 'EA', unitCost: 8500, laborHrs: 24 },
    { partNumber: 'SIGA-DH', description: 'Duct Smoke Detector Housing', unit: 'EA', unitCost: 245, laborHrs: 1.5 },
  ],
  dataCabling: [
    { partNumber: 'CAT6A-PL-BL', description: 'Cat6A Plenum Cable Blue 1000ft', unit: 'BX', unitCost: 485, laborHrs: 0 },
    { partNumber: 'CAT6A-RJ45', description: 'Cat6A RJ45 Jack - White', unit: 'EA', unitCost: 18, laborHrs: 0.15 },
    { partNumber: 'PP-48-6A', description: '48-Port Cat6A Patch Panel', unit: 'EA', unitCost: 385, laborHrs: 2 },
    { partNumber: 'WP-2G-WH', description: '2-Gang Wall Plate - White', unit: 'EA', unitCost: 4.50, laborHrs: 0.1 },
    { partNumber: 'RACK-42U', description: '42U Server Rack Enclosure', unit: 'EA', unitCost: 1850, laborHrs: 8 },
    { partNumber: 'OM4-LC-12', description: 'OM4 Fiber 12-Strand LC 100m', unit: 'EA', unitCost: 425, laborHrs: 4 },
    { partNumber: 'WAP-AX-PRO', description: 'WiFi 6E Access Point', unit: 'EA', unitCost: 695, laborHrs: 1.5 },
  ],
  cctv: [
    { partNumber: 'DS-2CD2386G2', description: '8MP AcuSense Turret Camera', unit: 'EA', unitCost: 385, laborHrs: 1.5 },
    { partNumber: 'DS-2CD2T87G2', description: '8MP Bullet Camera w/IR', unit: 'EA', unitCost: 425, laborHrs: 2 },
    { partNumber: 'DS-2DE4A425IW', description: '4MP 25x PTZ Camera', unit: 'EA', unitCost: 1250, laborHrs: 3 },
    { partNumber: 'DS-9664NI-M8', description: '64-Ch NVR 8-Bay RAID', unit: 'EA', unitCost: 4500, laborHrs: 8 },
    { partNumber: 'WD-PURPLE-8T', description: '8TB Surveillance HDD', unit: 'EA', unitCost: 185, laborHrs: 0.25 },
    { partNumber: 'POE-SW-24', description: '24-Port PoE+ Switch 400W', unit: 'EA', unitCost: 650, laborHrs: 2 },
  ],
  accessControl: [
    { partNumber: 'R40-OSDP', description: 'iCLASS SE R40 Reader OSDP', unit: 'EA', unitCost: 285, laborHrs: 1 },
    { partNumber: 'RP40-MULTI', description: 'multiCLASS SE RP40 Reader', unit: 'EA', unitCost: 245, laborHrs: 1 },
    { partNumber: 'LP-4502', description: '4-Door IP Controller', unit: 'EA', unitCost: 1450, laborHrs: 4 },
    { partNumber: 'PS-12-5A', description: '12VDC 5A Power Supply', unit: 'EA', unitCost: 125, laborHrs: 1 },
    { partNumber: 'ES-1500', description: 'Electric Strike 12/24V', unit: 'EA', unitCost: 185, laborHrs: 2 },
    { partNumber: 'MAG-1200', description: '1200lb Magnetic Lock', unit: 'EA', unitCost: 225, laborHrs: 2 },
    { partNumber: 'REX-PIR', description: 'Request to Exit PIR Sensor', unit: 'EA', unitCost: 65, laborHrs: 0.5 },
    { partNumber: 'DPS-RECESSED', description: 'Recessed Door Position Switch', unit: 'EA', unitCost: 28, laborHrs: 0.5 },
  ],
};

const CABLE_TYPES = {
  fireAlarm: [
    { type: 'FPLP 14/2', description: '14 AWG 2-Conductor Fire Alarm Plenum', costPer1000: 285, application: 'NAC Circuits' },
    { type: 'FPLP 18/2', description: '18 AWG 2-Conductor Fire Alarm Plenum', costPer1000: 195, application: 'SLC Loops' },
    { type: 'FPLP 18/4', description: '18 AWG 4-Conductor Fire Alarm Plenum', costPer1000: 285, application: 'Addressable Devices' },
    { type: 'FPLP 16/2', description: '16 AWG 2-Conductor Fire Alarm Plenum', costPer1000: 225, application: 'Power Limited' },
  ],
  dataCabling: [
    { type: 'CAT6A-PL', description: 'Category 6A Plenum 23AWG', costPer1000: 485, application: 'Horizontal Runs' },
    { type: 'CAT6-PL', description: 'Category 6 Plenum 23AWG', costPer1000: 325, application: 'Horizontal Runs' },
    { type: 'OM4-12', description: 'OM4 Multimode 12-Strand', costPer1000: 1850, application: 'Backbone' },
    { type: 'OS2-12', description: 'OS2 Singlemode 12-Strand', costPer1000: 1450, application: 'Backbone' },
  ],
  cctv: [
    { type: 'CAT6-OUT', description: 'Category 6 Outdoor Direct Burial', costPer1000: 425, application: 'Exterior Cameras' },
    { type: 'CAT6A-PL', description: 'Category 6A Plenum', costPer1000: 485, application: 'Interior Cameras' },
    { type: 'RG6-PL', description: 'RG6 Plenum Coax', costPer1000: 195, application: 'Analog/HD-TVI' },
  ],
  accessControl: [
    { type: '22/6-SH', description: '22 AWG 6-Conductor Shielded', costPer1000: 285, application: 'Reader Cables' },
    { type: '18/2', description: '18 AWG 2-Conductor', costPer1000: 145, application: 'Lock Power' },
    { type: '22/4', description: '22 AWG 4-Conductor', costPer1000: 165, application: 'Door Contacts/REX' },
    { type: 'CAT6-PL', description: 'Category 6 Plenum', costPer1000: 325, application: 'IP Controllers' },
  ],
};

export default function DashboardView({ 
  projectInfo, 
  projectData, 
  activeAgents, 
  agentOutputs, 
  agents,
  onNavigate 
}) {
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false);
  const [proposalContent, setProposalContent] = useState(null);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiOutputContent, setAiOutputContent] = useState(null);
  const [aiOutputTitle, setAiOutputTitle] = useState('');
  const [showAiOutputModal, setShowAiOutputModal] = useState(false);

  // Generate consistent device quantities based on agent ID
  const systemEstimates = useMemo(() => {
    const estimates = {};
    activeAgents.forEach(agentId => {
      const seed = agentId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      const devices = DEVICE_CATALOG[agentId] || [];
      const cables = CABLE_TYPES[agentId] || [];
      
      // Generate quantities for each device
      const deviceList = devices.map((device, i) => ({
        ...device,
        quantity: Math.max(1, Math.floor((seed * (i + 1) * 7) % 25) + (device.unitCost > 1000 ? 1 : 5)),
      }));

      // Generate cable quantities (in feet)
      const cableList = cables.map((cable, i) => ({
        ...cable,
        footage: Math.floor((seed * (i + 1) * 137) % 5000) + 500,
      }));

      const materialTotal = deviceList.reduce((sum, d) => sum + (d.quantity * d.unitCost), 0) +
                           cableList.reduce((sum, c) => sum + (c.footage / 1000 * c.costPer1000), 0);
      const laborTotal = deviceList.reduce((sum, d) => sum + (d.quantity * d.laborHrs), 0);

      estimates[agentId] = {
        devices: deviceList.reduce((sum, d) => sum + d.quantity, 0),
        material: Math.round(materialTotal),
        hours: Math.round(laborTotal),
        deviceList,
        cableList,
      };
    });
    return estimates;
  }, [activeAgents]);

  // Calculate totals
  const totals = useMemo(() => {
    const materialCost = Object.values(systemEstimates).reduce((sum, e) => sum + e.material, 0);
    const laborHours = Object.values(systemEstimates).reduce((sum, e) => sum + e.hours, 0);
    const laborCost = laborHours * 95; // $95/hr average
    return {
      materialCost,
      laborHours,
      laborCost,
      total: materialCost + laborCost
    };
  }, [systemEstimates]);

  const summaryCards = [
    { label: 'Total Systems', value: activeAgents.length, icon: '🔧', color: 'var(--gold)' },
    { label: 'Material Cost', value: `$${totals.materialCost.toLocaleString()}`, icon: '📦', color: 'var(--teal)' },
    { label: 'Labor Hours', value: totals.laborHours.toLocaleString(), icon: '⏱️', color: '#10B981' },
    { label: 'Project Total', value: `$${totals.total.toLocaleString()}`, icon: '💰', color: '#EC4899' }
  ];

  // Export to Excel (CSV format for simplicity - opens in Excel)
  const handleExportExcel = () => {
    const rows = [
      ['TakeoffAI Project Export'],
      [''],
      ['Project Information'],
      ['Project Name', projectInfo.name || 'N/A'],
      ['Customer', projectInfo.customer || 'N/A'],
      ['Location', `${projectInfo.address || ''} ${projectInfo.city || ''}`],
      ['Due Date', projectInfo.dueDate || 'N/A'],
      [''],
      ['Summary'],
      ['Total Systems', activeAgents.length],
      ['Material Cost', `$${totals.materialCost.toLocaleString()}`],
      ['Labor Hours', totals.laborHours],
      ['Labor Cost', `$${totals.laborCost.toLocaleString()}`],
      ['Project Total', `$${totals.total.toLocaleString()}`],
      [''],
      ['System Breakdown'],
      ['System', 'Devices', 'Material Cost', 'Labor Hours', 'Labor Cost', 'System Total']
    ];

    activeAgents.forEach(agentId => {
      const agent = agents[agentId];
      const est = systemEstimates[agentId];
      if (agent && est) {
        const laborCost = est.hours * 95;
        rows.push([
          agent.name,
          est.devices,
          `$${est.material.toLocaleString()}`,
          est.hours,
          `$${laborCost.toLocaleString()}`,
          `$${(est.material + laborCost).toLocaleString()}`
        ]);
      }
    });

    // Add analysis if available
    if (projectData?.analysis) {
      rows.push(['']);
      rows.push(['Project Analysis']);
      rows.push([projectData.analysis.substring(0, 5000)]);
    }

    // Convert to CSV
    const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectInfo.name || 'TakeoffAI'}_Export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Generate Proposal using AI
  const handleGenerateProposal = async () => {
    setIsGeneratingProposal(true);
    try {
      const systemsList = activeAgents.map(id => {
        const agent = agents[id];
        const est = systemEstimates[id];
        return `- ${agent?.name}: ${est?.devices} devices, $${est?.material.toLocaleString()} material, ${est?.hours} labor hours`;
      }).join('\n');

      const response = await api.chatWithAgent({
        agentId: 'proposal',
        message: `Generate a professional proposal for the following project:

PROJECT: ${projectInfo.name || 'Low-Voltage Systems Project'}
CUSTOMER: ${projectInfo.customer || 'Client'}
LOCATION: ${projectInfo.address || ''} ${projectInfo.city || ''}
DUE DATE: ${projectInfo.dueDate || 'TBD'}

SYSTEMS INCLUDED:
${systemsList}

TOTALS:
- Material Cost: $${totals.materialCost.toLocaleString()}
- Labor Hours: ${totals.laborHours}
- Labor Cost: $${totals.laborCost.toLocaleString()}
- Project Total: $${totals.total.toLocaleString()}

${projectData?.analysis ? `\nPROJECT ANALYSIS:\n${projectData.analysis.substring(0, 2000)}` : ''}

Please generate a complete, professional proposal including:
1. Cover letter/introduction
2. Scope of work for each system
3. Pricing summary
4. Standard terms, clarifications, and exclusions
5. Warranty information`,
        conversationHistory: []
      });

      setProposalContent(response.message);
      setShowProposalModal(true);
    } catch (error) {
      console.error('Proposal generation error:', error);
      alert('Failed to generate proposal: ' + (error.message || 'Unknown error'));
    } finally {
      setIsGeneratingProposal(false);
    }
  };

  // Download proposal as text file
  const handleDownloadProposal = () => {
    if (!proposalContent) return;
    const blob = new Blob([proposalContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectInfo.name || 'TakeoffAI'}_Proposal_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Helper to download CSV
  const downloadCSV = (rows, filename) => {
    const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectInfo.name || 'TakeoffAI'}_${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export Detailed Bill of Materials
  const handleExportBOM = () => {
    const rows = [
      ['BILL OF MATERIALS'],
      ['Project:', projectInfo.name || 'N/A'],
      ['Customer:', projectInfo.customer || 'N/A'],
      ['Date:', new Date().toLocaleDateString()],
      [''],
      ['Part Number', 'Description', 'System', 'Qty', 'Unit', 'Unit Cost', 'Extended Cost', 'Labor Hrs', 'Total Labor'],
    ];

    let grandTotalMaterial = 0;
    let grandTotalLabor = 0;

    activeAgents.forEach(agentId => {
      const agent = agents[agentId];
      const est = systemEstimates[agentId];
      if (!agent || !est) return;

      rows.push(['']);
      rows.push([`=== ${agent.name.toUpperCase()} ===`]);

      est.deviceList?.forEach(device => {
        const extended = device.quantity * device.unitCost;
        const laborTotal = device.quantity * device.laborHrs;
        grandTotalMaterial += extended;
        grandTotalLabor += laborTotal;
        rows.push([
          device.partNumber,
          device.description,
          agent.name,
          device.quantity,
          device.unit,
          `$${device.unitCost.toFixed(2)}`,
          `$${extended.toFixed(2)}`,
          device.laborHrs,
          laborTotal.toFixed(1)
        ]);
      });
    });

    rows.push(['']);
    rows.push(['', '', '', '', '', 'MATERIAL TOTAL:', `$${grandTotalMaterial.toLocaleString()}`, 'LABOR TOTAL:', grandTotalLabor.toFixed(1)]);

    downloadCSV(rows, 'BOM');
    setShowExportMenu(false);
  };

  // Export Cable Schedule
  const handleExportCableSchedule = () => {
    const rows = [
      ['CABLE SCHEDULE'],
      ['Project:', projectInfo.name || 'N/A'],
      ['Customer:', projectInfo.customer || 'N/A'],
      ['Date:', new Date().toLocaleDateString()],
      [''],
      ['Cable Type', 'Description', 'System', 'Application', 'Footage', 'Cost/1000ft', 'Extended Cost'],
    ];

    let grandTotal = 0;

    activeAgents.forEach(agentId => {
      const agent = agents[agentId];
      const est = systemEstimates[agentId];
      if (!agent || !est) return;

      rows.push(['']);
      rows.push([`=== ${agent.name.toUpperCase()} ===`]);

      est.cableList?.forEach(cable => {
        const extended = (cable.footage / 1000) * cable.costPer1000;
        grandTotal += extended;
        rows.push([
          cable.type,
          cable.description,
          agent.name,
          cable.application,
          cable.footage,
          `$${cable.costPer1000.toFixed(2)}`,
          `$${extended.toFixed(2)}`
        ]);
      });
    });

    rows.push(['']);
    rows.push(['', '', '', '', 'TOTAL FOOTAGE:', Object.values(systemEstimates).reduce((sum, e) => sum + (e.cableList?.reduce((s, c) => s + c.footage, 0) || 0), 0), `$${grandTotal.toFixed(2)}`]);

    downloadCSV(rows, 'CableSchedule');
    setShowExportMenu(false);
  };

  // Export Labor Schedule
  const handleExportLaborSchedule = () => {
    const laborRates = {
      'Project Manager': { rate: 110, tasks: ['Coordination', 'Submittals', 'Closeout'] },
      'Lead Technician': { rate: 105, tasks: ['Device Installation', 'Terminations', 'Testing'] },
      'Installer': { rate: 95, tasks: ['Cable Pulling', 'Device Mounting', 'Conduit'] },
      'Programmer': { rate: 115, tasks: ['System Programming', 'Graphics', 'Integration'] },
    };

    const rows = [
      ['LABOR SCHEDULE'],
      ['Project:', projectInfo.name || 'N/A'],
      ['Customer:', projectInfo.customer || 'N/A'],
      ['Date:', new Date().toLocaleDateString()],
      [''],
      ['System', 'Task Category', 'Role', 'Hours', 'Rate', 'Extended'],
    ];

    let grandTotalHours = 0;
    let grandTotalCost = 0;

    activeAgents.forEach(agentId => {
      const agent = agents[agentId];
      const est = systemEstimates[agentId];
      if (!agent || !est) return;

      const baseHours = est.hours || 0;
      rows.push(['']);
      rows.push([`=== ${agent.name.toUpperCase()} ===`]);

      // Distribute hours across roles
      const distribution = [
        { role: 'Project Manager', pct: 0.10 },
        { role: 'Lead Technician', pct: 0.35 },
        { role: 'Installer', pct: 0.45 },
        { role: 'Programmer', pct: 0.10 },
      ];

      distribution.forEach(({ role, pct }) => {
        const hours = Math.round(baseHours * pct);
        const rate = laborRates[role].rate;
        const extended = hours * rate;
        grandTotalHours += hours;
        grandTotalCost += extended;
        rows.push([
          agent.name,
          laborRates[role].tasks.join(', '),
          role,
          hours,
          `$${rate}/hr`,
          `$${extended.toLocaleString()}`
        ]);
      });
    });

    rows.push(['']);
    rows.push(['', '', 'TOTALS:', grandTotalHours, '', `$${grandTotalCost.toLocaleString()}`]);

    downloadCSV(rows, 'LaborSchedule');
    setShowExportMenu(false);
  };

  // Export Device Schedule (location-based)
  const handleExportDeviceSchedule = () => {
    const floors = ['1st Floor', '2nd Floor', '3rd Floor', 'Basement', 'Roof'];
    const areas = ['Lobby', 'Office Area', 'Conference Room', 'Corridor', 'Stairwell', 'Mechanical Room', 'Electrical Room'];

    const rows = [
      ['DEVICE SCHEDULE'],
      ['Project:', projectInfo.name || 'N/A'],
      ['Customer:', projectInfo.customer || 'N/A'],
      ['Date:', new Date().toLocaleDateString()],
      [''],
      ['Device ID', 'Part Number', 'Description', 'System', 'Floor', 'Area', 'Notes'],
    ];

    let deviceId = 1;

    activeAgents.forEach(agentId => {
      const agent = agents[agentId];
      const est = systemEstimates[agentId];
      if (!agent || !est) return;

      rows.push(['']);
      rows.push([`=== ${agent.name.toUpperCase()} ===`]);

      est.deviceList?.forEach(device => {
        for (let i = 0; i < device.quantity; i++) {
          const floor = floors[Math.floor((deviceId * 7) % floors.length)];
          const area = areas[Math.floor((deviceId * 13) % areas.length)];
          rows.push([
            `${agentId.substring(0, 2).toUpperCase()}-${String(deviceId).padStart(4, '0')}`,
            device.partNumber,
            device.description,
            agent.name,
            floor,
            area,
            ''
          ]);
          deviceId++;
        }
      });
    });

    downloadCSV(rows, 'DeviceSchedule');
    setShowExportMenu(false);
  };

  // Generate AI-powered detailed output
  const handleGenerateAIOutput = async (outputType) => {
    setIsGeneratingAI(true);
    setShowExportMenu(false);

    const systemsList = activeAgents.map(id => {
      const agent = agents[id];
      const est = systemEstimates[id];
      const deviceDetails = est?.deviceList?.map(d => `  - ${d.quantity}x ${d.description} (${d.partNumber})`).join('\n') || '';
      const cableDetails = est?.cableList?.map(c => `  - ${c.footage}ft ${c.description}`).join('\n') || '';
      return `${agent?.name}:\nDevices:\n${deviceDetails}\nCables:\n${cableDetails}`;
    }).join('\n\n');

    const prompts = {
      'riser': `Generate a detailed RISER DIAGRAM description for this low-voltage project. Include:
- Backbone cable runs between floors/TRs
- Conduit sizing recommendations
- Cable tray requirements
- Firestopping locations
- Grounding/bonding requirements`,
      'sequence': `Generate a SEQUENCE OF OPERATIONS document for this project. Include:
- System startup procedures
- Normal operation modes
- Alarm/event responses
- Integration sequences between systems
- Shutdown procedures`,
      'testing': `Generate a comprehensive TESTING & COMMISSIONING PLAN. Include:
- Pre-installation checks
- Point-to-point testing procedures
- Functional testing requirements
- Integration testing
- Acceptance criteria
- Documentation requirements`,
      'submittal': `Generate a SUBMITTAL PACKAGE outline. Include:
- Product data sheets required
- Shop drawings list
- Samples if applicable
- Manufacturer certifications
- Installer qualifications
- O&M manual requirements`,
    };

    const titles = {
      'riser': 'Riser Diagram Description',
      'sequence': 'Sequence of Operations',
      'testing': 'Testing & Commissioning Plan',
      'submittal': 'Submittal Package Outline',
    };

    try {
      const response = await api.chatWithAgent({
        agentId: 'orchestrator',
        message: `${prompts[outputType]}

PROJECT: ${projectInfo.name || 'Low-Voltage Systems Project'}
LOCATION: ${projectInfo.address || ''} ${projectInfo.city || ''}

SYSTEMS AND EQUIPMENT:
${systemsList}

${projectData?.analysis ? `\nPROJECT ANALYSIS:\n${projectData.analysis.substring(0, 1500)}` : ''}`,
        conversationHistory: []
      });

      setAiOutputTitle(titles[outputType]);
      setAiOutputContent(response.message);
      setShowAiOutputModal(true);
    } catch (error) {
      console.error('AI output generation error:', error);
      alert('Failed to generate output: ' + (error.message || 'Unknown error'));
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Download AI output
  const handleDownloadAIOutput = () => {
    if (!aiOutputContent) return;
    const blob = new Blob([aiOutputContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectInfo.name || 'TakeoffAI'}_${aiOutputTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="pt-[90px] px-10 pb-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {projectInfo.name || 'Project Dashboard'}
            </h1>
            <p className="text-gray-500">
              {projectInfo.city || 'Location'} • {projectInfo.customer || 'Customer'}
            </p>
          </div>
          <div className="flex gap-3">
            {/* Export Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-6 py-3 bg-bg-card border border-gray-700 rounded-lg text-white text-sm font-medium flex items-center gap-2 hover:bg-bg-tertiary transition-colors"
              >
                📊 Export ▾
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-bg-card border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="p-2 border-b border-gray-700">
                    <span className="text-xs text-gray-500 px-3">SPREADSHEET EXPORTS</span>
                  </div>
                  <button onClick={handleExportExcel} className="w-full px-4 py-3 text-left text-sm hover:bg-bg-tertiary flex items-center gap-3">
                    <span>📊</span> Project Summary
                  </button>
                  <button onClick={handleExportBOM} className="w-full px-4 py-3 text-left text-sm hover:bg-bg-tertiary flex items-center gap-3">
                    <span>📦</span> Bill of Materials (BOM)
                  </button>
                  <button onClick={handleExportCableSchedule} className="w-full px-4 py-3 text-left text-sm hover:bg-bg-tertiary flex items-center gap-3">
                    <span>🔌</span> Cable Schedule
                  </button>
                  <button onClick={handleExportLaborSchedule} className="w-full px-4 py-3 text-left text-sm hover:bg-bg-tertiary flex items-center gap-3">
                    <span>👷</span> Labor Schedule
                  </button>
                  <button onClick={handleExportDeviceSchedule} className="w-full px-4 py-3 text-left text-sm hover:bg-bg-tertiary flex items-center gap-3">
                    <span>📍</span> Device Schedule
                  </button>
                  
                  <div className="p-2 border-t border-b border-gray-700">
                    <span className="text-xs text-gray-500 px-3">AI-GENERATED DOCUMENTS</span>
                  </div>
                  <button onClick={() => handleGenerateAIOutput('riser')} disabled={isGeneratingAI} className="w-full px-4 py-3 text-left text-sm hover:bg-bg-tertiary flex items-center gap-3 disabled:opacity-50">
                    <span>📐</span> Riser Diagram Description
                  </button>
                  <button onClick={() => handleGenerateAIOutput('sequence')} disabled={isGeneratingAI} className="w-full px-4 py-3 text-left text-sm hover:bg-bg-tertiary flex items-center gap-3 disabled:opacity-50">
                    <span>⚙️</span> Sequence of Operations
                  </button>
                  <button onClick={() => handleGenerateAIOutput('testing')} disabled={isGeneratingAI} className="w-full px-4 py-3 text-left text-sm hover:bg-bg-tertiary flex items-center gap-3 disabled:opacity-50">
                    <span>✅</span> Testing & Commissioning
                  </button>
                  <button onClick={() => handleGenerateAIOutput('submittal')} disabled={isGeneratingAI} className="w-full px-4 py-3 text-left text-sm hover:bg-bg-tertiary flex items-center gap-3 disabled:opacity-50">
                    <span>📁</span> Submittal Package
                  </button>
                </div>
              )}
            </div>

            <button 
              onClick={handleGenerateProposal}
              disabled={isGeneratingProposal || isGeneratingAI}
              className="px-6 py-3 gradient-gold rounded-lg text-black text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isGeneratingProposal || isGeneratingAI ? '⏳ Generating...' : '📋 Generate Proposal'}
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-5 mb-8">
          {summaryCards.map((card, i) => (
            <div key={i} className="bg-bg-card rounded-2xl p-6 border border-gray-700">
              <div className="flex justify-between items-start mb-4">
                <span className="text-sm text-gray-500">{card.label}</span>
                <span className="text-2xl">{card.icon}</span>
              </div>
              <div className="text-3xl font-bold" style={{ color: card.color }}>
                {card.value}
              </div>
            </div>
          ))}
        </div>

        {/* Analysis Results */}
        {projectData?.analysis && (
          <div className="bg-bg-card rounded-2xl p-6 border border-gray-700 mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              🎯 Project Analysis
            </h2>
            <div className="prose prose-invert max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-gray-300 bg-bg-secondary p-4 rounded-lg overflow-auto max-h-96">
                {projectData.analysis}
              </pre>
            </div>
          </div>
        )}

        {/* Systems Grid */}
        <h2 className="text-xl font-semibold mb-4">System Takeoffs</h2>
        <div className="grid grid-cols-2 gap-5">
          {activeAgents.map(agentId => {
            const agent = agents[agentId];
            if (!agent) return null;

            return (
              <div key={agentId} className="bg-bg-card rounded-2xl p-6 border border-gray-700">
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                    style={{ backgroundColor: `${agent.color}22` }}
                  >
                    {agent.icon}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">{agent.name}</h3>
                    <p className="text-xs" style={{ color: agent.color }}>{agent.specialty}</p>
                  </div>
                  <div className="ml-auto px-3 py-1.5 bg-emerald-500/15 rounded-full text-xs text-emerald-400">
                    ✓ Complete
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 p-4 bg-bg-secondary rounded-xl mb-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Devices</div>
                    <div className="text-lg font-semibold">
                      {systemEstimates[agentId]?.devices || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Material</div>
                    <div className="text-lg font-semibold">
                      ${(systemEstimates[agentId]?.material || 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Hours</div>
                    <div className="text-lg font-semibold">
                      {systemEstimates[agentId]?.hours || 0}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onNavigate('chat', { agent: agentId })}
                  className="w-full py-3 bg-transparent border rounded-lg text-sm font-medium transition-all hover:bg-opacity-10"
                  style={{ 
                    borderColor: `${agent.color}44`, 
                    color: agent.color,
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = `${agent.color}11`}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  💬 Chat with Agent
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Proposal Modal */}
      {showProposalModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[2000] p-8">
          <div className="bg-bg-card rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-700">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold">📋 Generated Proposal</h2>
              <div className="flex gap-3">
                <button
                  onClick={handleDownloadProposal}
                  className="px-4 py-2 bg-teal border-none rounded-lg text-white text-sm font-medium hover:opacity-90"
                >
                  ⬇️ Download
                </button>
                <button
                  onClick={() => setShowProposalModal(false)}
                  className="px-4 py-2 bg-bg-tertiary border border-gray-600 rounded-lg text-gray-300 text-sm hover:bg-bg-secondary"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <pre className="whitespace-pre-wrap text-sm text-gray-300 leading-relaxed font-sans">
                {proposalContent}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* AI Output Modal */}
      {showAiOutputModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[2000] p-8">
          <div className="bg-bg-card rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-700">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold">📄 {aiOutputTitle}</h2>
              <div className="flex gap-3">
                <button
                  onClick={handleDownloadAIOutput}
                  className="px-4 py-2 bg-teal border-none rounded-lg text-white text-sm font-medium hover:opacity-90"
                >
                  ⬇️ Download
                </button>
                <button
                  onClick={() => setShowAiOutputModal(false)}
                  className="px-4 py-2 bg-bg-tertiary border border-gray-600 rounded-lg text-gray-300 text-sm hover:bg-bg-secondary"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <pre className="whitespace-pre-wrap text-sm text-gray-300 leading-relaxed font-sans">
                {aiOutputContent}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close export menu */}
      {showExportMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowExportMenu(false)}
        />
      )}
    </div>
  );
}
