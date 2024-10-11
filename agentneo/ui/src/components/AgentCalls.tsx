import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const AgentCalls = () => {
  const data = [
    {
      name: 'itinerary_agent.plan_itinerary',
      count: 3,
      avgDuration: 8.92,
      avgToolCalls: 0.00,
      avgLLMCalls: 0.00,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Calls</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>NAME</TableHead>
              <TableHead>COUNT</TableHead>
              <TableHead>AVG DURATION (S)</TableHead>
              <TableHead>AVG TOOL CALLS</TableHead>
              <TableHead>AVG LLM CALLS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <TableRow key={index}>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.count}</TableCell>
                <TableCell>{row.avgDuration.toFixed(2)}</TableCell>
                <TableCell>{row.avgToolCalls.toFixed(2)}</TableCell>
                <TableCell>{row.avgLLMCalls.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default AgentCalls;