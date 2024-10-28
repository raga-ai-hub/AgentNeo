import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import axios from 'axios';
import { Loader2, Check, ChevronsUpDown } from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface TraceData {
  id: string;
  name: string;
  avgResponseTime: number;
  totalTokens: number;
  totalCost: number;
  avgMemoryUsage: number;
  toolCallCount: number;
  llmCallCount: number;
}

const COLORS = [
  { stroke: '#2563eb', fill: '#3b82f6' }, // blue
  { stroke: '#059669', fill: '#10b981' }, // green
  { stroke: '#dc2626', fill: '#ef4444' }, // red
  { stroke: '#7c3aed', fill: '#8b5cf6' }, // purple
  { stroke: '#ea580c', fill: '#f97316' }  // orange
];

const METRICS = [
  { 
    key: 'avgResponseTime',
    label: 'Average Response Time per Call',
    unit: 's',
    format: (value: number) => `${value.toFixed(2)}s`
  },
  { 
    key: 'totalTokens',
    label: 'Total Tokens Used',
    unit: '',
    format: (value: number) => value.toFixed(0)
  },
  { 
    key: 'totalCost',
    label: 'Total Cost',
    unit: '$',
    format: (value: number) => `$${value.toFixed(4)}`
  },
  { 
    key: 'avgMemoryUsage',
    label: 'Average Memory Usage per Call',
    unit: 'MB',
    format: (value: number) => `${(value / (1024 * 1024)).toFixed(2)} MB`
  },
  { 
    key: 'toolCallCount',
    label: 'Number of Tool Calls',
    unit: '',
    format: (value: number) => value.toFixed(0)
  },
  { 
    key: 'llmCallCount',
    label: 'Number of LLM Calls',
    unit: '',
    format: (value: number) => value.toFixed(0)
  }
];

const TracePerformanceComparison: React.FC = () => {
  const { selectedProject } = useProject();
  const [traces, setTraces] = useState<TraceData[]>([]);
  const [selectedTraces, setSelectedTraces] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const fetchTraceData = async () => {
    if (!selectedProject) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await axios.get(`/api/projects/${selectedProject}/traces`);
      const tracesData = response.data;

      const processedTraces = await Promise.all(tracesData.map(async (trace: any) => {
        const traceResponse = await axios.get(`/api/analysis_traces/${trace.id}`);
        const traceData = traceResponse.data;

        let totalTokens = 0;
        let totalCost = 0;
        let totalDuration = 0;
        let totalMemory = 0;

        traceData.llm_calls.forEach((call: any) => {
          const tokenUsage = JSON.parse(call.token_usage);
          totalTokens += tokenUsage.input + tokenUsage.completion + tokenUsage.reasoning;

          const cost = JSON.parse(call.cost);
          totalCost += cost.input + cost.output + cost.reasoning;

          totalDuration += call.duration;
          totalMemory += call.memory_used || 0;
        });

        return {
          id: trace.id,
          name: trace.name || `Trace ${trace.id}`,
          avgResponseTime: totalDuration / traceData.llm_calls.length,
          totalTokens,
          totalCost,
          avgMemoryUsage: totalMemory / traceData.llm_calls.length,
          toolCallCount: traceData.tool_calls?.length || 0,
          llmCallCount: traceData.llm_calls.length
        };
      }));

      setTraces(processedTraces);
      if (processedTraces.length > 0 && selectedTraces.length === 0) {
        setSelectedTraces([processedTraces[0].id]);
      }
    } catch (err) {
      console.error('Error fetching trace data:', err);
      setError('Failed to fetch trace data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProject) {
      fetchTraceData();
    }
  }, [selectedProject]);

  const getComparisonData = () => {
    const selectedTraceData = traces.filter(trace => selectedTraces.includes(trace.id));
    return METRICS.map(({ key, label, unit }) => ({
      metric: label,
      unit,
      ...selectedTraceData.reduce((acc, trace) => ({
        ...acc,
        [trace.name]: trace[key as keyof TraceData]
      }), {})
    }));
  };

  const renderTraceSelector = () => (
    <div className="w-full">
      <Label className="text-base font-semibold mb-2 block">
        Select Traces to Compare
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedTraces.length === 0 
              ? "Select traces..."
              : `${selectedTraces.length} trace${selectedTraces.length === 1 ? '' : 's'} selected`}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[var(--radix-popover-trigger-width)] p-0" 
          align="start"
          side="bottom"
          sideOffset={4}
        >
          <Command className="w-full">
            <CommandInput placeholder="Search traces..." />
            <CommandEmpty>No trace found.</CommandEmpty>
            <CommandGroup className="max-h-[200px] overflow-y-auto">
              {traces.map((trace) => (
                <CommandItem
                  key={trace.id}
                  onSelect={() => {
                    setSelectedTraces(current => 
                      current.includes(trace.id)
                        ? current.filter(id => id !== trace.id)
                        : [...current, trace.id]
                    );
                    return false;
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedTraces.includes(trace.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {trace.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
      <p className="text-sm text-gray-500 mt-1">
        Select multiple traces to compare their performance metrics
      </p>
    </div>
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-2">Loading trace data...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center text-red-500 p-4">
          <p>{error}</p>
          <button
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={fetchTraceData}
          >
            Retry
          </button>
        </div>
      );
    }

    if (!selectedProject) {
      return <div className="text-center p-4">Please select a project to view comparison</div>;
    }

    return (
      <div className="space-y-8 w-full">
        {renderTraceSelector()}

        {selectedTraces.length > 0 && (
          <div className="space-y-6 bg-white rounded-lg p-6 shadow-sm w-full">
            <div className="h-[500px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={getComparisonData()}
                  layout="vertical"
                  margin={{ top: 20, right: 50, left: 200, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="metric" 
                    type="category"
                    width={180}
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip
                    formatter={(value: number, name: string, props: any) => {
                      const metric = METRICS.find(m => m.label === props.payload.metric);
                      return metric ? metric.format(value) : value;
                    }}
                  />
                  <Legend />
                  {selectedTraces.map((traceId, index) => {
                    const trace = traces.find(t => t.id === traceId);
                    return (
                      <Bar
                        key={traceId}
                        dataKey={trace?.name || ''}
                        fill={COLORS[index % COLORS.length].fill}
                      />
                    );
                  })}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full px-4 md:px-6 lg:px-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Trace Performance Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
};

export default TracePerformanceComparison;