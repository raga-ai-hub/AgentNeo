import React, { useState, useMemo } from 'react';
import {
  ChevronRight,
  Clock,
  AlertCircle,
  Bot,
  Wrench,
  MessageSquare,
  ArrowDownCircle,
  ArrowUpCircle,
  X,
  Code,
  Cpu,
  CircleDollarSign,
  Database,
  User,
  Globe
} from 'lucide-react';

// Utility functions
const utils = {
  formatDuration: (duration) => {
    if (typeof duration === 'string') return duration;
    if (typeof duration === 'number') return `${duration.toFixed(3)}s`;
    return 'N/A';
  },

  formatTime: (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  },

  parseJSON: (str) => {
    try {
      return JSON.parse(str);
    } catch (e) {
      return null;
    }
  }
};

const TimelineSegment = ({
  call,
  timelineStart,
  timelineDuration,
  depth,
  isSelected,
  onSelect
}) => {
  const startOffset = ((call.startTime - timelineStart) / timelineDuration) * 100;
  const duration = ((call.endTime - call.startTime) / timelineDuration) * 100;

  let color;
  switch (call.type) {
    case 'agent': color = 'violet'; break;
    case 'llm': color = 'green'; break;
    case 'tool': color = 'blue'; break;
    case 'user': color = 'orange'; break;
    case 'network': color = 'cyan'; break;
    default: color = 'gray';
  }

  return (
    <div
      className={`
        absolute h-6 group cursor-pointer
        ${isSelected ? 'z-20' : 'z-10'}
      `}
      style={{
        left: `${startOffset}%`,
        width: `${duration}%`,
        top: `${depth * 28}px`
      }}
      onClick={() => onSelect(call)}
    >
      {/* Start marker */}
      <div className={`
        absolute -left-1 top-1/2 w-2 h-2 rounded-full bg-${color}-600
        transform -translate-y-1/2
        ${isSelected ? 'ring-2 ring-offset-1 ring-blue-400' : ''}
      `} />

      {/* Main segment bar */}
      <div className={`
        h-2 bg-${color}-100 border border-${color}-600
        relative top-1/2 transform -translate-y-1/2
        ${isSelected ? 'ring-1 ring-blue-400' : ''}
      `} />

      {/* End marker */}
      <div className={`
        absolute -right-1 top-1/2 w-2 h-2 rounded-full bg-${color}-600
        transform -translate-y-1/2
        ${isSelected ? 'ring-2 ring-offset-1 ring-blue-400' : ''}
      `} />

      {/* Hover tooltip */}
      <div className={`
        absolute -top-6 left-0 p-1 rounded bg-gray-800 text-white text-xs
        whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-30
      `}>
        {call.name || `${call.type} ${call.id}`} ({utils.formatDuration(call.duration)})
      </div>
    </div>
  );
};

