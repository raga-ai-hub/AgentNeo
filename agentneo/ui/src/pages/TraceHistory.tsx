import React, { useState } from 'react';
import { useSidebar } from '../contexts/SidebarContext';
import Sidebar from '../components/Sidebar';
import TraceDetails from '../components/TraceDetails';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, History, ChevronLeft, ChevronRight } from 'lucide-react';
import { useProject } from '../contexts/ProjectContext';

// Dummy data for testing
const dummyTraces = [
  { id: 'trace-001', start_time: '2023-05-15T10:30:00Z', duration: 15.5, llm_call_count: 3, tool_call_count: 2, agent_call_count: 1, error_count: 0 },
  { id: 'trace-002', start_time: '2023-05-15T11:45:00Z', duration: 8.2, llm_call_count: 2, tool_call_count: 1, agent_call_count: 1, error_count: 1 },
  { id: 'trace-003', start_time: '2023-05-16T09:15:00Z', duration: 22.7, llm_call_count: 5, tool_call_count: 3, agent_call_count: 2, error_count: 0 },
  { id: 'trace-004', start_time: '2023-05-16T14:20:00Z', duration: 12.3, llm_call_count: 4, tool_call_count: 2, agent_call_count: 1, error_count: 0 },
  { id: 'trace-005', start_time: '2023-05-17T08:50:00Z', duration: 18.9, llm_call_count: 6, tool_call_count: 4, agent_call_count: 2, error_count: 1 },
];

const TraceHistory: React.FC = () => {
  const { isCollapsed } = useSidebar();
  const { selectedProject, setSelectedProject, projects } = useProject();
  const [traces, setTraces] = useState(dummyTraces);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTrace, setExpandedTrace] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const tracesPerPage = 10;

  const filteredTraces = traces.filter(trace =>
    trace.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredTraces.length / tracesPerPage);
  const paginatedTraces = filteredTraces.slice(
    (currentPage - 1) * tracesPerPage,
    currentPage * tracesPerPage
  );

  const handleSearch = () => {
    setCurrentPage(1);
  };

  const handleExpandTrace = (traceId: string) => {
    setExpandedTrace(traceId);
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center">
            <History className="mr-2 h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Trace History</h1>
          </div>
          <Select value={selectedProject?.toString()} onValueChange={(value) => setSelectedProject(Number(value))}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id.toString()}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card className="mb-8">
          <CardContent className="p-4">
            <div className="flex space-x-4">
              <Input
                type="text"
                placeholder="Search by Trace ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-grow"
              />
              <Button onClick={handleSearch} className="flex items-center">
                <Search className="w-4 h-4 mr-2" /> Search
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Start Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">LLM Calls</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tool Calls</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Agent Calls</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Errors</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedTraces.map((trace) => (
                <tr
                  key={trace.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-150 ease-in-out"
                  onClick={() => handleExpandTrace(trace.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600 dark:text-indigo-400">{trace.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{new Date(trace.start_time).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{trace.duration.toFixed(2)}s</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{trace.llm_call_count}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{trace.tool_call_count}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{trace.agent_call_count}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{trace.error_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-between items-center">
          <Button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            variant="outline"
            className="flex items-center"
          >
            <ChevronLeft className="w-4 h-4 mr-2" /> Previous
          </Button>
          <span className="text-sm text-gray-600 dark:text-gray-300">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            variant="outline"
            className="flex items-center"
          >
            Next <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        <Dialog open={!!expandedTrace} onOpenChange={() => setExpandedTrace(null)}>
          <DialogContent className="max-w-6xl w-11/12 max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Trace Details: {expandedTrace}</DialogTitle>
            </DialogHeader>
            {expandedTrace && <TraceDetails traceId={expandedTrace} />}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default TraceHistory;
