import React from 'react';
import { nodeStylesByType } from './ExecutionGraphNodes';

export const Legend = () => {
  const legendItems = [
    { label: 'Agent', color: nodeStylesByType.agent.color, icon: nodeStylesByType.agent.icon },
    { label: 'LLM', color: nodeStylesByType.llm.color, icon: nodeStylesByType.llm.icon },
    { label: 'Tool', color: nodeStylesByType.tool.color, icon: nodeStylesByType.tool.icon },
  ];

  return (
    <div className="absolute bottom-4 left-4 bg-white p-2 border rounded shadow-md">
      {legendItems.map((item) => (
        <div key={item.label} className="flex items-center mb-1">
          <div className={`w-4 h-4 mr-2 ${item.color}`}></div>
          <span>{item.icon} {item.label}</span>
        </div>
      ))}
    </div>
  );
};