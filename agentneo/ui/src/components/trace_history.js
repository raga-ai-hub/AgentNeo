import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from './ui/card';
import { Search, X } from 'lucide-react';
import { useProject } from '../contexts/ProjectContext';
import CustomDropdown from './ui/dropdown';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { coy } from 'react-syntax-highlighter/dist/esm/styles/prism';


function parseNestedJSON(value) {
    try {
        let parsed = value;
        while (typeof parsed === 'string') {
            parsed = JSON.parse(parsed);
        }
        return parsed;
    } catch (e) {
        return value;
    }
}


// Simple Input component
const Input = ({ type, placeholder, value, onChange, className }) => (
    <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    />
);

// Simple Button component
const Button = ({ onClick, children, className, disabled, variant }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`px-4 py-2 rounded font-semibold transition-colors duration-200 ${variant === 'ghost'
            ? 'bg-transparent hover:bg-gray-100 text-gray-700'
            : 'bg-blue-500 text-white hover:bg-blue-600'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
        {children}
    </button>
);

const Modal = ({ isOpen, onClose, children }) => {
    useEffect(() => {
        const handleEscKey = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscKey);
        }

        return () => {
            document.removeEventListener('keydown', handleEscKey);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-end mb-4">
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
};

// Simple Tabs components
const Tabs = ({ children, defaultValue }) => {
    const [activeTab, setActiveTab] = useState(defaultValue);
    return React.Children.map(children, (child) =>
        React.cloneElement(child, { activeTab, setActiveTab })
    );
};

const TabsList = ({ children, activeTab, setActiveTab }) => (
    <div className="flex mb-4 border-b">
        {React.Children.map(children, (child) =>
            React.cloneElement(child, { activeTab, setActiveTab })
        )}
    </div>
);

const TabsTrigger = ({ value, children, activeTab, setActiveTab }) => (
    <button
        onClick={() => setActiveTab(value)}
        className={`px-4 py-2 font-semibold transition-colors duration-200 ${activeTab === value
            ? 'border-b-2 border-blue-500 text-blue-500'
            : 'text-gray-600 hover:text-blue-500'
            }`}
    >
        {children}
    </button>
);

const TabsContent = ({ value, children, activeTab }) => (activeTab === value ? children : null);

// Component to display JSON strings with proper formatting
const FormattedJSON = ({ jsonString }) => {
    try {
        const parsed = JSON.parse(jsonString);
        return (
            <pre className="bg-gray-100 p-2 rounded overflow-x-auto whitespace-pre-wrap break-words">
                {JSON.stringify(parsed, null, 2)}
            </pre>
        );
    } catch (e) {
        // Not JSON, display as is
        return (
            <pre className="bg-gray-100 p-2 rounded overflow-x-auto whitespace-pre-wrap break-words">
                {jsonString}
            </pre>
        );
    }
};

// Accordion component
const AccordionItem = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border rounded mb-2">
            <button
                className="w-full text-left px-4 py-2 bg-gray-200 hover:bg-gray-300 font-medium flex justify-between items-center"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>{title}</span>
                <span>{isOpen ? '-' : '+'}</span>
            </button>
            {isOpen && <div className="p-4 bg-white">{children}</div>}
        </div>
    );
};

const TraceHistory = () => {
    const { selectedProject, setSelectedProject, projects, worker, setError } = useProject();
    const [traces, setTraces] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchPlaceholder, setSearchPlaceholder] = useState('Search by Trace ID...');
    const [noResultsMessage, setNoResultsMessage] = useState('');
    const [expandedTrace, setExpandedTrace] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const tracesPerPage = 10;
    const [modalOpen, setModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const fetchTraces = useCallback(async () => {
        if (!worker || !selectedProject) return;

        try {
            const offset = (currentPage - 1) * tracesPerPage;
            const traceIds = searchTerm
                .split(',')
                .map((id) => id.trim())
                .filter((id) => id !== '');
            const placeholders = traceIds.map(() => '?').join(',');

            const tracesQuery = `
          SELECT t.*, 
              (SELECT COUNT(*) FROM llm_call WHERE trace_id = t.id) as llm_call_count,
              (SELECT COUNT(*) FROM tool_call WHERE trace_id = t.id) as tool_call_count,
              (SELECT COUNT(*) FROM agent_call WHERE trace_id = t.id) as agent_call_count,
              (SELECT COUNT(*) FROM errors WHERE trace_id = t.id) as error_count,
              (SELECT GROUP_CONCAT(id) FROM errors WHERE trace_id = t.id) as error_ids
          FROM traces t
          WHERE t.project_id = ? AND (${traceIds.length > 0 ? `t.id IN (${placeholders})` : '1=1'})
          ORDER BY t.start_time DESC
          LIMIT ? OFFSET ?
      `;

            const queryParams = [selectedProject, ...traceIds, tracesPerPage, offset];
            const traceResults = await worker.db.query(tracesQuery, queryParams);

            console.log('Trace results:', traceResults);

            // Fetch total trace count for pagination
            const totalCountQuery = `
          SELECT COUNT(*) as total_traces
          FROM traces
          WHERE project_id = ? AND (${traceIds.length > 0 ? `id IN (${placeholders})` : '1=1'})
      `;
            const [{ total_traces }] = await worker.db.query(totalCountQuery, [selectedProject, ...traceIds]);
            console.log('Total traces:', total_traces);

            setTraces(traceResults);
            setTotalPages(Math.ceil(total_traces / tracesPerPage));

            // In case no search results found, show this: No results found
            if (traceResults.length === 0) {
                setNoResultsMessage('No traces found for the given ID(s).');
            } else {
                setNoResultsMessage('');
            }
        } catch (err) {
            console.error('Error fetching traces:', err);
            setError('Failed to fetch traces. Please try again later.');
            setNoResultsMessage('');
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
            (SELECT JSON_GROUP_ARRAY(JSON_OBJECT('id', id, 'name', name, 'model', model, 'duration', duration, 'token_usage', token_usage, 'cost', cost, 'input_prompt', input_prompt, 'output', output))
             FROM llm_call WHERE trace_id = ?) as llm_calls,
            (SELECT JSON_GROUP_ARRAY(JSON_OBJECT('id', id, 'name', name, 'duration', duration, 'input_parameters', input_parameters, 'output', output))
             FROM tool_call WHERE trace_id = ?) as tool_calls,
            (SELECT JSON_GROUP_ARRAY(JSON_OBJECT('id', id, 'name', name, 'duration', duration, 'input_parameters', input_parameters, 'output', output))
             FROM agent_call WHERE trace_id = ?) as agent_calls,
            (SELECT JSON_GROUP_ARRAY(JSON_OBJECT('id', id, 'error_type', error_type, 'error_message', error_message))
             FROM errors WHERE trace_id = ?) as errors
      `;

            const [details] = await worker.db.query(detailsQuery, [traceId, traceId, traceId, traceId]);

            const parsedDetails = {
                llm_calls: JSON.parse(details.llm_calls || '[]'),
                tool_calls: JSON.parse(details.tool_calls || '[]'),
                agent_calls: JSON.parse(details.agent_calls || '[]'),
                errors: JSON.parse(details.errors || '[]'),
            };

            function parseFields(obj, fields) {
                const newObj = { ...obj };
                fields.forEach(field => {
                    newObj[field] = parseNestedJSON(obj[field]);
                });
                return newObj;
            }

            // Parse nested JSON fields for each type of call
            parsedDetails.llm_calls = parsedDetails.llm_calls.map(call => parseFields(call, ['token_usage', 'cost', 'input_prompt', 'output']));
            parsedDetails.tool_calls = parsedDetails.tool_calls.map(call => parseFields(call, ['input_parameters', 'output']));
            parsedDetails.agent_calls = parsedDetails.agent_calls.map(call => parseFields(call, ['input_parameters', 'output']));

            return parsedDetails;
        } catch (err) {
            console.error('Error fetching trace details:', err);
            setError('Failed to fetch trace details. Please try again later.');
            return null;
        }
    };

    const handleExpandTrace = async (traceId) => {
        setIsLoading(true);
        const details = await fetchTraceDetails(traceId);
        setExpandedTrace({ id: traceId, details });
        setModalOpen(true);
        setIsLoading(false);
    };

    const handleSearch = () => {
        setCurrentPage(1);
        fetchTraces();
    };

    return (
        <div className="container mx-auto p-8 bg-white min-h-screen">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Trace History</h1>
                <CustomDropdown
                    value={selectedProject}
                    onChange={(value) => {
                        setSelectedProject(Number(value));
                        setCurrentPage(1);
                        setExpandedTrace(null);
                    }}
                    options={projects}
                    className="w-64"
                />
            </div>
            <div className="mb-6 flex">
                <Input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full max-w-sm mr-4"
                />
                <Button onClick={handleSearch} className="flex items-center">
                    <Search className="w-4 h-4 mr-2" /> Search
                </Button>
            </div>
            {noResultsMessage && (
                <div className="mb-4 text-red-600 font-medium">{noResultsMessage}</div>
            )}
            <div className="overflow-x-auto">
                <table className="w-full bg-white shadow-md rounded-lg">
                    <thead className="bg-blue-100">
                        <tr>
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                                ID
                            </th>
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                                Start Time
                            </th>
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                                Duration
                            </th>
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                                LLM Calls
                            </th>
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                                Tool Calls
                            </th>
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                                Agent Calls
                            </th>
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                                Errors
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {traces.map((trace) => (
                            <tr
                                key={trace.id}
                                className="hover:bg-gray-50 cursor-pointer transition-colors duration-150 ease-in-out"
                                onClick={() => handleExpandTrace(trace.id)}
                            >
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {trace.id}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(trace.start_time).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {trace.duration ? `${trace.duration.toFixed(2)}s` : 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {trace.llm_call_count}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {trace.tool_call_count}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {trace.agent_call_count}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {trace.error_count}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-6 flex justify-between items-center">
                <Button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="bg-gray-200 text-gray-700 hover:bg-gray-300"
                >
                    Previous
                </Button>
                <span className="text-gray-600">
                    Page {currentPage} of {totalPages}
                </span>
                <Button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="bg-gray-200 text-gray-700 hover:bg-gray-300"
                >
                    Next
                </Button>
            </div>
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
                {expandedTrace && (
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-2xl font-bold mb-4">Trace Details: {expandedTrace.id}</h2>
                        <TraceDetails details={expandedTrace.details} />
                    </div>
                )}
            </Modal>
        </div>
    );
};

const TraceDetails = ({ details }) => {
    if (!details) {
        return <div className="text-gray-600">No details available</div>;
    }

    const formatJSONField = (field) => {
        try {
            if (typeof field === 'string') {
                // First, try to parse as JSON
                return JSON.parse(field);
            } else if (Array.isArray(field)) {
                // If it's already an array, map over it and parse each item
                return field.map(item => typeof item === 'string' ? JSON.parse(item) : item);
            }
            return field;
        } catch (e) {
            // If parsing fails, return the original field
            return field;
        }
    };


    const renderJSON = (data) => {
        let formattedData = data;
        if (typeof data === 'string') {
            try {
                // First, try to parse as regular JSON
                formattedData = JSON.parse(data);
            } catch (e) {
                // If regular parsing fails, try to handle the specific case
                try {
                    formattedData = JSON.parse(data.replace(/'/g, '"'));
                    // If it's an array with a single string element, parse that element
                    if (Array.isArray(formattedData) && formattedData.length === 1 && typeof formattedData[0] === 'string') {
                        formattedData = JSON.parse(formattedData[0].replace(/'/g, '"'));
                    }
                } catch (e2) {
                    // If all parsing fails, use the original string
                    formattedData = data;
                }
            }
        }
        return (
            <SyntaxHighlighter language="json" style={coy}>
                {JSON.stringify(formattedData, null, 2)}
            </SyntaxHighlighter>
        );
    };

    const renderContent = (content) => {
        if (typeof content === 'object' && content !== null) {
            return renderJSON(content);
        } else if (typeof content === 'string') {
            try {
                const parsed = JSON.parse(content);
                return renderJSON(parsed);
            } catch {
                return renderMarkdown(content);
            }
        }
        return String(content);
    };


    const renderMarkdown = (content) => (
        <ReactMarkdown
            components={{
                code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                        <SyntaxHighlighter
                            language={match[1]}
                            PreTag="div"
                            style={coy}
                            {...props}
                        >
                            {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                    ) : (
                        <code className={className} {...props}>
                            {children}
                        </code>
                    );
                },
            }}
        >
            {content}
        </ReactMarkdown>
    );

    return (
        <Tabs defaultValue="llm_calls">
            <TabsList className="mb-4">
                <TabsTrigger value="llm_calls">
                    <span className="font-semibold">LLM Calls</span> ({details.llm_calls.length})
                </TabsTrigger>
                <TabsTrigger value="tool_calls">
                    <span className="font-semibold">Tool Calls</span> ({details.tool_calls.length})
                </TabsTrigger>
                <TabsTrigger value="agent_calls">
                    <span className="font-semibold">Agent Calls</span> ({details.agent_calls.length})
                </TabsTrigger>
                <TabsTrigger value="errors">
                    <span className="font-semibold">Errors</span> ({details.errors.length})
                </TabsTrigger>
            </TabsList>
            <TabsContent value="llm_calls">
                {details.llm_calls.map((call, index) => (
                    <AccordionItem key={call.id} title={`LLM Call ${index + 1}: ${call.name}`}>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <span className="font-semibold">Model:</span> {call.model}
                            </div>
                            <div>
                                <span className="font-semibold">Duration:</span>{' '}
                                {call.duration ? `${call.duration.toFixed(2)}s` : 'N/A'}
                            </div>
                            <div>
                                <span className="font-semibold">Token Usage:</span>
                                {renderJSON(formatJSONField(call.token_usage))}
                            </div>
                            <div>
                                <span className="font-semibold">Cost:</span>
                                {renderJSON(formatJSONField(call.cost))}
                            </div>
                        </div>
                        <div className="mb-4">
                            <h4 className="font-semibold mb-2">Input Prompt:</h4>
                            {renderJSON(call.input_prompt)}
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2">Output:</h4>
                            {renderMarkdown(call.output)}
                        </div>
                    </AccordionItem>
                ))}
            </TabsContent>
            <TabsContent value="tool_calls">
                {details.tool_calls.map((call, index) => (
                    <AccordionItem key={call.id} title={`Tool Call ${index + 1}: ${call.name}`}>
                        <div className="mb-4">
                            <span className="font-medium">Duration:</span>{' '}
                            {call.duration ? `${call.duration.toFixed(2)}s` : 'N/A'}
                        </div>
                        <div className="mb-4">
                            <h4 className="font-medium mb-2">Input Parameters:</h4>
                            {renderJSON(formatJSONField(call.input_parameters))}
                        </div>
                        <div>
                            <h4 className="font-medium mb-2">Output:</h4>
                            {renderJSON(formatJSONField(call.output))}
                        </div>
                    </AccordionItem>
                ))}
            </TabsContent>
            <TabsContent value="agent_calls">
                {details.agent_calls.map((call, index) => (
                    <AccordionItem key={call.id} title={`Agent Call ${index + 1}: ${call.name}`}>
                        <div className="mb-4">
                            <span className="font-medium">Duration:</span>{' '}
                            {call.duration ? `${call.duration.toFixed(2)}s` : 'N/A'}
                        </div>
                        <div className="mb-4">
                            <h4 className="font-medium mb-2">Input Parameters:</h4>
                            {renderContent(call.input_parameters)}
                        </div>
                        <div>
                            <h4 className="font-medium mb-2">Output:</h4>
                            {renderContent(call.output)}
                        </div>
                    </AccordionItem>
                ))}
            </TabsContent>
            <TabsContent value="errors">
                {details.errors.map((error, index) => (
                    <AccordionItem key={error.id} title={`Error ${index + 1}: ${error.error_type}`}>
                        <div>
                            <h4 className="font-medium mb-2">Error Message:</h4>
                            <pre className="bg-gray-100 p-2 rounded overflow-x-auto whitespace-pre-wrap break-words text-red-500">
                                {error.error_message}
                            </pre>
                        </div>
                    </AccordionItem>
                ))}
            </TabsContent>
        </Tabs>
    );
};

export default TraceHistory;
