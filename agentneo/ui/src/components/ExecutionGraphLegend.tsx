import { Panel } from 'reactflow';
import { nodeStylesByType } from './ExecutionGraphNodes';

export const Legend = () => {
  return (
    <Panel position="bottom-left" className="bg-white p-3 rounded-lg shadow-md">
      <div className="text-sm font-medium mb-2">Node Types</div>
      <div className="space-y-2">
        {Object.entries(nodeStylesByType).map(([type, styles]) => (
          <div key={type} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{
                backgroundColor: styles.backgroundColor,
                border: `2px solid ${styles.borderColor}`,
              }}
            />
            <span className="capitalize">{type}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
};