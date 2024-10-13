import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';

const data = [
  { name: 'GPT-4', value: 45 },
  { name: 'GPT-3.5', value: 35 },
  { name: 'Other', value: 20 },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b'];

const LLMUsageAnalysis: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>LLM Usage Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Legend />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-4 flex justify-around">
          {data.map((entry, index) => (
            <div key={entry.name} className="text-center">
              <div className="font-semibold">{entry.name}</div>
              <div className="text-sm text-gray-500">({entry.value}%)</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default LLMUsageAnalysis;