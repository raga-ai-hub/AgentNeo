import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardContent } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ChevronDown } from 'lucide-react';
import { useProject } from '../contexts/ProjectContext';


const TraceAnalysis = () => {
    const { selectedProject, setSelectedProject, projects, worker, error, setError } = useProject();
    const [projectData, setProjectData] = useState(null);

    useEffect(() => {
        const fetchProjectData = async () => {
            if (!worker || !selectedProject) return;

            try {
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

                const llmCalls = await worker.db.query(llmCallsQuery, [selectedProject]);
                const toolCalls = await worker.db.query(toolCallsQuery, [selectedProject]);
                const agentCalls = await worker.db.query(agentCallsQuery, [selectedProject]);
                const errors = await worker.db.query(errorsQuery, [selectedProject]);

                setProjectData({
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
                        Our team of elite "AI Whisperers" is performing an emergency digital defragmentation. Please try again later.
                    </p>
                </div>
            </div>
        );
    }

    if (!projectData) return <div>Loading...</div>;

    const { llmCalls, toolCalls, agentCalls, errors } = projectData;

    return (
        <div className="p-8">
            <header className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold">Trace Analysis</h1>
                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <select
                            value={selectedProject}
                            onChange={(e) => setSelectedProject(Number(e.target.value))}
                            className="appearance-none bg-white border border-gray-300 rounded-md py-2 pl-3 pr-10 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            {projects.map((project) => (
                                <option key={project.id} value={project.id}>
                                    {project.project_name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">


                {/* LLM Calls Chart */}
                <Card className="bg-white">
                    <CardHeader>
                        <h2 className="text-xl font-bold">LLM Calls</h2>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={llmCalls}>
                                <XAxis dataKey="name" />
                                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                                <Tooltip />
                                <Bar yAxisId="left" dataKey="count" fill="#8884d8" name="Call Count" />
                                <Bar yAxisId="right" dataKey="input_tokens" fill="#82ca9d" name="Input Tokens" />
                                <Bar yAxisId="right" dataKey="output_tokens" fill="#ffc658" name="Output Tokens" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* LLM Cost Distribution */}
                <Card className="bg-white">
                    <CardHeader>
                        <h2 className="text-xl font-bold">LLM Cost Distribution</h2>
                    </CardHeader>
                    <CardContent>
                        {llmCalls.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart
                                    data={llmCalls}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                                >
                                    <XAxis
                                        dataKey="name"
                                        angle={-45}
                                        textAnchor="end"
                                        interval={0}
                                        height={60}
                                        tick={{ fontSize: 10 }}
                                    />
                                    <YAxis tickFormatter={(value) => `$${value.toFixed(2)}`} />
                                    <Tooltip
                                        formatter={(value, name) => [`$${value.toFixed(4)}`, name]}
                                        labelFormatter={(label) => `LLM: ${label}`}
                                    />
                                    <Legend
                                        verticalAlign="top"
                                        height={36}
                                    />
                                    <Bar dataKey="input_cost" stackId="a" fill="#8884d8" name="Input Cost" />
                                    <Bar dataKey="output_cost" stackId="a" fill="#82ca9d" name="Output Cost" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <p>No LLM call data available</p>
                        )}
                    </CardContent>
                </Card>

                {/* Tool Calls Chart */}
                <Card className="bg-white">
                    <CardHeader>
                        <h2 className="text-xl font-bold">Tool Calls</h2>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={toolCalls}>
                                <XAxis dataKey="name" />
                                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                                <Tooltip />
                                <Bar yAxisId="left" dataKey="count" fill="#8884d8" name="Call Count" />
                                <Bar yAxisId="right" dataKey="avgDuration" fill="#82ca9d" name="Avg Duration (s)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Agent Calls Chart */}
                <Card className="bg-white">
                    <CardHeader>
                        <h2 className="text-xl font-bold">Agent Calls</h2>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={agentCalls}>
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="count" fill="#8884d8" name="Call Count" />
                                <Bar dataKey="avgDuration" fill="#82ca9d" name="Avg Duration (s)" />
                                <Bar dataKey="avgToolCalls" fill="#ffc658" name="Avg Tool Calls" />
                                <Bar dataKey="avgLLMCalls" fill="#ff8042" name="Avg LLM Calls" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Errors Widget */}
                <Card className="bg-white">
                    <CardHeader>
                        <h2 className="text-xl font-bold">Errors</h2>
                    </CardHeader>
                    <CardContent>
                        {errors.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Count</TableHead>
                                        <TableHead>Message</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {errors.map((error, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{error.error_type}</TableCell>
                                            <TableCell>{error.count}</TableCell>
                                            <TableCell>{error.error_message}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-center text-gray-500">No errors to display.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default TraceAnalysis;