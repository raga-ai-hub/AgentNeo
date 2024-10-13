import React from 'react';
import { Handle, Position } from 'reactflow';

export const nodeStylesByType = {
  agent: {
    color: 'bg-orange-500',
    icon: '🤖',
  },
  llm: {
    color: 'bg-green-500',
    icon: '🧠',
  },
  tool: {
    color: 'bg-blue-500',
    icon: '🔧',
  },
  default: {
    color: 'bg-gray-500',
    icon: '❓',
  },
};

export const CustomNode = ({ data }: { data: any }) => {
  const styles = nodeStylesByType[data.type as keyof typeof nodeStylesByType] || nodeStylesByType.default;

  return (
    <div className={`border shadow-md overflow-hidden w-[200px] ${styles.color} text-white rounded-md`}>
      <Handle type="target" position={Position.Left} />
      <div className="p-2 font-bold">
        {styles.icon} {data.label}
      </div>
      <div className="bg-white text-black p-2 text-sm">
        <div className="flex justify-between">
          <span>Duration:</span>
          <span>{data.duration}s</span>
        </div>
        <div className="flex justify-between">
          <span>Memory:</span>
          <span>{data.memory_used} MB</span>
        </div>
        {data.type === 'llm' && (
          <div className="flex justify-between">
            <span>Tokens:</span>
            <span>{data.token_usage?.input + data.token_usage?.completion || 'N/A'}</span>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

export const nodeTypes = {
  custom: CustomNode,
};