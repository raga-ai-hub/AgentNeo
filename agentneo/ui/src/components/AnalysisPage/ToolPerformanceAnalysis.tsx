import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';
import axios from 'axios';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Project {
  id: number;
  project_name: string;
}

interface ToolMetrics {
  name: string;
  avgResponseTime: number;
  count: number;
}

interface Summary {
  totalToolCalls: number;
  totalNetworkCalls: number;
}

const ToolPerformanceAnalysis: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [toolData, setToolData] = useState<ToolMetrics[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalToolCalls: 0, totalNetworkCalls: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchData(selectedProjectId);
    }
  }, [selectedProjectId]);

  const fetchProjects = async () => {
    try {
      const response = await axios.get('/api/projects');
      setProjects(response.data);
      if (response.data.length > 0) {
        setSelectedProjectId(response.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to fetch projects. Please try again later.');
    }
  };

  const fetchData = async (projectId: number) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const tracesResponse = await axios.get(`/api/projects/${projectId}/traces`);
      const traces = tracesResponse.data;

      let toolMetrics: Record<string, ToolMetrics> = {};
      let totalToolCalls = 0;
      let totalNetworkCalls = 0;

      for (const trace of traces) {
        const traceResponse = await axios.get(`/api/traces/${trace.id}`);
        const traceData = traceResponse.data;

        for (const toolCall of traceData.tool_calls) {
          if (!toolMetrics[toolCall.name]) {
            toolMetrics[toolCall.name] = {
              name: toolCall.name,
              avgResponseTime: 0,
              count: 0,
            };
          }

          toolMetrics[toolCall.name].avgResponseTime += toolCall.duration;
          toolMetrics[toolCall.name].count += 1;
          totalToolCalls += 1;
          totalNetworkCalls += toolCall.network_calls || 0;
        }
      }

      const processedToolData = Object.values(toolMetrics).map(metric => ({
        ...metric,
        avgResponseTime: Number((metric.avgResponseTime / metric.count).toFixed(3)),
      }));

      setToolData(processedToolData);
      setSummary({ totalToolCalls, totalNetworkCalls });
    } catch (err) {
      console.error('Error fetching tool performance data:', err);
      setError('Failed to fetch tool performance data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border rounded shadow">
          <p className="font-bold">{label}</p>
          <p>{`${payload[0].name}: ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-2">Loading tool performance data...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center text-red-500 p-4">
          <p>{error}</p>
          <button
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => selectedProjectId && fetchData(selectedProjectId)}
          >
            Retry
          </button>
        </div>
      );
    }

    if (toolData.length === 0) {
      return <div className="text-center p-4">No tool performance data available</div>;
    }

    return (
      <>
        <div className="bg-gray-100 p-4 rounded-lg mb-4">
          <h3 className="text-lg font-semibold mb-2">Summary</h3>
          <p>Total Tool Calls: {summary.totalToolCalls}</p>
          <p>Total Network Calls: {summary.totalNetworkCalls}</p>
        </div>
        <h3 className="text-lg font-semibold mb-2">Number of Tool Calls</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={toolData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" axisLine={false} tick={false} />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" fill="#4CAF50" name="Number of Calls" />
          </BarChart>
        </ResponsiveContainer>
        <h3 className="text-lg font-semibold mt-8 mb-2">Average Response Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={toolData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" axisLine={false} tick={false} />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="avgResponseTime" fill="#2196F3" name="Avg Response Time (s)" />
          </BarChart>
        </ResponsiveContainer>
      </>
    );
  };

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Tool Performance Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <Select
          value={selectedProjectId?.toString() || ''}
          onValueChange={(value) => setSelectedProjectId(Number(value))}
        >
          <SelectTrigger className="w-[180px] mb-4">
            <SelectValue placeholder="Select a project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id.toString()}>
                {project.project_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {renderContent()}
      </CardContent>
    </Card>
  );
};

export default ToolPerformanceAnalysis;