import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react';
import { useProject } from '../../contexts/ProjectContext';
import axios from 'axios';

const MetricCard: React.FC<{ title: string; value: string; change: string; isPositive: boolean }> = ({ title, value, change, isPositive }) => (
  <Card className="bg-white">
    <CardContent className="p-4">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <div className="mt-2 flex items-baseline justify-between">
        <p className="text-2xl font-semibold">{value}</p>
        <p className={`flex items-center text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? <ArrowUpIcon className="w-4 h-4 mr-1" /> : <ArrowDownIcon className="w-4 h-4 mr-1" />}
          {change}
        </p>
      </div>
    </CardContent>
  </Card>
);

interface CostObject {
  input: number;
  output: number;
  reasoning: number;
}

const PerformanceMetrics: React.FC = () => {
  const { selectedProject, traces } = useProject();
  const [metrics, setMetrics] = useState({
    successRate: 0,
    avgLLMResponseTime: 0,
    avgToolCallResponseTime: 0,
    avgCostPerLLMCall: 0,
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!selectedProject || traces.length === 0) return;

      let totalLLMCalls = 0;
      let totalToolCalls = 0;
      let totalErrors = 0;
      let totalLLMDuration = 0;
      let totalToolDuration = 0;
      let totalCost = 0;

      for (const trace of traces) {
        try {
          const response = await axios.get(`/api/traces/${trace.id}`);
          const traceData = response.data;

          totalLLMCalls += traceData.llm_calls.length;
          totalToolCalls += traceData.tool_calls.length;
          totalErrors += traceData.errors.length;

          totalLLMDuration += traceData.llm_calls.reduce((sum, call) => sum + call.duration, 0);
          totalToolDuration += traceData.tool_calls.reduce((sum, call) => sum + call.duration, 0);
          
          totalCost += traceData.llm_calls.reduce((sum, call) => {
            const costObj = JSON.parse(call.cost) as CostObject;
            return sum + Object.values(costObj).reduce((a, b) => a + b, 0);
          }, 0);
        } catch (error) {
          console.error('Error fetching trace data:', error);
        }
      }

      const totalCalls = totalLLMCalls + totalToolCalls;
      const successRate = totalCalls > 0 ? ((totalCalls - totalErrors) / totalCalls) * 100 : 0;
      const avgLLMResponseTime = totalLLMCalls > 0 ? totalLLMDuration / totalLLMCalls : 0;
      const avgToolCallResponseTime = totalToolCalls > 0 ? totalToolDuration / totalToolCalls : 0;
      const avgCostPerLLMCall = totalLLMCalls > 0 ? totalCost / totalLLMCalls : 0;

      setMetrics({
        successRate,
        avgLLMResponseTime,
        avgToolCallResponseTime,
        avgCostPerLLMCall,
      });
    };

    fetchMetrics();
  }, [selectedProject, traces]);

  return (
    <div className="bg-gray-200 p-4 rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Performance Metrics</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Success Rate" value={`${metrics.successRate.toFixed(2)}%`} change="2.1%" isPositive={true} />
        <MetricCard title="Avg LLM Response Time" value={`${metrics.avgLLMResponseTime.toFixed(2)}s`} change="0.3s" isPositive={false} />
        <MetricCard title="Avg Tool Response Time" value={`${metrics.avgToolCallResponseTime.toFixed(2)}s`} change="0.1s" isPositive={true} />
        <MetricCard title="Avg Cost per LLM Call" value={`$${metrics.avgCostPerLLMCall.toFixed(4)}`} change="$0.001" isPositive={true} />
      </div>
    </div>
  );
};

export default PerformanceMetrics;