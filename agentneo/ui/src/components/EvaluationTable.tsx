import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";

interface EvaluationTableProps {
  sortedData: any[];
  requestSort: (key: string) => void;
}

const EvaluationTable: React.FC<EvaluationTableProps> = ({ sortedData, requestSort }) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpansion = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const renderCell = (row: any, key: string) => {
    const isExpanded = expandedRows.has(row.id);
    const fullReason = row[key].reason;
    const truncatedReason = fullReason.length > 50 ? fullReason.substring(0, 50) + '...' : fullReason;

    return (
      <TableCell key={key} className="relative">
        <div>{row[key].score.toFixed(2)}</div>
        <div className="text-sm text-gray-600">
          {isExpanded ? fullReason : truncatedReason}
        </div>
      </TableCell>
    );
  };

  const headers = ['id', 'type', 'input', 'toolSelection', 'toolUsage', 'goalDecomp', 'planAdapt', 'executionError'];

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {headers.map(header => (
            <TableHead key={header}>
              {header === 'type' || header === 'input' ? (
                header.charAt(0).toUpperCase() + header.slice(1)
              ) : (
                <Button variant="ghost" onClick={() => requestSort(header)}>
                  {header.charAt(0).toUpperCase() + header.slice(1)} <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              )}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedData.map((row) => (
          <TableRow 
            key={row.id}
            className="cursor-pointer hover:bg-gray-100"
            onClick={() => toggleRowExpansion(row.id)}
          >
            <TableCell>{row.id}</TableCell>
            <TableCell>{row.type}</TableCell>
            <TableCell>{row.input}</TableCell>
            {['toolSelection', 'toolUsage', 'goalDecomp', 'planAdapt', 'executionError'].map(key => renderCell(row, key))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default EvaluationTable;