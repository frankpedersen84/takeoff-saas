import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Image, Rect, Circle, Line, Text, Arrow, Group } from 'react-konva';
import useImage from 'use-image';
import { api } from '../services/api';

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

const TOOLS = {
  SELECT: 'select',
  PAN: 'pan',
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle',
  LINE: 'line',
  ARROW: 'arrow',
  FREEHAND: 'freehand',
  TEXT: 'text',
  CALLOUT: 'callout',
  DEVICE: 'device',
  MEASURE: 'measure',
  CALIBRATE: 'calibrate'
};

const SYSTEM_COLORS = {
  fire_alarm: '#EF4444',    // Red
  security: '#3B82F6',      // Blue
  access_control: '#10B981', // Green
  data: '#6366F1',          // Purple
  av: '#F59E0B',            // Orange
  nurse_call: '#EC4899',     // Pink
  unknown: '#6B7280'        // Gray
};

const DEVICE_TYPES = [
  { id: 'camera', system: 'security', icon: '📹', label: 'Camera', color: SYSTEM_COLORS.security },
  { id: 'smoke', system: 'fire_alarm', icon: '🔴', label: 'Smoke Detector', color: SYSTEM_COLORS.fire_alarm },
  { id: 'speaker', system: 'fire_alarm', icon: '🔊', label: 'Speaker/Strobe', color: SYSTEM_COLORS.av }, // Often AV/Fire mix
  { id: 'pull', system: 'fire_alarm', icon: '🚨', label: 'Pull Station', color: SYSTEM_COLORS.fire_alarm },
  { id: 'reader', system: 'access_control', icon: '🚪', label: 'Card Reader', color: SYSTEM_COLORS.access_control },
  { id: 'motion', system: 'security', icon: '👁️', label: 'Motion Sensor', color: SYSTEM_COLORS.security },
  { id: 'data', system: 'data', icon: '🔌', label: 'Data Outlet', color: SYSTEM_COLORS.data },
  { id: 'wap', system: 'data', icon: '📶', label: 'WAP', color: SYSTEM_COLORS.data },
  { id: 'panel', system: 'data', icon: '⬛', label: 'Panel/MDF', color: '#374151' },
];

