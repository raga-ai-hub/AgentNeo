import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { FileText } from 'lucide-react';
import { ReactFlowProvider } from 'reactflow';
import { Chart } from "react-google-charts";
import ErrorBoundary from './error_boundary';
import ExecutionGraph from './execution_graph';
import CustomDropdown from './ui/dropdown';
import { Clock, DollarSign, Cpu, Database, Disc, Computer } from 'lucide-react';
import 'reactflow/dist/style.css';
import { useProject } from '../contexts/ProjectContext';


const ClientSideChart = ({ data, options }) => {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) return null;

    return (
        <Chart
            chartType="Gantt"
            width="100%"
            height="100%"
            data={data}
            options={options}
        />
    );
};

const Dashboard = () => {
    const [projectData, setProjectData] = useState(null);
    const { selectedProject, setSelectedProject, projects, worker, error, setError } = useProject();

    useEffect(() => {
        const fetchProjectData = async () => {
            if (!worker || !selectedProject) return;

            try {
                const projectInfoQuery = `
          SELECT * FROM project_info WHERE id = ?
        `;
                const systemInfoQuery = `
          SELECT * FROM system_info WHERE project_id = ?
        `;
                const llmCallsQuery = `
          SELECT name, COUNT(*) as count, 
                 SUM(JSON_EXTRACT(token_usage, '$.input')) as input_tokens,
                 SUM(JSON_EXTRACT(token_usage, '$.completion')) as output_tokens,
                 SUM(JSON_EXTRACT(cost, '$.input')) as input_cost,
                 SUM(JSON_EXTRACT(cost, '$.completion')) as output_cost
          FROM llm_call
          WHERE project_id = ?
          GROUP BY name
        `;
                const toolCallsQuery = `
          SELECT name, COUNT(*) as count, AVG(duration) as avgDuration
          FROM tool_call
          WHERE project_id = ?
          GROUP BY name
        `;
                const agentCallsQuery = `
          SELECT name, COUNT(*) as count, AVG(duration) as avgDuration,
                 AVG(JSON_ARRAY_LENGTH(tool_calls)) as avgToolCalls,
                 AVG(JSON_ARRAY_LENGTH(llm_calls)) as avgLLMCalls
          FROM agent_call
          WHERE project_id = ?
          GROUP BY name
        `;

                const errorsQuery = `
          SELECT error_type, COUNT(*) as count, error_message
          FROM errors
          WHERE project_id = ?
          GROUP BY error_type, error_message
        `;

                const [projectInfo] = await worker.db.query(projectInfoQuery, [selectedProject]);
                const [systemInfo] = await worker.db.query(systemInfoQuery, [selectedProject]);
                const llmCalls = await worker.db.query(llmCallsQuery, [selectedProject]);
                const toolCalls = await worker.db.query(toolCallsQuery, [selectedProject]);
                const agentCalls = await worker.db.query(agentCallsQuery, [selectedProject]);
                const errors = await worker.db.query(errorsQuery, [selectedProject]);

                setProjectData({
                    projectInfo: projectInfo || null,
                    systemInfo: systemInfo || null,
                    llmCalls: llmCalls.map(call => ({
                        ...call,
                        input_tokens: Number(call.input_tokens),
                        output_tokens: Number(call.output_tokens),
                        input_cost: Number(call.input_cost),
                        output_cost: Number(call.output_cost),
                        total_cost: Number(call.input_cost) + Number(call.output_cost)
                    })),
                    toolCalls,
                    agentCalls,
                    errors
                });
            } catch (err) {
                console.error('Error fetching project data:', err);
                setError('Failed to fetch project data. Please try again later.');
            }
        };

        fetchProjectData();
    }, [worker, selectedProject, setError]);

    const [executionData, setExecutionData] = useState(null);

    useEffect(() => {
        const fetchExecutionData = async () => {
            if (!worker || !selectedProject) return;

            try {
                const executionQuery = `
          SELECT 
            'agent' as type,
            id,
            name,
            input_parameters,
            output,
            start_time,
            end_time,
            duration,
            tool_calls,
            llm_calls,
            memory_used,
            NULL as token_usage
          FROM agent_call
          WHERE project_id = ?
          UNION ALL
          SELECT 
            'llm' as type,
            id,
            name,
            input_prompt as input_parameters,
            output,
            start_time,
            end_time,
            duration,
            '[]' as tool_calls,
            '[]' as llm_calls,
            memory_used,
            token_usage
          FROM llm_call
          WHERE project_id = ?
          UNION ALL
          SELECT 
            'tool' as type,
            id,
            name,
            input_parameters,
            output,
            start_time,
            end_time,
            duration,
            '[]' as tool_calls,
            '[]' as llm_calls,
            memory_used,
            NULL as token_usage
          FROM tool_call
          WHERE project_id = ?
          ORDER BY start_time
        `;

                const executionResults = await worker.db.query(executionQuery, [selectedProject, selectedProject, selectedProject]);
                setExecutionData(executionResults.map(item => ({
                    ...item,
                    id: item.id.toString(),
                    type: 'custom',
                    position: { x: 0, y: 0 },
                    data: {
                        label: `${item.type}: ${item.name}`,
                        type: item.type,
                        name: item.name,
                        start_time: new Date(item.start_time).toLocaleString(),
                        end_time: new Date(item.end_time).toLocaleString(),
                        duration: parseFloat(item.duration).toFixed(2),
                        input_parameters: item.input_parameters,
                        output: item.output,
                        tool_calls: JSON.parse(item.tool_calls),
                        llm_calls: JSON.parse(item.llm_calls),
                        memory_used: parseFloat(item.memory_used).toFixed(2),
                        token_usage: item.token_usage ? JSON.parse(item.token_usage) : null,
                    }
                })));
                console.log('Fetched execution data:', executionResults);
            } catch (err) {
                console.error('Error fetching execution data:', err);
                setError('Failed to fetch execution data. Please try again later.');
            }
        };

        fetchExecutionData();
    }, [worker, selectedProject, setError]);


    const [timelineData, setTimelineData] = useState([]);

    useEffect(() => {
        const fetchTimelineData = async () => {
            if (!worker || !selectedProject) return;

            try {
                const timelineQuery = `
          SELECT 
            'agent' as type,
            name,
            start_time,
            end_time,
            duration
          FROM agent_call
          WHERE project_id = ?
          UNION ALL
          SELECT 
            'llm' as type,
            name,
            start_time,
            end_time,
            duration
          FROM llm_call
          WHERE project_id = ?
          UNION ALL
          SELECT 
            'tool' as type,
            name,
            start_time,
            end_time,
            duration
          FROM tool_call
          WHERE project_id = ?
          ORDER BY start_time
        `;

                const timelineResults = await worker.db.query(timelineQuery, [selectedProject, selectedProject, selectedProject]);

                console.log('Timeline results:', timelineResults); // Add this line for debugging

                const columns = [
                    { type: "string", id: "Task ID" },
                    { type: "string", id: "Task Name" },
                    { type: "string", id: "Resource" },
                    { type: "date", id: "Start Date" },
                    { type: "date", id: "End Date" },
                    { type: "number", id: "Duration" },
                    { type: "number", id: "Percent Complete" },
                    { type: "string", id: "Dependencies" },
                ];

                const rows = timelineResults.map((item, index) => [
                    index.toString(),
                    item.name,
                    item.type,
                    new Date(item.start_time),
                    new Date(item.end_time),
                    null,
                    100,
                    null,
                ]);

                setTimelineData([columns, ...rows]);
                console.log('Formatted timeline data:', [columns, ...rows]); // Add this line for debugging
            } catch (err) {
                console.error('Error fetching timeline data:', err);
                setError('Failed to fetch timeline data. Please try again later.');
            }
        };

        fetchTimelineData();
    }, [worker, selectedProject]);

    const timelineOptions = {
        height: 350,
        gantt: {
            trackHeight: 30,
            barCornerRadius: 4,
            labelStyle: {
                fontName: 'Inter',
                fontSize: 12,
                color: '#5f6368',
            },
            palette: [
                {
                    "color": "#8884d8",
                    "dark": "#6a67a8",
                    "light": "#a6a3e8"
                },
                {
                    "color": "#82ca9d",
                    "dark": "#5fa17f",
                    "light": "#a5e3bb"
                },
                {
                    "color": "#ffc658",
                    "dark": "#d9a53f",
                    "light": "#ffe7a0"
                }
            ]
        },
    };


    if (error) {
        return (
            <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
                    <div className="text-center mb-6">
                        <span className="text-6xl mb-4 block">🤖💥</span>
                        <h1 className="text-2xl font-bold text-red-600 mb-2">Oops! AI Brain Freeze</h1>
                        <p className="text-gray-600">{error}</p>
                    </div>
                    <p className="text-gray-600 mb-4">
                        Oops! Our AI seems to have misplaced its digital coffee and is experiencing a momentary lapse in cognitive functions.
                    </p>
                    <p className="text-gray-600 mb-4">
                        <strong>Before we reboot:</strong> Please ensure you've recorded any traces using Raga AI's tracing tools. It's like giving our AI a memory boost!
                    </p>
                    <p className="text-gray-600 mb-4">
                        Our team of elite "AI Whisperers" is performing an emergency digital defragmentation. In the meantime, why not visit <a href="https://raga.ai/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Raga AI</a> to learn about our tracing superpowers?
                    </p>
                    <p className="text-gray-600">
                        If this AI hiccup persists, please contact our support team with your recorded traces. They're like IT superheroes with a knack for debugging and dad jokes!
                    </p>
                </div>
            </div>
        );
    }

    if (!projectData) return <div>Loading...</div>;

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
    const { projectInfo, systemInfo, llmCalls, toolCalls, agentCalls, errors } = projectData;
    const installedPackages = systemInfo?.installed_packages ? JSON.parse(systemInfo.installed_packages) : {};

    console.log('ExecutionData:', executionData);

    return (
        <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold">Project Dashboard</h1>
                        <p className="text-gray-500">Overview of project metrics and performance</p>
                    </div>
                    <div className="flex items-center space-x-4">
                        <CustomDropdown
                            value={selectedProject}
                            onChange={(value) => {
                                setSelectedProject(Number(value));
                                setExecutionData(null); // Reset execution data when project changes
                            }}
                            options={projects}
                        />
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Project Info Card */}
                    <Card className="bg-white">
                        <CardHeader>
                            <h2 className="text-xl font-bold flex items-center">
                                <Computer className="mr-2 h-6 w-6 text-blue-500" />
                                Project Information
                            </h2>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <InfoItem
                                        icon={<FileText className="h-5 w-5 text-gray-400" />}
                                        label="Project Name"
                                        value={projectInfo?.project_name || 'N/A'}
                                    />
                                    <InfoItem
                                        icon={<Clock className="h-5 w-5 text-gray-400" />}
                                        label="Start Time"
                                        value={projectInfo?.start_time ? new Date(projectInfo.start_time).toLocaleString() : 'N/A'}
                                    />
                                    <InfoItem
                                        icon={<Clock className="h-5 w-5 text-gray-400" />}
                                        label="End Time"
                                        value={projectInfo?.end_time ? new Date(projectInfo.end_time).toLocaleString() : 'N/A'}
                                    />
                                </div>
                                <div className="space-y-3">
                                    <InfoItem
                                        icon={<DollarSign className="h-5 w-5 text-gray-400" />}
                                        label="Total Cost"
                                        value={projectInfo?.total_cost ? `$${projectInfo.total_cost.toFixed(2)}` : 'N/A'}
                                    />
                                    <InfoItem
                                        icon={<Database className="h-5 w-5 text-gray-400" />}
                                        label="Total Tokens"
                                        value={projectInfo?.total_tokens ? projectInfo.total_tokens.toLocaleString() : 'N/A'}
                                    />
                                    <InfoItem
                                        icon={<Clock className="h-5 w-5 text-gray-400" />}
                                        label="Duration"
                                        value={projectInfo?.duration ? `${projectInfo.duration.toFixed(2)} seconds` : 'N/A'}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* System Info Card */}
                    <Card className="bg-white">
                        <CardHeader>
                            <h2 className="text-xl font-bold flex items-center">
                                <Cpu className="mr-2 h-6 w-6 text-green-500" />
                                System Information
                            </h2>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <InfoItem
                                        icon={<FileText className="h-5 w-5 text-gray-400" />}
                                        label="Python Version"
                                        value={systemInfo?.python_version || 'N/A'}
                                    />
                                    <InfoItem
                                        icon={<Cpu className="h-5 w-5 text-gray-400" />}
                                        label="CPU"
                                        value={systemInfo?.cpu_info || 'N/A'}
                                    />
                                    <InfoItem
                                        icon={<Disc className="h-5 w-5 text-gray-400" />}
                                        label="Total Memory"
                                        value={systemInfo?.memory_total ? `${systemInfo.memory_total.toFixed(2)} GB` : 'N/A'}
                                    />
                                </div>
                                <div className="space-y-3">
                                    <InfoItem
                                        icon={<Computer className="h-5 w-5 text-gray-400" />}
                                        label="OS"
                                        value={`${systemInfo?.os_name || 'N/A'} ${systemInfo?.os_version || ''}`}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

                    {/* Execution Graph */}
                    <Card className="bg-white col-span-2 mb-8">
                        <CardHeader>
                            <h2 className="text-xl font-bold">Execution Graph</h2>
                        </CardHeader>
                        <CardContent className="h-600px]"> {/* Removed overflow-hidden */}
                            {executionData ? (
                                <ReactFlowProvider>
                                    <div className="h-full w-full"> {/* Removed overflow-auto */}
                                        <ExecutionGraph data={executionData} />
                                    </div>
                                </ReactFlowProvider>
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-center text-gray-500">Loading execution graph...</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Timeline Card */}
                <Card className="bg-white col-span-2 mb-8 flex flex-col h-[400px]">
                    <CardHeader className="pb-2">
                        <h2 className="text-xl font-bold">Execution Timeline</h2>
                    </CardHeader>
                    <CardContent className="flex-grow flex items-center justify-center">
                        {timelineData.length > 1 ? (
                            <ErrorBoundary>
                                <div className="w-full h-full flex items-center justify-center">
                                    <ClientSideChart
                                        data={timelineData}
                                        options={{
                                            ...timelineOptions,
                                            height: '100%',
                                            width: '100%',
                                            chartArea: { width: '90%', height: '90%' },
                                        }}
                                    />
                                </div>
                            </ErrorBoundary>
                        ) : (
                            <p className="text-center text-gray-500">No timeline data available.</p>
                        )}
                    </CardContent>
                </Card>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Installed Packages Widget */}
                    <Card className="bg-white">
                        <CardHeader>
                            <h2 className="text-xl font-bold">Installed Packages</h2>
                        </CardHeader>
                        <CardContent className="max-h-96 overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Package</TableHead>
                                        <TableHead>Version</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(installedPackages).map(([pkg, version]) => (
                                        <TableRow key={pkg}>
                                            <TableCell>{pkg}</TableCell>
                                            <TableCell>{version}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </main >
        </div >
    );
};

const InfoItem = ({ icon, label, value }) => (
    <div className="flex items-center">
        {icon}
        <span className="ml-2 text-sm text-gray-600">{label}:</span>
        <span className="ml-1 text-sm font-medium">{value}</span>
    </div>
);


export default Dashboard;