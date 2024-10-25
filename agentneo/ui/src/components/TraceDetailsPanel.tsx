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
  Database
} from 'lucide-react';

const TraceDetailsPanel = ({ isOpen, onClose, traceData }) => {
  const [expandedSections, setExpandedSections] = useState(new Set());
  const [selectedSection, setSelectedSection] = useState(null);

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

  const formatDuration = (duration) => {
    if (typeof duration === 'string') return duration;
    if (typeof duration === 'number') return `${duration.toFixed(3)}s`;
    return 'N/A';
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
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

  const getTypeIcon = (type) => {
    switch (type) {
      case 'agent': return { icon: Bot, color: 'text-violet-600', bgColor: 'bg-violet-100' };
      case 'llm': return { icon: MessageSquare, color: 'text-green-600', bgColor: 'bg-green-100' };
      case 'tool': return { icon: Wrench, color: 'text-blue-600', bgColor: 'bg-blue-100' };
      default: return { icon: Code, color: 'text-gray-600', bgColor: 'bg-gray-100' };
    }
  };

  const renderTimelineBar = (call) => {
    const startOffset = ((call.startTime - timelineStart) / timelineDuration) * 100;
    const duration = ((call.endTime - call.startTime) / timelineDuration) * 100;
    const { color } = getTypeIcon(call.type);
    const isSelected = selectedSection?.id === `${call.type}-${call.id}`;

    return (
      <div
        className={`
          absolute h-2 rounded transition-all duration-200
          ${color.replace('text', 'bg')}
          ${isSelected ? 'ring-2 ring-offset-2 ring-blue-400 z-10' : ''}
        `}
        style={{
          left: `${startOffset}%`,
          width: `${duration}%`,
          top: `${call.depth * 20}px`,
          opacity: isSelected ? 1 : 0.7
        }}
      />
    );
  };

  const renderDetailGrid = (items) => (
    <div className="grid grid-cols-2 gap-2">
      {items.map(([label, value, icon]) =>
        value && (
          <div key={label} className="bg-gray-50 p-2 rounded flex items-start gap-2">
            {icon && <div className="mt-0.5">{icon}</div>}
            <div>
              <div className="text-xs text-gray-500">{label}</div>
              <div className="text-sm font-medium">{value}</div>
            </div>
          </div>
        )
      )}
    </div>
  );

  const renderCall = (call) => {
    const callId = `${call.type}-${call.id}`;
    const isExpanded = expandedSections.has(callId);
    const isSelected = selectedSection?.id === callId;
    const { icon: Icon, color, bgColor } = getTypeIcon(call.type);

    const tokenUsage = parseJSON(call.token_usage);
    const cost = parseJSON(call.cost);
    const inputParams = parseJSON(call.input_parameters);

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
              setSelectedSection(isSelected ? null : { ...call, id: callId });
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
            <div className="flex items-center gap-2">
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
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
              <div className="text-xs text-gray-500 mt-1">
                {formatTime(call.startTime)}
              </div>
            </div>
          </div>

          {isSelected && (
            <div className="p-4 border-t space-y-4">
              {renderDetailGrid([
                ['Start Time', formatTime(call.startTime), <Clock className="w-4 h-4 text-gray-400" />],
                ['End Time', formatTime(call.endTime), <Clock className="w-4 h-4 text-gray-400" />],
                ['Model', call.model, <Cpu className="w-4 h-4 text-gray-400" />],
                ['Memory Used', call.memory_used ? `${(call.memory_used / 1024 / 1024).toFixed(2)} MB` : null,
                  <Database className="w-4 h-4 text-gray-400" />]
              ])}

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
                    <code>{call.input_prompt}</code>
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
                    <code>{typeof call.output === 'string' ? call.output : JSON.stringify(call.output, null, 2)}</code>
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`
        fixed inset-y-0 right-0 w-[600px] bg-white shadow-xl transform transition-transform
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}
    >
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
                <div className="text-sm font-medium mb-2">Timeline</div>
                <div className="relative h-24 bg-gray-100 rounded">
                  {chronologicalCalls.map(call => renderTimelineBar(call))}
                  <div className="absolute bottom-0 left-0 text-xs text-gray-500">
                    {formatTime(timelineStart)}
                  </div>
                  <div className="absolute bottom-0 right-0 text-xs text-gray-500">
                    {formatTime(timelineStart + timelineDuration)}
                  </div>
                </div>
                <div className="mt-2 flex gap-4 text-xs text-gray-500">
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
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-1">
                {chronologicalCalls.map((call, index) => (
                  <React.Fragment key={`${call.type}-${call.id}`}>
                    {index === 0 ||
                      formatTime(call.startTime).split(':')[1] !== formatTime(chronologicalCalls[index - 1].startTime).split(':')[1] ? (
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