import React, { useMemo, useCallback, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from 'lucide-react';
import 'reactflow/dist/style.css';
import { CustomNode, nodeTypes, nodeStylesByType } from './ExecutionGraphNodes';
import { Legend } from './ExecutionGraphLegend';
import { getLayoutedElements } from './ExecutionGraphLayout';

const ExecutionGraph = () => {
  const mockData = [
    { id: '1', data: { type: 'agent', name: 'Main Agent', duration: 5, memory_used: 100 } },
    { id: '2', data: { type: 'llm', name: 'GPT-4', duration: 2, memory_used: 200, token_usage: { input: 100, completion: 50 } } },
    { id: '3', data: { type: 'tool', name: 'Web Search', duration: 1, memory_used: 50 } },
  ];

  const initialNodes = useMemo(() => {
    return mockData.map((item) => ({
      id: item.id,
      type: 'custom',
      data: {
        ...item.data,
        label: `${item.data.type}: ${item.data.name}`,
      },
      position: { x: 0, y: 0 },
    }));
  }, []);

  const initialEdges = useMemo(() => {
    return mockData.slice(0, -1).map((item, index) => ({
      id: `e${item.id}-${mockData[index + 1].id}`,
      source: item.id,
      target: mockData[index + 1].id,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#999', strokeWidth: 2 },
    }));
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [searchTerm, setSearchTerm] = useState('');

  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => getLayoutedElements(nodes, edges, 'LR'),
    [nodes, edges]
  );

  const filteredNodes = useMemo(() => {
    if (!searchTerm) return layoutedNodes;
    return layoutedNodes.filter(node => 
      node.data.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [layoutedNodes, searchTerm]);

  const onInit = useCallback((reactFlowInstance) => {
    reactFlowInstance.fitView({ padding: 0.2 });
  }, []);

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Execution Graph</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center space-x-2">
          <Input
            type="text"
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Button variant="outline" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <div style={{ height: '400px' }} className="border rounded-lg overflow-hidden">
          <ReactFlow
            nodes={filteredNodes}
            edges={layoutedEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onInit={onInit}
            fitView
            attributionPosition="bottom-left"
            minZoom={0.1}
            maxZoom={1.5}
          >
            <Background color="#e0e7ff" gap={16} />
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                const type = (node.data?.type || 'default') as keyof typeof nodeStylesByType;
                return nodeStylesByType[type]?.color || nodeStylesByType.default.color;
              }}
              maskColor="#f0f0f080"
            />
            <Legend />
          </ReactFlow>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExecutionGraph;