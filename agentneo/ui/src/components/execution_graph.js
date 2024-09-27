import React, { useMemo, useCallback, useState } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    Handle,
    Position,
    useReactFlow,
} from 'reactflow';
import dagre from 'dagre';

const nodeWidth = 280;
const nodeHeight = 180;

const getLayoutedElements = (nodes, edges, direction = 'LR') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    const isHorizontal = direction === 'LR';
    dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 100 });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const padding = 50;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        node.targetPosition = isHorizontal ? Position.Left : Position.Top;
        node.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

        const x = nodeWithPosition.x - nodeWidth / 2;
        const y = nodeWithPosition.y - nodeHeight / 2;

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + nodeWidth);
        maxY = Math.max(maxY, y + nodeHeight);

        node.position = { x, y };
    });

    nodes.forEach((node) => {
        node.position.x += padding - minX;
        node.position.y += padding - minY;
    });

    const graphWidth = maxX - minX + 2 * padding;
    const graphHeight = maxY - minY + 2 * padding;

    return { nodes, edges, graphWidth, graphHeight };
};

const nodeStylesByType = {
    agent: {
        color: '#ff9800',
        backgroundColor: '#fff3e0',
        borderRadius: '15px',
        icon: '🤖',
    },
    llm: {
        color: '#4caf50',
        backgroundColor: '#e8f5e9',
        borderRadius: '10px',
        icon: '🧠',
    },
    tool: {
        color: '#2196f3',
        backgroundColor: '#e3f2fd',
        borderRadius: '5px',
        icon: '🔧',
    },
    default: {
        color: '#9e9e9e',
        backgroundColor: '#f5f5f5',
        borderRadius: '5px',
        icon: '❓',
    },
};

const CustomNode = ({ data }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const styles = nodeStylesByType[data.type] || nodeStylesByType.default;

    const nodeStyle = {
        padding: '10px',
        border: `1px solid ${styles.color}`,
        backgroundColor: styles.backgroundColor,
        width: `${nodeWidth}px`,
        height: `${nodeHeight}px`,
        fontSize: '12px',
        overflow: 'hidden',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        transition: 'box-shadow 0.3s ease-in-out',
        borderRadius: styles.borderRadius,
        display: 'flex',
        flexDirection: 'column',
    };

    const headerStyle = {
        backgroundColor: styles.color,
        color: '#fff',
        padding: '5px 10px',
        marginBottom: '5px',
        borderTopLeftRadius: styles.borderRadius,
        borderTopRightRadius: styles.borderRadius,
        fontWeight: 'bold',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    };

    const contentStyle = {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
    };

    const infoStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '3px',
    };

    const codeStyle = {
        backgroundColor: '#f9f9f9',
        padding: '5px',
        borderRadius: '3px',
        fontFamily: 'monospace',
        fontSize: '11px',
        overflowX: 'auto',
    };

    return (
        <div style={nodeStyle}>
            <Handle type="target" position={Position.Left} />
            <div style={headerStyle}>
                <span>{styles.icon} {data.label}</span>
                <span style={{ fontSize: '10px' }}>{data.start_time || 'N/A'}</span>
            </div>
            <div style={contentStyle}>
                <div style={infoStyle}>
                    <span>Duration:</span>
                    <span>{data.duration}s</span>
                </div>
                <div style={infoStyle}>
                    <span>Memory:</span>
                    <span>{data.memory_used} MB</span>
                </div>
                {data.type === 'llm' && (
                    <div style={infoStyle}>
                        <span>Tokens:</span>

                        <span>{data.token_usage?.input + data.token_usage?.completion || 'N/A'}</span>
                    </div>
                )}
                <button onClick={() => setIsExpanded(!isExpanded)} style={{ alignSelf: 'flex-end', fontSize: '10px' }}>
                    {isExpanded ? 'Collapse' : 'Expand'}
                </button>
                <div style={{ marginTop: '5px', fontSize: '11px' }}>
                    <strong>Input:</strong>
                    <div style={{ ...codeStyle, maxHeight: isExpanded ? 'none' : '40px', overflow: 'hidden' }}>
                        {JSON.stringify(data.input_parameters, null, 2)}
                    </div>
                </div>
                <div style={{ marginTop: '5px', fontSize: '11px' }}>
                    <strong>Output:</strong>
                    <div style={{ ...codeStyle, maxHeight: isExpanded ? 'none' : '40px', overflow: 'hidden' }}>
                        {JSON.stringify(data.output, null, 2)}
                    </div>
                </div>
            </div>
            <Handle type="source" position={Position.Right} />
        </div>
    );
};

