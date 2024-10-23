import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";

interface EvaluationTableProps {
  sortedData: any[];
  requestSort: (key: string) => void;
  metricNames: string[];
}

const EvaluationTable: React.FC<EvaluationTableProps> = ({ sortedData, requestSort, metricNames }) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());

  const toggleRowExpansion = (traceId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(traceId)) {
        newSet.delete(traceId);
      } else {
        newSet.add(traceId);
      }
      return newSet;
    });
  };

  const toggleDetailExpansion = (cellId: string) => {
    setExpandedDetails(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cellId)) {
        newSet.delete(cellId);
      } else {
        newSet.add(cellId);
      }
      return newSet;
    });
  };

  const renderCell = (cellData: any, field: string, traceId: string) => {
    if (cellData === undefined || cellData === null || cellData === '') return <TableCell>-</TableCell>;

    const cellId = `${traceId}-${field}`;
    let content;

    switch (field) {
      case 'score':
        content = typeof cellData === 'number' ? cellData.toFixed(2) : cellData;
        break;
      case 'reason':
      case 'result_detail':
        const isExpanded = expandedDetails.has(cellId);
        const truncatedContent = cellData.length > 50 ? cellData.substring(0, 50) + '...' : cellData;
        content = (
          <div 
            className="cursor-pointer text-blue-600 hover:underline"
            onClick={() => toggleDetailExpansion(cellId)}
          >
            {isExpanded ? cellData : truncatedContent}
          </div>
        );
        break;
      case 'config':
        try {
          const parsedData = JSON.parse(cellData);
          content = (
            <pre className="whitespace-pre-wrap overflow-hidden text-xs">
              {JSON.stringify(parsedData, null, 2)}
            </pre>
          );
        } catch {
          content = cellData;
        }
        break;
      default:
        content = String(cellData);
    }

    return <TableCell key={cellId}>{content}</TableCell>;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            <Button variant="ghost" onClick={() => requestSort('trace_id')}>
              Trace ID <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </TableHead>
          {metricNames.map(metric => (
            <TableHead key={metric}>
              <Button variant="ghost" onClick={() => requestSort(metric)}>
                {metric.charAt(0).toUpperCase() + metric.slice(1).replace(/_/g, ' ')} <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedData.map((row) => (
          <React.Fragment key={row.trace_id}>
            <TableRow 
              className="hover:bg-gray-100 cursor-pointer"
              onClick={() => toggleRowExpansion(row.trace_id)}
            >
              <TableCell>{row.trace_id}</TableCell>
              {metricNames.map(metric => (
                <TableCell key={`${row.trace_id}-${metric}`}>
                  {renderCell(row[metric]?.score, 'score', row.trace_id)}
                </TableCell>
              ))}
            </TableRow>
            {expandedRows.has(row.trace_id) && (
              <TableRow className="bg-gray-50">
                <TableCell></TableCell>
                {metricNames.map(metric => (
                  <TableCell key={`${row.trace_id}-${metric}-details`}>
                    <div>Reason: {renderCell(row[metric]?.reason, 'reason', row.trace_id)}</div>
                    <div>Details: {renderCell(row[metric]?.result_detail, 'result_detail', row.trace_id)}</div>
                  </TableCell>
                ))}
              </TableRow>
            )}
          </React.Fragment>
        ))}
      </TableBody>
    </Table>
  );
};

export default EvaluationTable;