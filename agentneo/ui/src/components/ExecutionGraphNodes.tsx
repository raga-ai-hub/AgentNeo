import React from 'react';
import { Handle, Position } from 'reactflow';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink } from 'lucide-react';

const truncateString = (str: string | undefined, maxLength: number) => {
  if (!str) return '';
  return str.length <= maxLength ? str : str.slice(0, maxLength) + '...';
};

const formatDuration = (startTime: string | undefined, endTime: string | undefined) => {
  if (!startTime || !endTime) return 'N/A';
  try {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const durationInSeconds = (end - start) / 1000;
    return durationInSeconds < 1 
      ? `${(durationInSeconds * 1000).toFixed(0)}ms` 
      : `${durationInSeconds.toFixed(2)}s`;
  } catch (error) {
    console.error('Error calculating duration:', error);
    return 'N/A';
  }
};

const formatTime = (timestamp: string | undefined) => {
  if (!timestamp) return 'N/A';
  try {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      // fractionalSecondDigits: 3
    });
  } catch (error) {
    console.error('Error formatting time:', error);
    return 'N/A';
  }
};

export const nodeStylesByType = {
  trace: {
    backgroundColor: '#F3F4F6',
    borderColor: '#4B5563',
    textColor: '#1F2937',
  },
  agent: {
    backgroundColor: '#E6F3FF',
    borderColor: '#2196F3',
    textColor: '#1565C0',
  },
  llm: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
    textColor: '#2E7D32',
  },
  tool: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
    textColor: '#E65100',
  },
  user_interaction: {
    backgroundColor: '#F3E5F5',
    borderColor: '#9C27B0',
    textColor: '#6A1B9A',
  },
  error: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
    textColor: '#C62828',
  }
};

export const CustomNode = ({ data }: { data: any }) => {
  const type = (data.type || 'trace') as keyof typeof nodeStylesByType;
  const style = nodeStylesByType[type];

  const renderCompactContent = () => {
    const commonDetails = (
      <div className="text-xs space-y-1">
        <div>Start: {formatTime(data.startTime)}</div>
        <div>Duration: {formatDuration(data.startTime, data.endTime)}</div>
      </div>
    );

    switch (type) {
      case 'trace':
        return (
          <>
            <div className="font-semibold">{data.name || `Trace ${data.id}`}</div>
            {commonDetails}
          </>
        );

      case 'agent':
        return (
          <>
            <div className="font-semibold">{data.name}</div>
            {commonDetails}
            <div className="text-xs">Status: {data.status || 'N/A'}</div>
          </>
        );

      case 'llm':
        return (
          <>
            <div className="font-semibold">{data.name}</div>
            {commonDetails}
            <div className="text-xs">Model: {data.model || 'N/A'}</div>
            <div className="text-xs">
              Tokens: {
                ((data.token_usage?.input || 0) + (data.token_usage?.completion || 0)) || 'N/A'
              }
            </div>
          </>
        );

      case 'tool':
        return (
          <>
            <div className="font-semibold">{data.name}</div>
            {commonDetails}
            <div className="text-xs">Network Calls: {data.network_calls || 'None'}</div>
          </>
        );

      default:
        return (
          <>
            <div className="font-semibold">{data.name || type}</div>
            {commonDetails}
          </>
        );
    }
  };

  return (
    <div
      className="rounded-lg shadow-md border group"
      style={{
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
        color: style.textColor,
        minHeight: '80px',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: style.borderColor }}
      />
      <div className="p-3">
        {renderCompactContent()}
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Details
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{data.name || type}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[600px] mt-4">
              <pre className="whitespace-pre-wrap text-sm">
                {JSON.stringify(data, null, 2)}
              </pre>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: style.borderColor }}
      />
    </div>
  );
};

export const nodeTypes = {
  custom: CustomNode,
};

export const Legend = () => {
  return (
    <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-md">
      <div className="text-sm font-semibold mb-2">Node Types</div>
      {Object.entries(nodeStylesByType).map(([type, style]) => (
        <div key={type} className="flex items-center mb-1">
          <div
            className="w-4 h-4 rounded mr-2"
            style={{ backgroundColor: style.backgroundColor, border: `1px solid ${style.borderColor}` }}
          />
          <span className="text-xs capitalize">{type.replace('_', ' ')}</span>
        </div>
      ))}
    </div>
  );
};