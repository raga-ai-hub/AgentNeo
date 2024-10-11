import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ExecutionTimeline from '../components/ExecutionTimeline';
import TraceInformation from '../components/TraceInformation';
import EvaluationDetails from '../components/EvaluationDetails';
import CompleteTraceData from '../components/CompleteTraceData';
import TraceInsightsChart from '../components/TraceInsightsChart';
import Sidebar from '../components/Sidebar';
import { FileSearch } from 'lucide-react';

const TraceDetails: React.FC = () => {
  const { traceId } = useParams<{ traceId: string }>();
  const navigate = useNavigate();
  const [traces, setTraces] = useState<{ id: string; name: string }[]>([]);
  const [traceData, setTraceData] = useState<any>(null);

  // Simulated fetch of trace list and trace data
  useEffect(() => {
    const fetchTraces = async () => {
      const dummyTraces = [
        { id: 'trace-001', name: 'Trace 1' },
        { id: 'trace-002', name: 'Trace 2' },
        { id: 'trace-003', name: 'Trace 3' },
        { id: 'trace-004', name: 'Trace 4' },
        { id: 'trace-005', name: 'Trace 5' },
      ];
      setTraces(dummyTraces);

      // Simulated trace data fetch
      const dummyTraceData = {
        id: traceId,
        startTime: new Date().toISOString(),
        duration: 5.2,
        llmCallCount: 3,
        toolCallCount: 2,
        agentCallCount: 1,
        errorCount: 0,
        events: [
          { name: 'Event 1', start_time: 0, duration: 2, type: 'llm' },
          { name: 'Event 2', start_time: 2, duration: 1, type: 'tool' },
          { name: 'Event 3', start_time: 3, duration: 2, type: 'agent' },
        ],
      };
      setTraceData(dummyTraceData);
    };
    fetchTraces();
  }, [traceId]);

  const handleTraceChange = (selectedTraceId: string) => {
    navigate(`/trace/${selectedTraceId}`);
  };

  // Data for the TraceInsightsChart
  const traceInsightsData = [
    { name: 'LLM Calls', count: traceData?.llmCallCount || 0, avgDuration: 1167 },
    { name: 'Tool Calls', count: traceData?.toolCallCount || 0, avgDuration: 400 },
    { name: 'Agent Calls', count: traceData?.agentCallCount || 0, avgDuration: 400 },
  ];

  if (!traceData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <FileSearch className="mr-2 h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Trace Details: {traceId}</h1>
          </div>
          <Select value={traceId} onValueChange={handleTraceChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select trace" />
            </SelectTrigger>
            <SelectContent>
              {traces.map((trace) => (
                <SelectItem key={trace.id} value={trace.id}>
                  {trace.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <TraceInformation trace={traceData} />
          <Card>
            <CardHeader>
              <CardTitle>Trace Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <TraceInsightsChart data={traceInsightsData} />
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Execution Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ExecutionTimeline traceData={traceData} />
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Evaluation Details</CardTitle>
          </CardHeader>
          <CardContent>
            <EvaluationDetails traceId={traceId || ''} />
          </CardContent>
        </Card>

        <CompleteTraceData traceData={traceData} />
      </div>
    </div>
  );
};

export default TraceDetails;