import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { useProject } from '../contexts/ProjectContext';
import CustomDropdown from './ui/dropdown';

// Simple Input component
const Input = ({ type, placeholder, value, onChange, className }) => (
    <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`border rounded px-2 py-1 ${className}`}
    />
);

// Simple Button component
const Button = ({ onClick, children, className, disabled, variant }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`px-4 py-2 rounded ${variant === 'ghost'
            ? 'bg-transparent hover:bg-gray-100'
            : 'bg-blue-500 text-white hover:bg-blue-600'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
        {children}
    </button>
);

// Simple Tabs components
const Tabs = ({ children, defaultValue }) => {
    const [activeTab, setActiveTab] = useState(defaultValue);
    return React.Children.map(children, child =>
        React.cloneElement(child, { activeTab, setActiveTab })
    );
};

const TabsList = ({ children, activeTab, setActiveTab }) => (
    <div className="flex mb-4">
        {React.Children.map(children, child =>
            React.cloneElement(child, { activeTab, setActiveTab })
        )}
    </div>
);

const TabsTrigger = ({ value, children, activeTab, setActiveTab }) => (
    <Button
        onClick={() => setActiveTab(value)}
        className={`mr-2 ${activeTab === value ? 'bg-blue-700' : ''}`}
    >
        {children}
    </Button>
);

const TabsContent = ({ value, children, activeTab }) => (
    activeTab === value ? children : null
);

const TraceHistory = () => {
    const { selectedProject, setSelectedProject, projects, worker, setError } = useProject();
    const [traces, setTraces] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedTrace, setExpandedTrace] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const tracesPerPage = 10;

    const fetchTraces = useCallback(async () => {
        if (!worker || !selectedProject) return;

        try {
            const offset = (currentPage - 1) * tracesPerPage;
            const tracesQuery = `
                SELECT t.*, 
                    (SELECT COUNT(*) FROM llm_call WHERE trace_id = t.id) as llm_call_count,
                    (SELECT COUNT(*) FROM tool_call WHERE trace_id = t.id) as tool_call_count,
                    (SELECT COUNT(*) FROM agent_call WHERE trace_id = t.id) as agent_call_count,
                    (SELECT COUNT(*) FROM errors WHERE trace_id = t.id) as error_count
                FROM traces t
                WHERE t.project_id = ? AND (t.id LIKE ? OR t.start_time LIKE ?)
                ORDER BY t.start_time DESC
                LIMIT ? OFFSET ?
            `;
            const countQuery = `
                SELECT COUNT(*) as total
                FROM traces
                WHERE project_id = ? AND (id LIKE ? OR start_time LIKE ?)
            `;

            const traceResults = await worker.db.query(tracesQuery, [
                selectedProject,
                `%${searchTerm}%`,
                `%${searchTerm}%`,
                tracesPerPage,
                offset
            ]);
            const [{ total }] = await worker.db.query(countQuery, [
                selectedProject,
                `%${searchTerm}%`,
                `%${searchTerm}%`
            ]);

            console.log('Fetched traces:', traceResults);
            setTraces(traceResults);
            setTotalPages(Math.ceil(total / tracesPerPage));
        } catch (err) {
            console.error('Error fetching traces:', err);
            setError('Failed to fetch traces. Please try again later.');
        }
    }, [worker, selectedProject, currentPage, searchTerm, tracesPerPage, setError]);

    useEffect(() => {
        fetchTraces();
    }, [fetchTraces]);

    const fetchTraceDetails = async (traceId) => {
        if (!worker || !selectedProject) return null;

        try {
            const detailsQuery = `
                SELECT 
                    (SELECT JSON_GROUP_ARRAY(JSON_OBJECT('id', id, 'name', name, 'model', model, 'duration', duration, 'token_usage', token_usage, 'cost', cost))
                     FROM llm_call WHERE trace_id = ?) as llm_calls,
                    (SELECT JSON_GROUP_ARRAY(JSON_OBJECT('id', id, 'name', name, 'duration', duration))
                     FROM tool_call WHERE trace_id = ?) as tool_calls,
                    (SELECT JSON_GROUP_ARRAY(JSON_OBJECT('id', id, 'name', name, 'duration', duration))
                     FROM agent_call WHERE trace_id = ?) as agent_calls,
                    (SELECT JSON_GROUP_ARRAY(JSON_OBJECT('id', id, 'error_type', error_type, 'error_message', error_message))
                     FROM errors WHERE trace_id = ?) as errors
            `;

            const [details] = await worker.db.query(detailsQuery, [traceId, traceId, traceId, traceId]);
            console.log('Fetched trace details:', details);

            return {
                llm_calls: JSON.parse(details.llm_calls || '[]'),
                tool_calls: JSON.parse(details.tool_calls || '[]'),
                agent_calls: JSON.parse(details.agent_calls || '[]'),
                errors: JSON.parse(details.errors || '[]')
            };
        } catch (err) {
            console.error('Error fetching trace details:', err);
            setError('Failed to fetch trace details. Please try again later.');
            return null;
        }
    };

    const handleExpandTrace = async (traceId) => {
        console.log('Expanding trace:', traceId);
        if (expandedTrace?.id === traceId) {
            setExpandedTrace(null);
        } else {
            const details = await fetchTraceDetails(traceId);
            console.log('Fetched details for trace:', traceId, details);
            setExpandedTrace({ id: traceId, details });
        }
    };

    return (
        <div className="container mx-auto p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold">Trace History</h1>
                <CustomDropdown
                    value={selectedProject}
                    onChange={(value) => {
                        setSelectedProject(Number(value));
                        setCurrentPage(1);
                        setExpandedTrace(null);
                    }}
                    options={projects}
                />
            </div>
            <div className="mb-4 flex">
                <Input
                    type="text"
                    placeholder="Search traces..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full max-w-sm mr-2"
                />
                <Button onClick={() => fetchTraces()}>
                    <Search className="w-4 h-4 mr-2" /> Search
                </Button>
            </div>
            <Card>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Start Time</TableHead>
                                <TableHead>Duration</TableHead>
                                <TableHead>LLM Calls</TableHead>
                                <TableHead>Tool Calls</TableHead>
                                <TableHead>Agent Calls</TableHead>
                                <TableHead>Errors</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {traces.map((trace) => (
                                <React.Fragment key={trace.id}>
                                    <TableRow>
                                        <TableCell>{trace.id}</TableCell>
                                        <TableCell>{new Date(trace.start_time).toLocaleString()}</TableCell>
                                        <TableCell>{trace.duration ? `${trace.duration.toFixed(2)}s` : 'N/A'}</TableCell>
                                        <TableCell>{trace.llm_call_count}</TableCell>
                                        <TableCell>{trace.tool_call_count}</TableCell>
                                        <TableCell>{trace.agent_call_count}</TableCell>
                                        <TableCell>{trace.error_count}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" onClick={() => handleExpandTrace(trace.id)}>
                                                {expandedTrace?.id === trace.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                    {expandedTrace?.id === trace.id && (
                                        <TableRow>
                                            <TableCell colSpan={8}>
                                                <TraceDetails details={expandedTrace.details} />
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </React.Fragment>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <div className="mt-4 flex justify-between items-center">
                <Button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                >
                    Previous
                </Button>
                <span>Page {currentPage} of {totalPages}</span>
                <Button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                >
                    Next
                </Button>
            </div>
        </div>
    );
};

const TraceDetails = ({ details }) => {
    if (!details) {
        return <div>No details available</div>;
    }

    return (
        <Tabs defaultValue="llm_calls">
            <TabsList>
                <TabsTrigger value="llm_calls">LLM Calls ({details.llm_calls.length})</TabsTrigger>
                <TabsTrigger value="tool_calls">Tool Calls ({details.tool_calls.length})</TabsTrigger>
                <TabsTrigger value="agent_calls">Agent Calls ({details.agent_calls.length})</TabsTrigger>
                <TabsTrigger value="errors">Errors ({details.errors.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="llm_calls">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Model</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Token Usage</TableHead>
                            <TableHead>Cost</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {details.llm_calls.map((call) => (
                            <TableRow key={call.id}>
                                <TableCell>{call.name}</TableCell>
                                <TableCell>{call.model}</TableCell>
                                <TableCell>{call.duration ? `${call.duration.toFixed(2)}s` : 'N/A'}</TableCell>
                                <TableCell>{JSON.stringify(call.token_usage)}</TableCell>
                                <TableCell>{JSON.stringify(call.cost)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TabsContent>
            <TabsContent value="tool_calls">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Duration</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {details.tool_calls.map((call) => (
                            <TableRow key={call.id}>
                                <TableCell>{call.name}</TableCell>
                                <TableCell>{call.duration ? `${call.duration.toFixed(2)}s` : 'N/A'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TabsContent>
            <TabsContent value="agent_calls">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Duration</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {details.agent_calls.map((call) => (
                            <TableRow key={call.id}>
                                <TableCell>{call.name}</TableCell>
                                <TableCell>{call.duration ? `${call.duration.toFixed(2)}s` : 'N/A'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TabsContent>
            <TabsContent value="errors">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Error Type</TableHead>
                            <TableHead>Error Message</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {details.errors.map((error) => (
                            <TableRow key={error.id}>
                                <TableCell>{error.error_type}</TableCell>
                                <TableCell>{error.error_message}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TabsContent>
        </Tabs>
    );
};

export default TraceHistory;