const PlanImage = ({ src, onLoad }) => {
  const [image] = useImage(src, 'anonymous');
  useEffect(() => {
    if (image) onLoad?.(image.width, image.height);
  }, [image, onLoad]);
  return image ? <Image image={image} /> : null;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const PlanMarkup = ({
  imageData,
  pageNumber = 1,
  annotations: initialAnnotations = [],
  onSave,
  onClose,
  projectName = 'Project',
  blueprintContext = null
}) => {
  // Refs
  const containerRef = useRef(null);
  const stageRef = useRef(null);

  // Canvas State
  const [tool, setTool] = useState(TOOLS.SELECT);
  const [color, setColor] = useState('#EF4444');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [fontSize, setFontSize] = useState(16);
  const [annotations, setAnnotations] = useState(initialAnnotations);
  const [selectedId, setSelectedId] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [newAnnotation, setNewAnnotation] = useState(null);

  // Transform State
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 800, height: 600 });

  // Input State
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });

  // Calibration
  const [scaleCalibrated, setScaleCalibrated] = useState(false);
  const [pixelsPerFoot, setPixelsPerFoot] = useState(null);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationLine, setCalibrationLine] = useState(null);
  const [showCalibrationInput, setShowCalibrationInput] = useState(false);
  const [calibrationFeet, setCalibrationFeet] = useState('');

  // PREMIER FEATURES STATE
  const [visibleSystems, setVisibleSystems] = useState(new Set(['fire_alarm', 'security', 'access_control', 'data', 'av', 'unknown']));
  const [isAIAnalyzing, setIsAIAnalyzing] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(DEVICE_TYPES[0]);
  const [aiSummary, setAiSummary] = useState(null);

  // Image Source
  const imageSrc = imageData?.startsWith('data:') ? imageData : `data:image/jpeg;base64,${imageData}`;

  // ==========================================================================
  // VIEWPORT HANDLERS
  // ==========================================================================

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleImageLoad = useCallback((width, height) => {
    setImageSize({ width, height });
    const scaleX = stageSize.width / width;
    const scaleY = stageSize.height / height;
    const newScale = Math.min(scaleX, scaleY, 1) * 0.9;
    setScale(newScale);
    setPosition({
      x: (stageSize.width - width * newScale) / 2,
      y: (stageSize.height - height * newScale) / 2
    });
  }, [stageSize]);

  const handleWheel = (e) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    const oldScale = scale;
    const pointer = stage.getPointerPosition();
    const mousePointTo = {
      x: (pointer.x - position.x) / oldScale,
      y: (pointer.y - position.y) / oldScale
    };
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = direction > 0 ? oldScale * 1.1 : oldScale / 1.1;
    const clampedScale = Math.max(0.1, Math.min(8, newScale));

    setScale(clampedScale);
    setPosition({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale
    });
  };

  // ==========================================================================
  // TOOL HANDLERS
  // ==========================================================================

  const generateId = () => `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const handleMouseDown = (e) => {
    if (tool === TOOLS.PAN) return; // Let draggable stage handle panning

    const stage = e.target.getStage();
    const pos = stage.getRelativePointerPosition();

    // Select Tool
    if (tool === TOOLS.SELECT) {
      const clickedOnEmpty = e.target === stage || e.target.className === 'Image';
      if (clickedOnEmpty) setSelectedId(null);
      return;
    }

    // Text Tools
    if (tool === TOOLS.TEXT || tool === TOOLS.CALLOUT) {
      setTextPosition({ x: pos.x, y: pos.y });
      setShowTextInput(true);
      return;
    }

    // Device Tool
    if (tool === TOOLS.DEVICE) {
      const newDevice = {
        id: generateId(),
        type: 'device',
        deviceType: selectedDevice.id,
        system: selectedDevice.system,
        x: pos.x,
        y: pos.y,
        icon: selectedDevice.icon,
        label: selectedDevice.label,
        color: selectedDevice.color,
        size: 30
      };
      setAnnotations([...annotations, newDevice]);
      return;
    }

    // Calibration
    if (tool === TOOLS.CALIBRATE) {
      setIsCalibrating(true);
      setCalibrationLine({ points: [pos.x, pos.y, pos.x, pos.y] });
      return;
    }

    // Drawing Shapes
    setIsDrawing(true);
    const baseAnn = { id: generateId(), type: tool, color, strokeWidth, x: pos.x, y: pos.y };

    if (tool === TOOLS.RECTANGLE) setNewAnnotation({ ...baseAnn, width: 0, height: 0 });
    else if (tool === TOOLS.CIRCLE) setNewAnnotation({ ...baseAnn, radius: 0 });
    else if (tool === TOOLS.LINE || tool === TOOLS.ARROW || tool === TOOLS.MEASURE) setNewAnnotation({ ...baseAnn, points: [pos.x, pos.y, pos.x, pos.y] });
    else if (tool === TOOLS.FREEHAND) setNewAnnotation({ ...baseAnn, points: [pos.x, pos.y] });
  };

  const handleMouseMove = (e) => {
    if (isCalibrating && calibrationLine) {
      const stage = e.target.getStage();
      const pos = stage.getRelativePointerPosition();
      setCalibrationLine({ points: [calibrationLine.points[0], calibrationLine.points[1], pos.x, pos.y] });
      return;
    }

    if (!isDrawing || !newAnnotation) return;
    const stage = e.target.getStage();
    const pos = stage.getRelativePointerPosition();

    if (tool === TOOLS.RECTANGLE) {
      setNewAnnotation({ ...newAnnotation, width: pos.x - newAnnotation.x, height: pos.y - newAnnotation.y });
    } else if (tool === TOOLS.CIRCLE) {
      const dx = pos.x - newAnnotation.x;
      const dy = pos.y - newAnnotation.y;
      setNewAnnotation({ ...newAnnotation, radius: Math.sqrt(dx * dx + dy * dy) });
    } else if (tool === TOOLS.LINE || tool === TOOLS.ARROW || tool === TOOLS.MEASURE) {
      setNewAnnotation({ ...newAnnotation, points: [newAnnotation.points[0], newAnnotation.points[1], pos.x, pos.y] });
    } else if (tool === TOOLS.FREEHAND) {
      setNewAnnotation({ ...newAnnotation, points: [...newAnnotation.points, pos.x, pos.y] });
    }
  };

  const handleMouseUp = () => {
    if (isCalibrating && calibrationLine) {
      if (calculateDistance(calibrationLine.points) > 5) setShowCalibrationInput(true);
      else setIsCalibrating(false);
      return;
    }

    if (isDrawing && newAnnotation) {
      // Minimum size check to avoid accidental clicks creating garbage
      const valid = (newAnnotation.width && Math.abs(newAnnotation.width) > 5) ||
        (newAnnotation.radius && newAnnotation.radius > 5) ||
        (newAnnotation.points && newAnnotation.points.length > 2);
      if (valid) setAnnotations([...annotations, newAnnotation]);
    }
    setIsDrawing(false);
    setNewAnnotation(null);
  };

  // ==========================================================================
  // LOGIC & UTILITIES
  // ==========================================================================

  const calculateDistance = (points) => {
    const dx = points[2] - points[0];
    const dy = points[3] - points[1];
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleCalibrationSubmit = () => {
    const feet = parseFloat(calibrationFeet);
    if (feet > 0 && calibrationLine) {
      const pixels = calculateDistance(calibrationLine.points);
      setPixelsPerFoot(pixels / feet);
      setScaleCalibrated(true);
      setShowCalibrationInput(false);
      setCalibrationLine(null);
      setTool(TOOLS.MEASURE);
    }
  };

  const formatMeasurement = (pixels) => {
    if (scaleCalibrated && pixelsPerFoot) {
      const feet = pixels / pixelsPerFoot;
      return `${Math.floor(feet)}' ${Math.round((feet % 1) * 12)}"`;
    }
    return `${Math.round(pixels)}px`;
  };

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      setAnnotations([...annotations, {
        id: generateId(),
        type: tool === TOOLS.CALLOUT ? 'callout' : 'text',
        x: textPosition.x,
        y: textPosition.y,
        text: textInput,
        color,
        fontSize,
        fontStyle: 'bold'
      }]);
    }
    setTextInput('');
    setShowTextInput(false);
  };

  // System Layer Toggle
  const toggleSystem = (systemId) => {
    const next = new Set(visibleSystems);
    if (next.has(systemId)) next.delete(systemId);
    else next.add(systemId);
    setVisibleSystems(next);
  };

  // ==========================================================================
  // AI MAGIC
  // ==========================================================================

  const handleAIMarkup = async () => {
    setIsAIAnalyzing(true);
    setAiSummary(null);
    try {
      const result = await api.autoMarkup({
        imageData: imageData,
        pageNumber,
        projectName,
        pixelsPerFoot,
        blueprintContext
      });

      if (result.success && result.analysis) {
        const { devices, areas, callouts } = result.analysis;
        const newAnns = [];

        // Devices
        devices?.forEach((dev, idx) => {
          if (dev.confidence === 'low') return;
          const devType = DEVICE_TYPES.find(d => d.id === dev.type) || DEVICE_TYPES[0];
          newAnns.push({
            id: dev.id || `ai_dev_${Date.now()}_${idx}`,
            type: 'device',
            deviceType: dev.type,
            system: dev.system || 'unknown',
            x: dev.x * imageSize.width,
            y: dev.y * imageSize.height,
            icon: devType.icon,
            label: dev.label || devType.label,
            color: SYSTEM_COLORS[dev.system] || SYSTEM_COLORS.unknown,
            size: dev.confidence === 'high' ? 28 : 24,
            aiGenerated: true
          });
        });

        // Areas
        areas?.forEach((area, idx) => {
          newAnns.push({
            id: `ai_area_${idx}`,
            type: 'rectangle',
            x: area.x * imageSize.width,
            y: area.y * imageSize.height,
            width: area.width * imageSize.width,
            height: area.height * imageSize.height,
            color: '#6B7280',
            strokeWidth: 2,
            dash: [5, 5],
            aiGenerated: true
          });
        });

        // Remove ANY existing AI annotations to prevent duplication
        // This acts as a "fresh scan" which users generally expect from a "Magic Wand" action
        setAnnotations(prev => {
          const nonAI = prev.filter(a => !a.aiGenerated);
          return [...nonAI, ...newAnns];
        });

        setAiSummary(result.analysis.summary);
      }
    } catch (e) {
      console.error('AI Markup failed', e);
    } finally {
      setIsAIAnalyzing(false);
    }
  };

  const handleClearAI = () => {
    setAnnotations(prev => prev.filter(a => !a.aiGenerated));
    setAiSummary(null);
  };

  const handleSaveWrapper = () => {
    const dataUrl = stageRef.current.toDataURL({ pixelRatio: 2 });
    onSave?.({ annotations, imageWithMarkup: dataUrl, pageNumber });
  };

  // ==========================================================================
  // RENDERERS
  // ==========================================================================

  const renderAnnotation = (ann) => {
    // Filter by system visibility if it's a device
    if (ann.type === 'device' && ann.system && !visibleSystems.has(ann.system)) return null;

    const { id, ...otherProps } = ann;

    // Properties strictly for the Konva node (excluding application-specific logic fields like 'system')
    const interactionProps = {
      id: id,
      draggable: tool === TOOLS.SELECT,
      onClick: () => setSelectedId(id),
      onTap: () => setSelectedId(id),
      onDragEnd: (e) => setAnnotations(prev => prev.map(a => a.id === id ? { ...a, x: e.target.x(), y: e.target.y() } : a))
    };

    switch (ann.type) {
      case 'text':
        return <Text key={id} {...interactionProps} x={ann.x} y={ann.y} text={ann.text} fill={ann.color} fontSize={ann.fontSize} fontStyle="bold" />;
      case 'callout':
        return (
          <Group key={id} {...interactionProps} x={ann.x} y={ann.y}>
            <Rect width={ann.text.length * 8 + 20} height={24} fill={ann.color} cornerRadius={4} />
            <Text x={10} y={6} text={ann.text} fill="white" fontSize={12} fontStyle="bold" />
          </Group>
        );
      case 'device':
        return (
          <Group key={id} {...interactionProps} x={ann.x} y={ann.y}>
            <Circle radius={14} fill={ann.color} stroke="white" strokeWidth={2} shadowBlur={5} shadowColor="black" shadowOpacity={0.3} />
            <Text x={-7} y={-7} text={ann.icon} fontSize={14} />
            {scale > 0.6 && (
              <Text x={18} y={-6} text={ann.label} fill="white" fontSize={12} fontStyle="bold" shadowBlur={2} shadowColor="black" />
            )}
          </Group>
        );
      case 'rectangle':
        return <Rect key={id} {...interactionProps} x={ann.x} y={ann.y} width={ann.width} height={ann.height} stroke={ann.color} strokeWidth={ann.strokeWidth} dash={ann.dash} />;
      case 'circle':
        return <Circle key={id} {...interactionProps} x={ann.x} y={ann.y} radius={ann.radius} stroke={ann.color} strokeWidth={ann.strokeWidth} />;
      case 'line':
      case 'arrow':
      case 'measure':
        return (
          <Group key={id} {...interactionProps}>
            <Arrow points={ann.points} stroke={ann.color} strokeWidth={ann.strokeWidth} fill={ann.color} pointerLength={ann.type === 'arrow' ? 10 : 0} />
            {ann.type === 'measure' && (
              <Text
                x={(ann.points[0] + ann.points[2]) / 2}
                y={(ann.points[1] + ann.points[3]) / 2}
                text={formatMeasurement(calculateDistance(ann.points))}
                fill="white"
                fontSize={14}
                fontStyle="bold"
                shadowBlur={4}
                shadowColor="black"
                shadowOpacity={0.8}
              />
            )}
          </Group>
        );
      case 'freehand':
        return <Line key={id} {...interactionProps} points={ann.points} stroke={ann.color} strokeWidth={ann.strokeWidth} tension={0.5} lineCap="round" lineJoin="round" />;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex overflow-hidden">

      {/* 1. LEFT TOOLBAR - GLASSMORPHISM */}
      <div className="w-20 bg-gray-900/80 backdrop-blur-md border-r border-gray-700 flex flex-col items-center py-4 gap-4 z-10 scale-95 origin-left rounded-r-2xl my-4 ml-2 shadow-2xl">
        {/* Basic Tools */}
        <div className="flex flex-col gap-2 w-full px-2">
          {[
            { id: TOOLS.SELECT, icon: '👆', tooltip: 'Select' },
            { id: TOOLS.PAN, icon: '✋', tooltip: 'Pan' },
            { id: TOOLS.MEASURE, icon: '📏', tooltip: 'Measure' },
            { id: TOOLS.CALIBRATE, icon: '📐', tooltip: 'Calibrate Scale' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className={`p-3 rounded-xl transition-all ${tool === t.id ? 'bg-blue-600 shadow-lg scale-105' : 'hover:bg-gray-700/50 text-gray-400'}`}
              title={t.tooltip}
            >
              <div className="text-xl">{t.icon}</div>
            </button>
          ))}
        </div>

        <div className="w-12 h-px bg-gray-700/50" />

        {/* Drawing Tools */}
        <div className="flex flex-col gap-2 w-full px-2">
          {[
            { id: TOOLS.RECTANGLE, icon: '⬜' },
            { id: TOOLS.CIRCLE, icon: '⭕' },
            { id: TOOLS.ARROW, icon: '↗️' },
            { id: TOOLS.FREEHAND, icon: '✏️' },
            { id: TOOLS.TEXT, icon: 'T' },
            { id: TOOLS.CALLOUT, icon: '💬' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className={`p-3 rounded-xl transition-all ${tool === t.id ? 'bg-blue-600 shadow-lg scale-105' : 'hover:bg-gray-700/50 text-gray-400'}`}
            >
              <div className="text-xl">{t.icon}</div>
            </button>
          ))}
        </div>

        <div className="mt-auto flex flex-col gap-4 mb-4">
          {/* Color Picker */}
          <input
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            className="w-10 h-10 rounded-full cursor-pointer border-2 border-gray-600"
          />
        </div>
      </div>

      {/* 2. MAIN CANVAS AREA */}
      <div className="flex-1 relative bg-gray-950 overflow-hidden" ref={containerRef}>
        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          onWheel={handleWheel}
          draggable={tool === TOOLS.PAN}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <Layer>
            <Group x={position.x} y={position.y} scaleX={scale} scaleY={scale}>
              <PlanImage src={imageSrc} onLoad={handleImageLoad} />
              {annotations.map(renderAnnotation)}

              {/* Drawing Preview */}
              {isDrawing && newAnnotation && (
                renderAnnotation(newAnnotation)
              )}

              {/* Text Input Overlay Position Calculation would normally go here but simplified for React Konva */}
            </Group>

            {/* Calibration Line (Overlay) */}
            {calibrationLine && (
              <Line points={calibrationLine.points} stroke="#EF4444" strokeWidth={2} dash={[10, 5]} />
            )}
          </Layer>
        </Stage>

        {/* Floating Header */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur-xl border border-gray-700 px-6 py-2 rounded-full shadow-2xl flex items-center gap-6">
          <h2 className="font-bold text-gray-200">Page {pageNumber}</h2>
          <div className="h-6 w-px bg-gray-700" />
          <div className="text-sm font-mono text-blue-400">
            {scaleCalibrated
              ? `Scale: 1 ft = ${Math.round(pixelsPerFoot)} px`
              : '⚠️ Not Calibrated'}
          </div>
        </div>

        {/* Inputs & Dialogs */}
        {showTextInput && (
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 bg-gray-800 p-4 rounded-xl shadow-2xl border border-gray-700 w-80">
            <h3 className="text-sm uppercase font-bold text-gray-400 mb-2">Add Text</h3>
            <input
              autoFocus
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white mb-3"
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleTextSubmit()}
              placeholder="Type annotation..."
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowTextInput(false)} className="px-3 py-1 text-sm text-gray-400">Cancel</button>
              <button onClick={handleTextSubmit} className="px-3 py-1 text-sm bg-blue-600 rounded">Add</button>
            </div>
          </div>
        )}

        {showCalibrationInput && (
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 bg-gray-800 p-4 rounded-xl shadow-2xl border border-gray-700 w-80">
            <h3 className="text-sm uppercase font-bold text-gray-400 mb-2">Calibrate Scale</h3>
            <p className="text-xs text-gray-500 mb-3">Enter the real-world distance of the line you drew (in feet).</p>
            <input
              autoFocus
              type="number"
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white mb-3"
              value={calibrationFeet}
              onChange={e => setCalibrationFeet(e.target.value)}
              placeholder="e.g. 3.0"
            />
            <button onClick={handleCalibrationSubmit} className="w-full py-2 text-sm bg-green-600 rounded font-bold">Set Scale</button>
          </div>
        )}

        {/* Bottom Magic Bar */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
          <button
            onClick={handleAIMarkup}
            disabled={isAIAnalyzing}
            className={`
               flex items-center gap-2 px-6 py-3 rounded-full text-white font-bold shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all
               ${isAIAnalyzing ? 'bg-gray-700 cursor-wait' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-105'}
             `}
          >
            {isAIAnalyzing ? (
              <><span className="animate-spin">⚙️</span> VISION PROCESSING...</>
            ) : (
              <>✨ MAGIC WAND (AI Markup)</>
            )}
          </button>
        </div>
      </div>

      {/* 3. RIGHT PANEL - LAYERS & DEVICES */}
      <div className="w-72 bg-gray-900 border-l border-gray-700 flex flex-col z-10 shadow-xl">

        {/* Actions */}
        <div className="p-4 border-b border-gray-700 flex gap-2">
          <button onClick={handleSaveWrapper} className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded-lg font-bold text-sm">Save</button>
          <button onClick={handleClearAI} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs" title="Clear AI">🧹</button>
          <button onClick={onClose} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs">✕</button>
        </div>

        {/* Smart Layers */}
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Smart Layers</h3>
          <div className="space-y-2">
            {Object.entries(SYSTEM_COLORS).map(([sys, color]) => {
              const label = sys.replace('_', ' ').toUpperCase();
              const isOn = visibleSystems.has(sys);
              return (
                <div key={sys} className="flex items-center justify-between group cursor-pointer" onClick={() => toggleSystem(sys)}>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${isOn ? '' : 'opacity-30'}`} style={{ backgroundColor: color }} />
                    <span className={`text-sm font-medium transition-opacity ${isOn ? 'text-gray-200' : 'text-gray-500'}`}>{label}</span>
                  </div>
                  <div className={`text-xs ${isOn ? 'text-blue-400' : 'text-gray-600'}`}>
                    {isOn ? '👁️' : '🚫'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Device Palette */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Device Palette</h3>
          <div className="grid grid-cols-2 gap-2">
            {DEVICE_TYPES.map(dev => (
              <button
                key={dev.id}
                onClick={() => {
                  setTool(TOOLS.DEVICE);
                  setSelectedDevice(dev);
                }}
                className={`
                     p-2 rounded-lg border flex flex-col items-center gap-1 transition-all
                     ${selectedDevice.id === dev.id && tool === TOOLS.DEVICE
                    ? 'bg-blue-900/40 border-blue-500'
                    : 'bg-gray-800 border-gray-700 hover:bg-gray-700'}
                   `}
              >
                <span className="text-2xl">{dev.icon}</span>
                <span className="text-[10px] text-center font-medium text-gray-300 leading-tight">{dev.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* AI Summary (Bottom) */}
        {aiSummary && (
          <div className="p-4 bg-gray-800 border-t border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🤖</span>
              <span className="text-xs font-bold text-blue-400 uppercase">Analysis Complete</span>
            </div>
            <div className="text-xs text-gray-400 space-y-1">
              <p>Found: <span className="text-white font-bold">{aiSummary.devicesFound || 0} devices</span></p>
              {aiSummary.legendFound && <p className="text-green-400">✅ Legend Detected</p>}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default PlanMarkup;
