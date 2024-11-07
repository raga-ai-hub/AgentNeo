import React, { useMemo, useCallback, useState, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Panel,
  Node,
  Edge,
} from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { fetchTraceDetails } from '../utils/api';
import 'reactflow/dist/style.css';
import '../styles/ExecutionGraph.css';
import { CustomNode, nodeTypes, nodeStylesByType } from './ExecutionGraphNodes';
import { Legend } from './ExecutionGraphLegend';
import { useProject } from '../contexts/ProjectContext';

interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

const HORIZONTAL_SPACING = 180; // Reduced spacing
const NODE_WIDTH = 160; // Slightly smaller nodes
const NODE_HEIGHT = 80;
const TIME_PADDING = 50; // Padding for timeline positioning

const ExecutionGraph = () => {
  const { selectedTraceId } = useProject();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  const createTimeBasedGraphData = (traceData: any): GraphData => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let nodeId = 0;

    // Helper function to get all nodes with their timing info
    const getAllNodes = (traceData: any) => {
      const allNodes = [];
      
      // Add trace
      allNodes.push({
        type: 'trace',
        id: `trace-${traceData.id}`,
        startTime: new Date(traceData.start_time).getTime(),
        endTime: new Date(traceData.end_time).getTime(),
        data: {
          type: 'trace',
          name: `Trace ${traceData.id}`,
          startTime: traceData.start_time,
          endTime: traceData.end_time,
        },
        parentId: null
      });

      // Add agents
      traceData.agent_calls?.forEach((agent: any) => {
        allNodes.push({
          type: 'agent',
          id: `agent-${agent.id}`,
          startTime: new Date(agent.start_time).getTime(),
          endTime: new Date(agent.end_time).getTime(),
          data: {
            type: 'agent',
            name: agent.name,
            startTime: agent.start_time,
            endTime: agent.end_time,
          },
          parentId: `trace-${traceData.id}`
        });

        // Add LLM calls
        agent.llm_calls?.forEach((llm: any) => {
          allNodes.push({
            type: 'llm',
            id: `llm-${llm.id}`,
            startTime: new Date(llm.start_time).getTime(),
            endTime: new Date(llm.end_time).getTime(),
            data: {
              type: 'llm',
              name: llm.name,
              model: llm.model,
              startTime: llm.start_time,
              endTime: llm.end_time,
            },
            parentId: `agent-${agent.id}`
          });
        });

        // Add tool calls
        agent.tool_calls?.forEach((tool: any) => {
          allNodes.push({
            type: 'tool',
            id: `tool-${tool.id}`,
            startTime: new Date(tool.start_time).getTime(),
            endTime: new Date(tool.end_time).getTime(),
            data: {
              type: 'tool',
              name: tool.name,
              startTime: tool.start_time,
              endTime: tool.end_time,
            },
            parentId: `agent-${agent.id}`
          });
        });
      });

      return allNodes;
    };

    const allNodes = getAllNodes(traceData);
    const minTime = Math.min(...allNodes.map(n => n.startTime));
    const maxTime = Math.max(...allNodes.map(n => n.endTime));
    const timeRange = maxTime - minTime;

    // Helper function to calculate vertical position based on time
    const getYPosition = (startTime: number) => {
      return ((startTime - minTime) / timeRange) * (1000 - TIME_PADDING * 2) + TIME_PADDING;
    };

    // Create nodes with proper positioning
    allNodes.forEach(node => {
      const xPos = node.parentId ? HORIZONTAL_SPACING * (node.type === 'llm' || node.type === 'tool' ? 2 : 1) : 0;
      const yPos = getYPosition(node.startTime);

      nodes.push({
        id: node.id,
        type: 'custom',
        data: node.data,
        position: { x: xPos, y: yPos },
        style: {
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
        },
      });

      // Create edges
      if (node.parentId) {
        edges.push({
          id: `edge-${nodeId++}`,
          source: node.parentId,
          target: node.id,
          type: 'smoothstep',
          animated: true,
        });
      }
    });

    return { nodes, edges };
  };

  useEffect(() => {
    const loadGraphData = async () => {
      if (selectedTraceId) {
        try {
          const traceData = await fetchTraceDetails(selectedTraceId);
          const { nodes: graphNodes, edges: graphEdges } = createTimeBasedGraphData(traceData);
          setNodes(graphNodes);
          setEdges(graphEdges);
        } catch (error) {
          console.error('Error loading graph data:', error);
        }
      }
    };

    loadGraphData();
  }, [selectedTraceId, setNodes, setEdges]);

  const filteredNodes = useMemo(() => {
    if (!searchTerm) return nodes;
    return nodes.filter(node =>
      node.data.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [nodes, searchTerm]);

  const onInit = useCallback((instance) => {
    setReactFlowInstance(instance);
    instance.fitView({ padding: 0.2 });
  }, []);

  const handleSearch = () => {
    if (searchTerm && reactFlowInstance) {
      const matchingNode = filteredNodes.find(node =>
        node.data.label.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (matchingNode) {
        reactFlowInstance.fitView({ padding: 0.2, nodes: [matchingNode] });
      }
    }
  };

  const handleZoomIn = () => reactFlowInstance?.zoomIn();
  const handleZoomOut = () => reactFlowInstance?.zoomOut();
  const handleFitView = () => reactFlowInstance?.fitView({ padding: 0.2 });

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Execution Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: '70vh' }} className="border rounded-lg overflow-hidden shadow-lg">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onInit={onInit}
            fitView
            attributionPosition="bottom-left"
            minZoom={0.1}
            maxZoom={2}
            defaultEdgeOptions={{
              type: 'smoothstep',
              style: { strokeWidth: 2 },
            }}
          >
            <Background color="#e0e7ff" gap={16} />
            <Controls showInteractive={false} />
            <MiniMap
              nodeColor={(node) => {
                const type = (node.data?.type || 'default') as keyof typeof nodeStylesByType;
                return nodeStylesByType[type]?.backgroundColor || nodeStylesByType.agent.backgroundColor;
              }}
              maskColor="#f0f0f080"
            />
            <Panel position="top-right" className="bg-white p-2 rounded shadow-md">
              <div className="flex space-x-2">
                <Button variant="outline" size="icon" onClick={handleZoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleZoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleFitView}>
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </Panel>
            <Legend />
          </ReactFlow>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExecutionGraph;