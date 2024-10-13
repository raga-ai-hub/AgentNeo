import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";

interface EvaluationTableProps {
  sortedData: any[];
  requestSort: (key: string) => void;
  resultFields: string[];
}

const EvaluationTable: React.FC<EvaluationTableProps> = ({ sortedData, requestSort, resultFields }) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());

  const toggleRowExpansion = (metric: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(metric)) {
        newSet.delete(metric);
      } else {
        newSet.add(metric);
      }
      return newSet;
    });
  };

  const toggleDetailExpansion = (metricId: string) => {
    setExpandedDetails(prev => {
      const newSet = new Set(prev);
      if (newSet.has(metricId)) {
        newSet.delete(metricId);
      } else {
        newSet.add(metricId);
      }
      return newSet;
    });
  };

  const renderCell = (cellData: any, field: string, metric: string, rowId: string) => {
    if (cellData === undefined || cellData === null || cellData === '') return <TableCell>-</TableCell>;

    let content;
    switch (field) {
      case 'trace_id':
        content = cellData;
        break;
      case 'score':
        content = typeof cellData === 'number' ? cellData.toFixed(2) : cellData;
        break;
      case 'reason':
        const isReasonExpanded = expandedRows.has(metric);
        const truncatedReason = cellData.length > 50 ? cellData.substring(0, 50) + '...' : cellData;
        content = (
          <div 
            className="cursor-pointer text-blue-600 hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              toggleRowExpansion(metric);
            }}
          >
            {isReasonExpanded ? cellData : truncatedReason}
          </div>
        );
        break;
      case 'result_detail':
        const isDetailExpanded = expandedDetails.has(rowId);
        let detailContent;
        try {
          const parsedData = JSON.parse(cellData);
          detailContent = JSON.stringify(parsedData, null, 2);
        } catch {
          detailContent = cellData;
        }
        const truncatedDetail = detailContent.length > 50 ? detailContent.substring(0, 50) + '...' : detailContent;
        content = (
          <div 
            className="cursor-pointer text-blue-600 hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              toggleDetailExpansion(rowId);
            }}
          >
            <pre className="whitespace-pre-wrap overflow-hidden text-xs">
              {isDetailExpanded ? detailContent : truncatedDetail}
            </pre>
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
      case 'start_time':
      case 'end_time':
        content = new Date(cellData).toLocaleString();
        break;
      case 'duration':
        content = typeof cellData === 'number' ? `${cellData.toFixed(2)}s` : cellData;
        break;
      default:
        content = String(cellData);
    }

    return (
      <TableCell className="relative">
        {content}
      </TableCell>
    );
  };

  const headers = ['Metric', ...resultFields];

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {headers.map(header => (
            <TableHead key={header}>
              <Button variant="ghost" onClick={() => requestSort(header)}>
                {header.charAt(0).toUpperCase() + header.slice(1).replace(/_/g, ' ')} <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedData.map((row) => (
          <TableRow 
            key={row.metric}
            className="hover:bg-gray-100"
          >
            <TableCell>{row.metric}</TableCell>
            {resultFields.map(field => renderCell(row.results[0]?.[field], field, row.metric, `${row.metric}-${row.results[0]?.trace_id}`))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default EvaluationTable;