const TraceDetailsPanel = ({ isOpen, onClose, traceData }) => {
  const [expandedSections, setExpandedSections] = useState(new Set());
  const [selectedSection, setSelectedSection] = useState(null);

  const formatDuration = (duration) => {
    if (typeof duration === 'string') return duration;
    if (typeof duration === 'number') return `${duration.toFixed(3)}s`;
    return 'N/A';
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const parseJSON = (str) => {
    try {
      return JSON.parse(str);
    } catch (e) {
      return null;
    }
  };

  const chronologicalCalls = useMemo(() => {
    if (!traceData) return [];

    const allCalls = [];
    const processCall = (call, type, parentId = null, depth = 0) => {
      const startTime = new Date(call.start_time).getTime();
      allCalls.push({
        ...call,
        type,
        startTime,
        endTime: new Date(call.end_time).getTime(),
        parentId,
        depth
      });

      // Process nested calls
      if (call.llm_calls) {
        call.llm_calls.forEach(llmCall =>
          processCall(llmCall, 'llm', call.id, depth + 1)
        );
      }
      if (call.tool_calls) {
        call.tool_calls.forEach(toolCall =>
          processCall(toolCall, 'tool', call.id, depth + 1)
        );
      }
    };

    traceData.agent_calls.forEach(call => processCall(call, 'agent'));
    return allCalls.sort((a, b) => a.startTime - b.startTime);
  }, [traceData]);

  const timelineStart = useMemo(() => {
    if (chronologicalCalls.length === 0) return 0;
    return Math.min(...chronologicalCalls.map(call => call.startTime));
  }, [chronologicalCalls]);

  const timelineDuration = useMemo(() => {
    if (chronologicalCalls.length === 0) return 0;
    const endTime = Math.max(...chronologicalCalls.map(call => call.endTime));
    return endTime - timelineStart;
  }, [chronologicalCalls, timelineStart]);

  const getTypeIcon = (type) => {
    switch (type) {
      case 'agent': return { icon: Bot, color: 'text-violet-600', bgColor: 'bg-violet-100' };
      case 'llm': return { icon: MessageSquare, color: 'text-green-600', bgColor: 'bg-green-100' };
      case 'tool': return { icon: Wrench, color: 'text-blue-600', bgColor: 'bg-blue-100' };
      case 'user': return { icon: User, color: 'text-orange-600', bgColor: 'bg-orange-100' };
      case 'network': return { icon: Globe, color: 'text-cyan-600', bgColor: 'bg-cyan-100' };
      default: return { icon: Code, color: 'text-gray-600', bgColor: 'bg-gray-100' };
    }
  };

  const renderCallDetails = (call) => {
    const tokenUsage = parseJSON(call.token_usage);
    const cost = parseJSON(call.cost);
    const inputParams = parseJSON(call.input_parameters);

    return (
      <div className="p-4 border-t space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {call.model && (
            <div className="bg-gray-50 p-2 rounded flex items-start gap-2">
              <Cpu className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <div className="text-xs text-gray-500">Model</div>
                <div className="text-sm font-medium">{call.model}</div>
              </div>
            </div>
          )}
          {typeof call.memory_used === 'number' && (
            <div className="bg-gray-50 p-2 rounded flex items-start gap-2">
              <Database className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <div className="text-xs text-gray-500">Memory Used</div>
                <div className="text-sm font-medium">
                  {(call.memory_used / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
            </div>
          )}
        </div>

        {tokenUsage && (
          <div className="bg-gray-50 p-3 rounded">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-gray-400" />
              Token Usage
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(tokenUsage).map(([key, value]) => (
                <div key={key} className="bg-white p-2 rounded border">
                  <div className="text-xs text-gray-500">{key}</div>
                  <div className="text-sm font-medium">{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {cost && (
          <div className="bg-gray-50 p-3 rounded">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <CircleDollarSign className="w-4 h-4 text-gray-400" />
              Cost
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(cost).map(([key, value]) => (
                <div key={key} className="bg-white p-2 rounded border">
                  <div className="text-xs text-gray-500">{key}</div>
                  <div className="text-sm font-medium">${Number(value).toFixed(6)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {inputParams && (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <ArrowDownCircle className="w-4 h-4" />
              <span>Input Parameters</span>
            </div>
            <pre className="bg-gray-800 text-gray-100 rounded-md p-3 text-xs overflow-auto">
              <code>{JSON.stringify(inputParams, null, 2)}</code>
            </pre>
          </div>
        )}

        {call.input_prompt && (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <ArrowDownCircle className="w-4 h-4" />
              <span>Input</span>
            </div>
            <pre className="bg-gray-800 text-gray-100 rounded-md p-3 text-xs overflow-auto">
              <code>{typeof call.input_prompt === 'string'
                ? call.input_prompt
                : JSON.stringify(call.input_prompt, null, 2)}</code>
            </pre>
          </div>
        )}

        {call.output && (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <ArrowUpCircle className="w-4 h-4" />
              <span>Output</span>
            </div>
            <pre className="bg-gray-800 text-gray-100 rounded-md p-3 text-xs overflow-auto">
              <code>{typeof call.output === 'string'
                ? call.output
                : JSON.stringify(call.output, null, 2)}</code>
            </pre>
          </div>
        )}
      </div>
    );
  };

  const renderCall = (call) => {
    const { icon: Icon, color, bgColor } = getTypeIcon(call.type);
    const callId = `${call.type}-${call.id}`;
    const isExpanded = expandedSections.has(callId);
    const isSelected = selectedSection?.id === callId;

    return (
      <div key={callId} style={{ marginLeft: `${call.depth * 16}px` }}>
        <div
          className={`
            rounded-lg border transition-all duration-200 mb-2
            ${isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}
          `}
        >
          <div
            className="flex items-center gap-2 p-3 cursor-pointer hover:bg-gray-50"
            onClick={() => {
              setSelectedSection(isSelected ? null : call);
              setExpandedSections(prev => {
                const next = new Set(prev);
                if (next.has(callId)) {
                  next.delete(callId);
                } else {
                  next.add(callId);
                }
                return next;
              });
            }}
          >
            <Icon className={`w-4 h-4 ${color}`} />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {call.name || `${call.type.charAt(0).toUpperCase() + call.type.slice(1)} ${call.id}`}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${bgColor} ${color}`}>
                    {call.type}
                  </span>
                </div>
                <span className="text-sm text-gray-500">{formatDuration(call.duration)}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                <Clock className="w-3 h-3" />
                {formatTime(call.startTime)}
              </div>
            </div>
          </div>

          {isSelected && renderCallDetails(call)}
        </div>
      </div>
    );
  };

  return (
    <div className={`fixed inset-y-0 right-0 w-[600px] bg-white shadow-xl transform transition-transform
      ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="h-full flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Bot className="w-5 h-5 text-purple-600" />
              Trace Details
            </h2>
            {traceData && (
              <div className="text-sm text-gray-500 mt-1">
                ID: {traceData.id}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {traceData && (
          <>
            <div className="p-4 space-y-4 border-b">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 bg-white p-3 rounded-lg border">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="text-sm text-gray-500">Duration</div>
                    <div className="font-medium">{formatDuration(traceData.duration)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white p-3 rounded-lg border">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <div>
                    <div className="text-sm text-gray-500">Errors</div>
                    <div className="font-medium">{Array.isArray(traceData.errors) ? traceData.errors.length : 0}</div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium">Timeline</div>
                  <div className="text-xs text-gray-500">
                    {formatTime(timelineStart)} - {formatTime(timelineStart + timelineDuration)}
                  </div>
                </div>

                <div
                  className="relative bg-gray-100 rounded overflow-hidden"
                  style={{
                    height: `${Math.max(...chronologicalCalls.map(c => c.depth + 1)) * 28}px`,
                    minHeight: '56px'
                  }}
                >
                  {chronologicalCalls.map(call => (
                    <TimelineSegment
                      key={`${call.type}-${call.id}`}
                      call={call}
                      timelineStart={timelineStart}
                      timelineDuration={timelineDuration}
                      depth={call.depth}
                      isSelected={selectedSection?.id === call.id}
                      onSelect={setSelectedSection}
                    />
                  ))}
                </div>

                <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-violet-600" />
                    Agent Calls
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-green-600" />
                    LLM Calls
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-blue-600" />
                    Tool Calls
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-orange-600" />
                    User Interactions
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-cyan-600" />
                    Network Calls
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-1">
                {chronologicalCalls.map((call, index) => (
                  <React.Fragment key={`${call.type}-${call.id}`}>
                    {index === 0 ||
                      formatTime(call.startTime).split(':')[1] !==
                      formatTime(chronologicalCalls[index - 1].startTime).split(':')[1] ? (
                      <div className="text-xs text-gray-400 mt-4 mb-2 sticky top-0 bg-white py-1">
                        {formatTime(call.startTime)}
                      </div>
                    ) : null}
                    {renderCall(call)}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TraceDetailsPanel;