const nodeTypes = {
    custom: CustomNode,
};

const Legend = () => {
    const legendItems = [
        { label: 'Agent', color: nodeStylesByType.agent.color, icon: nodeStylesByType.agent.icon },
        { label: 'LLM', color: nodeStylesByType.llm.color, icon: nodeStylesByType.llm.icon },
        { label: 'Tool', color: nodeStylesByType.tool.color, icon: nodeStylesByType.tool.icon },
    ];

    const legendStyle = {
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        backgroundColor: '#fff',
        padding: '10px',
        border: '1px solid #ccc',
        borderRadius: '5px',
    };

    const itemStyle = {
        display: 'flex',
        alignItems: 'center',
        marginBottom: '5px',
    };

    const colorBoxStyle = (color) => ({
        width: '15px',
        height: '15px',
        backgroundColor: color,
        marginRight: '5px',
    });

    return (
        <div style={legendStyle}>
            {legendItems.map((item) => (
                <div key={item.label} style={itemStyle}>
                    <div style={colorBoxStyle(item.color)}></div>
                    <span>{item.icon} {item.label}</span>
                </div>
            ))}
        </div>
    );
};

const ExecutionGraph = ({ data }) => {
    const reactFlowInstance = useReactFlow();

    const initialNodes = useMemo(() => {
        return data.map((item) => ({
            id: item.id,
            type: 'custom',
            data: {
                ...item.data,
                label: `${item.data.type}: ${item.data.name}`,
            },
            position: { x: 0, y: 0 },
        }));
    }, [data]);

    const initialEdges = useMemo(() => {
        const edges = [];
        for (let i = 0; i < data.length - 1; i++) {
            edges.push({
                id: `e${data[i].id}-${data[i + 1].id}`,
                source: data[i].id,
                target: data[i + 1].id,
                type: 'smoothstep',
                animated: true,
                style: { stroke: '#999', strokeWidth: 2 },
                markerEnd: {
                    type: 'arrowclosed',
                    color: '#999',
                },
            });
        }
        return edges;
    }, [data]);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    const { nodes: layoutedNodes, edges: layoutedEdges, graphWidth, graphHeight } = useMemo(
        () => getLayoutedElements(nodes, edges, 'LR'),
        [nodes, edges]
    );

    const onInit = useCallback((reactFlowInstance) => {
        reactFlowInstance.fitView({ padding: 0.1 });
    }, []);

    return (
        <div style={{ height: '100%', width: '100%', overflow: 'auto' }}>
            <div style={{ width: `${graphWidth}px`, height: `${graphHeight}px`, minWidth: '100%', minHeight: '100%' }}>
                <ReactFlow
                    nodes={layoutedNodes}
                    edges={layoutedEdges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    nodeTypes={nodeTypes}
                    onInit={onInit}
                    fitView
                    attributionPosition="bottom-left"
                    nodesDraggable={false}
                    minZoom={0.1}
                    maxZoom={1.5}
                >
                    <Background color="#f0f0f0" gap={6} />
                    <Controls />
                    <MiniMap
                        nodeColor={(node) => nodeStylesByType[node.data.type]?.color || '#9e9e9e'}
                        style={{ backgroundColor: '#f0f0f0' }}
                        zoomable
                        pannable
                    />
                    <Legend />
                </ReactFlow>
            </div>
        </div>
    );
};

export default ExecutionGraph;
