import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import { useProject } from '../../contexts/ProjectContext';

interface TraceData {
  id: string;
  name: string;
  avgResponseTime: number;
  totalTokens: number;
  totalCost: number;
  memoryUsage: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const TracePerformanceComparison: React.FC = () => {
  const { selectedProject } = useProject();
  const [traces, setTraces] = useState<TraceData[]>([]);
  const [selectedTraces, setSelectedTraces] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedProject) {
      fetchTraceData();
    }
  }, [selectedProject]);

  const fetchTraceData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await axios.get(`/api/projects/${selectedProject}/traces`);
      const tracesData = response.data;

      const processedTraces = await Promise.all(tracesData.map(async (trace: any) => {
        const traceResponse = await axios.get(`/api/traces/${trace.id}`);
        const traceData = traceResponse.data;

        let totalTokens = 0;
        let totalCost = 0;
        let totalDuration = 0;
        let totalMemoryUsed = 0;

        traceData.llm_calls.forEach((call: any) => {
          const tokenUsage = JSON.parse(call.token_usage);
          totalTokens += tokenUsage.input + tokenUsage.completion + tokenUsage.reasoning;

          const cost = JSON.parse(call.cost);
          totalCost += cost.input + cost.output + cost.reasoning;

          totalDuration += call.duration;
          totalMemoryUsed += call.memory_used;
        });

        return {
          id: trace.id,
          name: trace.name || `Trace ${trace.id}`,
          avgResponseTime: totalDuration / traceData.llm_calls.length,
          totalTokens,
          totalCost,
          memoryUsage: totalMemoryUsed / traceData.llm_calls.length,
        };
      }));

      setTraces(processedTraces);
      setSelectedTraces(processedTraces.slice(0, 3).map(t => t.id));
    } catch (err) {
      console.error('Error fetching trace data:', err);
      setError('Failed to fetch trace data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTraceToggle = (traceId: string) => {
    setSelectedTraces(prev =>
      prev.includes(traceId) ? prev.filter(t => t !== traceId) : [...prev, traceId]
    );
  };

  const normalizeData = (data: TraceData[]) => {
    const subjects = ['avgResponseTime', 'totalTokens', 'totalCost', 'memoryUsage'];
    const maxValues = subjects.reduce((acc, subject) => {
      acc[subject] = Math.max(...data.map(d => d[subject as keyof TraceData] as number));
      return acc;
    }, {} as Record<string, number>);

    return data.map(trace => ({
      id: trace.id,
      name: trace.name,
      'Avg Response Time': (trace.avgResponseTime / maxValues.avgResponseTime) * 100,
      'Total Tokens': (trace.totalTokens / maxValues.totalTokens) * 100,
      'Total Cost': (trace.totalCost / maxValues.totalCost) * 100,
      'Avg Memory Usage': (trace.memoryUsage / maxValues.memoryUsage) * 100,
    }));
  };

  const chartData = normalizeData(traces).reduce((acc, trace) => {
    Object.entries(trace).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'name') {
        const existingEntry = acc.find(item => item.subject === key);
        if (existingEntry) {
          existingEntry[trace.id] = value;
        } else {
          acc.push({ subject: key, [trace.id]: value });
        }
      }
    });
    return acc;
  }, [] as any[]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-2">Loading trace data...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center text-red-500 p-4">
          <p>{error}</p>
          <button
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={fetchTraceData}
          >
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trace Performance Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 mb-4">
          <span>Select Traces to Compare:</span>
          {traces.map((trace, index) => (
            <label key={trace.id} className="flex items-center space-x-2">
              <Checkbox
                checked={selectedTraces.includes(trace.id)}
                onCheckedChange={() => handleTraceToggle(trace.id)}
              />
              <span style={{ color: COLORS[index % COLORS.length] }}>{trace.name}</span>
            </label>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={chartData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" />
            <PolarRadiusAxis angle={30} domain={[0, 100]} />
            {selectedTraces.map((traceId, index) => (
              <Radar
                key={traceId}
                name={traces.find(t => t.id === traceId)?.name}
                dataKey={traceId}
                stroke={COLORS[index % COLORS.length]}
                fill={COLORS[index % COLORS.length]}
                fillOpacity={0.6}
              />
            ))}
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default TracePerformanceComparison;