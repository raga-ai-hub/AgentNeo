import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import axios from 'axios';
import { Loader2 } from 'lucide-react';

interface TimeData {
  name: string;
  size: number;
  value: string;
  percentage: string;
}

const COLORS = ['#3b82f6', '#22c55e'];

const TimeAnalysis: React.FC = () => {
  const [timeData, setTimeData] = useState<TimeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTimeData();
  }, []);

  const fetchTimeData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const projectsResponse = await axios.get('/api/projects');
      const projects = projectsResponse.data;

      let totalLLMTime = 0;
      let totalToolTime = 0;

      for (const project of projects) {
        const tracesResponse = await axios.get(`/api/projects/${project.id}/traces`);
        const traces = tracesResponse.data;

        for (const trace of traces) {
          const traceResponse = await axios.get(`/api/analysis_traces/${trace.id}`);
          const traceData = traceResponse.data;

          // Sum up LLM call times
          totalLLMTime += traceData.llm_calls.reduce((sum: number, call: any) => sum + call.duration, 0);

          // Sum up tool call times
          totalToolTime += traceData.tool_calls.reduce((sum: number, call: any) => sum + call.duration, 0);
        }
      }

      const totalTime = totalLLMTime + totalToolTime;

      const data: TimeData[] = [
        {
          name: 'LLM Calls',
          size: totalLLMTime,
          value: `${(totalLLMTime / 1000).toFixed(2)}s`,
          percentage: `${((totalLLMTime / totalTime) * 100).toFixed(1)}%`
        },
        {
          name: 'Tool Calls',
          size: totalToolTime,
          value: `${(totalToolTime / 1000).toFixed(2)}s`,
          percentage: `${((totalToolTime / totalTime) * 100).toFixed(1)}%`
        }
      ];

      setTimeData(data);
    } catch (err) {
      console.error('Error fetching time data:', err);
      setError('Failed to fetch time data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-2">Loading time analysis data...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center text-red-500 p-4">
          <p>{error}</p>
          <button
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={fetchTimeData}
          >
            Retry
          </button>
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <Treemap
          data={[{ name: 'Time Analysis', children: timeData }]}
          dataKey="size"
          stroke="#fff"
          content={<CustomizedContent colors={COLORS} />}
        >
          <Tooltip content={<CustomTooltip />} />
        </Treemap>
      </ResponsiveContainer>
    );
  };

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Time Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
};

const CustomizedContent: React.FC<any> = ({ root, depth, x, y, width, height, index, colors, name }) => {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: colors[index % colors.length],
          stroke: '#fff',
          strokeWidth: 2,
          strokeOpacity: 1,
        }}
      />
      {
        depth === 1 && (
          <text x={x + width / 2} y={y + height / 2} textAnchor="middle" fill="#fff" fontSize={14}>
            {name}
          </text>
        )
      }
    </g>
  );
};

const CustomTooltip: React.FC<any> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-2 border rounded shadow">
        <p className="font-bold">{data.name}</p>
        <p>{`Time: ${data.value}`}</p>
        <p>{`Percentage: ${data.percentage}`}</p>
      </div>
    );
  }
  return null;
};

export default TimeAnalysis;