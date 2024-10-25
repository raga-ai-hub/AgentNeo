import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';
import axios from 'axios';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const TOKEN_COLORS = {
  Input: '#3b82f6',
  Output: '#10b981',
  Reasoning: '#f59e0b'
};

const COST_COLORS = {
  InputCost: '#60a5fa',
  OutputCost: '#34d399',
  ReasoningCost: '#fbbf24'
};

interface LLMUsageProps {
  projectId: number;
}

interface TokenUsage {
  input: number;
  completion: number;
  reasoning: number;
}

interface CostUsage {
  input: number;
  output: number;
  reasoning: number;
}

interface LLMCall {
  model: string;
  token_usage: string;
  cost: string;
}

const LLMUsageAnalysis: React.FC<LLMUsageProps> = ({ projectId }) => {
  const [tokenData, setTokenData] = useState<any[]>([]);
  const [costData, setCostData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPercentage, setShowPercentage] = useState(false);
  const [summary, setSummary] = useState({
    totalTokens: 0,
    totalCost: 0,
    totalCalls: 0
  });

  const parseJsonString = (jsonString: string): any => {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Error parsing JSON string:', error);
      return {};
    }
  };

  const formatNumber = (value: number): string => {
    if (value === 0) return '0';
    if (value < 0.00001) return value.toExponential(2);
    return value.toFixed(5);
  };

  const calculatePercentages = (data: any[]) => {
    return data.map(item => {
      const total = Object.keys(item).reduce((sum, key) => {
        if (key !== 'model' && key !== 'Total' && key !== 'TotalCost') {
          return sum + (item[key] || 0);
        }
        return sum;
      }, 0);

      const percentages = { ...item };
      Object.keys(item).forEach(key => {
        if (key !== 'model' && key !== 'Total' && key !== 'TotalCost') {
          percentages[key] = total > 0 ? ((item[key] || 0) / total) * 100 : 0;
        }
      });
      return percentages;
    });
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const tracesResponse = await axios.get(`/api/projects/${projectId}/traces`);
      const traces = tracesResponse.data;
      
      let llmTokenUsage: Record<string, TokenUsage> = {};
      let llmCostUsage: Record<string, CostUsage> = {};
      let totalTokens = 0;
      let totalCost = 0;
      let totalCalls = 0;

      for (const trace of traces) {
        const traceResponse = await axios.get(`/api/traces/${trace.id}`);
        const traceData = traceResponse.data;
        
        traceData.llm_calls.forEach((call: LLMCall) => {
          const modelName = call.model;
          if (!llmTokenUsage[modelName]) {
            llmTokenUsage[modelName] = { input: 0, completion: 0, reasoning: 0 };
            llmCostUsage[modelName] = { input: 0, output: 0, reasoning: 0 };
          }
          const tokenUsage = parseJsonString(call.token_usage) as TokenUsage;
          const costUsage = parseJsonString(call.cost) as CostUsage;
          
          llmTokenUsage[modelName].input += tokenUsage.input || 0;
          llmTokenUsage[modelName].completion += tokenUsage.completion || 0;
          llmTokenUsage[modelName].reasoning += tokenUsage.reasoning || 0;
          
          llmCostUsage[modelName].input += costUsage.input || 0;
          llmCostUsage[modelName].output += costUsage.output || 0;
          llmCostUsage[modelName].reasoning += costUsage.reasoning || 0;

          totalTokens += (tokenUsage.input || 0) + (tokenUsage.completion || 0) + (tokenUsage.reasoning || 0);
          totalCost += (costUsage.input || 0) + (costUsage.output || 0) + (costUsage.reasoning || 0);
          totalCalls++;
        });
      }

      const formattedTokenData = Object.entries(llmTokenUsage).map(([model, usage]) => ({
        model,
        Input: usage.input,
        Output: usage.completion,
        Reasoning: usage.reasoning,
        Total: usage.input + usage.completion + usage.reasoning
      }));

      const formattedCostData = Object.entries(llmCostUsage).map(([model, usage]) => ({
        model,
        InputCost: usage.input,
        OutputCost: usage.output,
        ReasoningCost: usage.reasoning,
        TotalCost: usage.input + usage.output + usage.reasoning
      }));

      setTokenData(formattedTokenData);
      setCostData(formattedCostData);
      setSummary({ totalTokens, totalCost, totalCalls });
    } catch (err) {
      console.error('Error fetching LLM usage data:', err);
      setError('Failed to fetch LLM usage data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, pld: any) => sum + (pld.value || 0), 0);
      return (
        <div className="bg-white p-4 border rounded shadow">
          <p className="font-bold">{`${label}`}</p>
          {payload.map((pld: any) => (
            <p key={pld.name} style={{ color: pld.fill }}>
              {`${pld.name}: ${showPercentage ? (pld.value || 0).toFixed(2) + '%' : formatNumber(pld.value)}`}
            </p>
          ))}
          <p className="font-bold mt-2">
            {`Total: ${showPercentage ? '100%' : formatNumber(total)}`}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderChart = (data: any[], title: string, dataKeys: string[], colors: Record<string, string>) => (
    <div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={showPercentage ? calculatePercentages(data) : data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="model" />
          <YAxis 
            tickFormatter={(value) => showPercentage ? `${value.toFixed(0)}%` : formatNumber(value)}
            domain={showPercentage ? [0, 100] : [0, 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {dataKeys.map((key) => (
            <Bar key={key} dataKey={key} stackId="a" fill={colors[key]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-2">Loading LLM usage data...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center text-red-500 p-4">
          <p>{error}</p>
          <button
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={fetchData}
          >
            Retry
          </button>
        </div>
      );
    }

    if (tokenData.length === 0 || costData.length === 0) {
      return <div className="text-center p-4">No LLM usage data available</div>;
    }

    return (
      <div className="space-y-8">
        <div className="bg-gray-100 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Summary</h3>
          <p>Total Tokens Used: {summary.totalTokens.toLocaleString()}</p>
          <p>Total Cost: ${formatNumber(summary.totalCost)}</p>
          <p>Total LLM Calls: {summary.totalCalls.toLocaleString()}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="percentage-mode"
            checked={showPercentage}
            onCheckedChange={setShowPercentage}
          />
          <Label htmlFor="percentage-mode">Show as percentage</Label>
        </div>
        {renderChart(tokenData, "Token Usage", ["Input", "Output", "Reasoning"], TOKEN_COLORS)}
        {renderChart(costData, "Cost Analysis", ["InputCost", "OutputCost", "ReasoningCost"], COST_COLORS)}
      </div>
    );
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>LLM Usage Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
};

export default LLMUsageAnalysis;