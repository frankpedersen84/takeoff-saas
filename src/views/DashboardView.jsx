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


  // ... existing DashboardView logic ...

  // -- Simple Mode Wizard Components --

  const WizardCard = ({ step, title, icon, description, onClick, isActive, isCompleted }) => (
    <div
      onClick={onClick}
      className={`relative p-8 rounded-2xl border transition-all duration-300 cursor-pointer group hover:-translate-y-1 ${isActive
        ? 'bg-gradient-to-br from-level-2 to-level-1 border-gold shadow-lg shadow-gold/10'
        : 'bg-level-2 border-gray-700 hover:border-gray-500'
        }`}
    >
      {isCompleted && (
        <div className="absolute top-4 right-4 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-black text-xs font-bold">
          ✓
        </div>
      )}
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl mb-6 ${isActive ? 'bg-gold text-black' : 'bg-gray-800 text-gray-400 group-hover:bg-gray-700'
        }`}>
        {icon}
      </div>
      <div className="text-sm font-semibold text-gold mb-2 uppercase tracking-wider">Step 0{step}</div>
      <h3 className={`text-xl font-bold mb-2 ${isActive ? 'text-white' : 'text-gray-300'}`}>{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
    </div>
  );

  const renderSimpleMode = () => (
    <div className="max-w-5xl mx-auto py-12">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
          Start Your Estimation
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          TakeOff Pro uses AI to read your blueprints and specs. Follow these three steps to generate a complete bid package.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <WizardCard
          step={1}
          title="Project Setup"
          icon="📁"
          description="Create a new project profile or import details from your CRM/Email."
          isActive={!projectInfo.name}
          isCompleted={!!projectInfo.name}
          onClick={() => onNavigate('projects')} // Or a dedicated modal
        />
        <WizardCard
          step={2}
          title="Upload & Analyze"
          icon="🧠"
          description="Upload blueprints (PDF) and spec books. Our AI will extract scope and counts."
          isActive={!!projectInfo.name && activeAgents.length === 0}
          isCompleted={activeAgents.length > 0}
          onClick={() => onNavigate('home')} // Home is the upload/process view
        />
        <WizardCard
          step={3}
          title="Review & Export"
          icon="📋"
          description="Review the generated Bill of Materials and export your formal proposal."
          isActive={activeAgents.length > 0}
          isCompleted={false}
          onClick={() => { }} // Already on dashboard
        />
      </div>

      {/* Quick Actions for Simple Mode */}
      {activeAgents.length > 0 && (
        <div className="mt-16 border-t border-gray-800 pt-10">
          <h2 className="text-2xl font-bold mb-8 text-center">Ready for Review</h2>
          <div className="grid grid-cols-2 gap-6 max-w-2xl mx-auto">
            <button
              onClick={handleGenerateProposal}
              className="p-6 bg-gold rounded-xl hover:bg-yellow-500 transition-colors flex flex-col items-center justify-center text-black shadow-lg shadow-gold/20"
            >
              <span className="text-3xl mb-3">📄</span>
              <span className="text-lg font-bold">Generate Proposal</span>
              <span className="text-sm opacity-80 mt-1">PDF Client Brochure</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="p-6 bg-level-2 border border-gray-700 rounded-xl hover:bg-level-3 transition-colors flex flex-col items-center justify-center text-white"
            >
              <span className="text-3xl mb-3">📊</span>
              <span className="text-lg font-bold">Export Excel</span>
              <span className="text-sm opacity-60 mt-1">Detailed BOM & Labor</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="pt-6 px-10 pb-10">
      {!projectInfo.name && !projectInfo.isExample && isAdvancedMode === false ? (
        // Empty State for Simple Mode
        renderSimpleMode()
      ) : isAdvancedMode ? (
        // Advanced Dashboard (Original View)
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
                  className="px-6 py-3 bg-level-2 border border-gray-700 rounded-lg text-white text-sm font-medium flex items-center gap-2 hover:bg-level-3 transition-colors"
                >
                  📊 Export ▾
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-level-2 border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
                    {/* ... export menu items ... */}
                    <div className="p-2 border-b border-gray-700">
                      <span className="text-xs text-gray-500 px-3">SPREADSHEET EXPORTS</span>
                    </div>
                    <button onClick={handleExportExcel} className="w-full px-4 py-3 text-left text-sm hover:bg-level-3 flex items-center gap-3">
                      <span>📊</span> Project Summary
                    </button>
                    <button onClick={handleExportBOM} className="w-full px-4 py-3 text-left text-sm hover:bg-level-3 flex items-center gap-3">
                      <span>📦</span> Bill of Materials (BOM)
                    </button>
                    {/* ... other exports ... */}
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

          {/* Project Stats Summary */}
          <div className="grid grid-cols-4 gap-5 mb-8">
            {summaryCards.map((card, i) => (
              <div key={i} className="bg-level-2 rounded-2xl p-6 border border-gray-700">
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

          {/* Systems Grid for Advanced Mode */}
          <h2 className="text-xl font-semibold mb-4">System Details</h2>
          <div className="grid grid-cols-2 gap-5">
            {activeAgents.map(agentId => (
              // ... existing card ...
              <div key={agentId} className="bg-level-2 rounded-2xl p-6 border border-gray-700">
                {/* ... content ... */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl bg-gray-800">
                    {agents[agentId]?.icon || '🔧'}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">{agents[agentId]?.name || agentId}</h3>
                    <p className="text-xs text-gray-500">Active</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 p-4 bg-level-1 rounded-xl mb-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Devices</div>
                    <div className="text-lg font-semibold">{systemEstimates[agentId]?.devices || 0}</div>
                  </div>
                  {/* ... */}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Default Simple Mode View if we have data
        renderSimpleMode()
      )}

      {/* Proposal Modal - Same for both */}
      {showProposalModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[2000] p-8">
          {/* ... existing modal ... */}
          <div className="bg-level-2 rounded-2xl w-full max-w-4xl p-6 border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Proposal Preview</h2>
              <button onClick={() => setShowProposalModal(false)}>Close</button>
            </div>
            <pre className="whitespace-pre-wrap text-sm text-gray-300 max-h-[60vh] overflow-auto">
              {proposalContent}
            </pre>
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
