import React, { useState } from 'react';
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
  Network
} from 'lucide-react';

const TraceDetailsPanel = ({ isOpen, onClose, traceData }) => {
  const [expandedSections, setExpandedSections] = useState(new Set());
  const [selectedSection, setSelectedSection] = useState(null);

  const formatDuration = (duration) => {
    if (typeof duration === 'string') {
      return duration;
    }
    if (typeof duration === 'number') {
      return `${duration.toFixed(3)}s`;
    }
    return 'N/A';
  };

  const parseJSON = (str) => {
    try {
      return JSON.parse(str);
    } catch (e) {
      return null;
    }
  };

  const renderCodeBlock = ({ label, data }) => {
    if (!data) return null;
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1 text-sm text-gray-500">
          {label}
        </div>
        <pre className="bg-gray-800 text-gray-100 rounded-md p-3 text-xs overflow-auto">
          <code>{typeof data === 'string' ? data : JSON.stringify(data, null, 2)}</code>
        </pre>
      </div>
    );
  };

  const renderCall = (call, type, depth = 0) => {
    if (!call) return null;

    const callId = `${type}-${call.id}`;
    const isExpanded = expandedSections.has(callId);
    const isSelected = selectedSection?.id === callId;

    let iconColor;
    let Icon;
    switch (type) {
      case 'agent':
        Icon = Bot;
        iconColor = 'text-violet-600';
        break;
      case 'llm':
        Icon = MessageSquare;
        iconColor = 'text-green-600';
        break;
      case 'tool':
        Icon = Wrench;
        iconColor = 'text-blue-600';
        break;
      default:
        Icon = Code;
        iconColor = 'text-gray-600';
    }

    const hasChildren = (call.llm_calls?.length > 0 || call.tool_calls?.length > 0);
    const marginLeft = depth * 16;

    return (
      <div key={callId} style={{ marginLeft: `${marginLeft}px` }}>
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
              if (hasChildren) {
                setExpandedSections(prev => {
                  const next = new Set(prev);
                  if (next.has(callId)) {
                    next.delete(callId);
                  } else {
                    next.add(callId);
                  }
                  return next;
                });
              }
            }}
          >
            <div className="flex items-center gap-2">
              {hasChildren && (
                <ChevronRight
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 
                    ${isExpanded ? 'transform rotate-90' : ''}`}
                />
              )}
              <Icon className={`w-4 h-4 ${iconColor}`} />
            </div>
            <div className="flex-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {call.name || `${type.charAt(0).toUpperCase() + type.slice(1)} ${call.id}`}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${iconColor.replace('text', 'bg')}/10`}>
                  {type}
                </span>
              </div>
              <span className="text-sm text-gray-500">{formatDuration(call.duration)}</span>
            </div>
          </div>

          {isSelected && (
            <div className="p-4 border-t space-y-4">
              {call.input_prompt && renderCodeBlock({
                label: <div className="flex items-center gap-1">
                  <ArrowDownCircle className="w-4 h-4" />
                  <span>Input</span>
                </div>,
                data: call.input_prompt
              })}

              {call.output && renderCodeBlock({
                label: <div className="flex items-center gap-1">
                  <ArrowUpCircle className="w-4 h-4" />
                  <span>Output</span>
                </div>,
                data: call.output
              })}

              {call.token_usage && (
                <div className="bg-gray-50 p-3 rounded">
                  <h4 className="text-sm font-medium mb-2">Token Usage</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(parseJSON(call.token_usage) || {}).map(([key, value]) => (
                      <div key={key}>
                        <div className="text-xs text-gray-500">{key}</div>
                        <div className="text-sm font-medium">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {call.cost && (
                <div className="bg-gray-50 p-3 rounded">
                  <h4 className="text-sm font-medium mb-2">Cost</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(parseJSON(call.cost) || {}).map(([key, value]) => (
                      <div key={key}>
                        <div className="text-xs text-gray-500">{key}</div>
                        <div className="text-sm font-medium">${Number(value).toFixed(6)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {isExpanded && (
          <div className="ml-4 border-l border-gray-200">
            {call.llm_calls?.map(llmCall => renderCall(llmCall, 'llm', depth + 1))}
            {call.tool_calls?.map(toolCall => renderCall(toolCall, 'tool', depth + 1))}
          </div>
        )}
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
            <div className="p-4 bg-gray-50 border-b">
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
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-6">
                {Array.isArray(traceData.agent_calls) && traceData.agent_calls.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Agent Calls</h3>
                    {traceData.agent_calls.map(call => renderCall(call, 'agent'))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TraceDetailsPanel;