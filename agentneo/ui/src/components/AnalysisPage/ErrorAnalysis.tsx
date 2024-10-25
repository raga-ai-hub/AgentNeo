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

interface ErrorData {
  error_type: string;
  count: number;
}

const ErrorAnalysis: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [errorData, setErrorData] = useState<ErrorData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchErrorData(selectedProjectId);
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

  const fetchErrorData = async (projectId: number) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const tracesResponse = await axios.get(`/api/projects/${projectId}/traces`);
      const traces = tracesResponse.data;

      let errorCounts: Record<string, number> = {};

      for (const trace of traces) {
        const traceResponse = await axios.get(`/api/traces/${trace.id}`);
        const traceData = traceResponse.data;

        for (const error of traceData.errors) {
          if (!errorCounts[error.error_type]) {
            errorCounts[error.error_type] = 0;
          }
          errorCounts[error.error_type]++;
        }
      }

      const processedErrorData = Object.entries(errorCounts).map(([error_type, count]) => ({
        error_type,
        count,
      }));

      setErrorData(processedErrorData);
    } catch (err) {
      console.error('Error fetching error data:', err);
      setError('Failed to fetch error data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-2">Loading error data...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center text-red-500 p-4">
          <p>{error}</p>
          <button
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => selectedProjectId && fetchErrorData(selectedProjectId)}
          >
            Retry
          </button>
        </div>
      );
    }

    if (errorData.length === 0) {
      return <div className="text-center p-4">No error</div>;
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={errorData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="error_type" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" fill="#f87171" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Error Analysis</CardTitle>
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

export default ErrorAnalysis;