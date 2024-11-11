import React from 'react';
import { TimelineData } from '../types/timeline';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Clock, 
  Calendar, 
  Bot, 
  Cpu, 
  Wrench, 
  AlertCircle, 
  MessageSquare, 
  DollarSign,
  Hash,
  Coins,
  Hash as TokenIcon
} from 'lucide-react';

interface TimelineDetailsProps {
  selectedEvent: TimelineData | null;
}

const TimelineDetails: React.FC<TimelineDetailsProps> = ({ selectedEvent }) => {
  if (!selectedEvent) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 italic">
        Select an event to view details
      </div>
    );
  }

  const startTime = new Date(selectedEvent.startTime);
  const endTime = new Date(selectedEvent.endTime);
  const duration = (endTime.getTime() - startTime.getTime()) / 1000;

  const getEventIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'trace': return <Bot className="w-5 h-5" />;
      case 'agent': return <Bot className="w-5 h-5" />;
      case 'llm': return <Cpu className="w-5 h-5" />;
      case 'tool': return <Wrench className="w-5 h-5" />;
      case 'error': return <AlertCircle className="w-5 h-5" />;
      case 'interaction': return <MessageSquare className="w-5 h-5" />;
      default: return <Hash className="w-5 h-5" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'trace': return 'bg-blue-100 text-blue-800';
      case 'agent': return 'bg-blue-100 text-blue-800';
      case 'llm': return 'bg-green-100 text-green-800';
      case 'tool': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'interaction': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <ScrollArea className="h-[calc(70vh-2rem)] pr-4">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            {getEventIcon(selectedEvent.type)}
            <h3 className="text-lg font-semibold">{selectedEvent.name}</h3>
          </div>
          <Badge variant="secondary" className={`${getEventColor(selectedEvent.type)}`}>
            {selectedEvent.type}
          </Badge>
        </div>

        {/* Timing Section */}
        <div className="space-y-3 bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center space-x-2 text-gray-700">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">Start: {startTime.toLocaleString()}</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-700">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">End: {endTime.toLocaleString()}</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-700">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Duration: {duration.toFixed(2)}s</span>
          </div>
        </div>

        {/* Details Section */}
        {selectedEvent.details && (
          <div className="space-y-4">
            {/* Agent Details */}
            {selectedEvent.details.agent && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Agent Details</h4>
                <p className="text-sm text-blue-700">{selectedEvent.details.agent}</p>
              </div>
            )}

            {/* LLM Details */}
            {selectedEvent.type.toLowerCase() === 'llm' && (
              <div className="bg-green-50 p-3 rounded-lg space-y-3">
                {/* <h4 className="font-medium text-green-800">LLM Details</h4> */}
                <div className="space-y-2">
                  {selectedEvent.details.model && (
                    <div className="flex items-center space-x-2 text-green-700">
                      <Cpu className="w-4 h-4" />
                      <span className="text-sm">Model: {selectedEvent.details.model}</span>
                    </div>
                  )}
                  {/* {selectedEvent.details.token_usage && (
                    <div className="flex items-center space-x-2 text-green-700">
                      <TokenIcon className="w-4 h-4" />
                      <span className="text-sm">Tokens: {selectedEvent.details.token_usage}</span>
                    </div>
                  )}
                  {selectedEvent.details.cost && (
                    <div className="flex items-center space-x-2 text-green-700">
                      <Coins className="w-4 h-4" />
                      <span className="text-sm">Cost: ${selectedEvent.details.cost.toFixed(4)}</span>
                    </div>
                  )} */}
                </div>
                {selectedEvent.details.input && (
                  <div className="mt-3">
                    <h4 className="font-medium text-green-800 mb-2">Prompt</h4>
                    <div className="text-sm bg-white/50 p-3 rounded-lg whitespace-pre-wrap text-green-900">
                      {selectedEvent.details.input}
                    </div>
                  </div>
                )}
                {selectedEvent.details.output && (
                  <div className="mt-3">
                    <h4 className="font-medium text-green-800 mb-2">Response</h4>
                    <div className="text-sm bg-white/50 p-3 rounded-lg whitespace-pre-wrap text-green-900">
                      {selectedEvent.details.output}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tool Details */}
            {selectedEvent.type.toLowerCase() === 'tool' && (
              <div className="bg-yellow-50 p-3 rounded-lg space-y-3">
                {/* <h4 className="font-medium text-yellow-800">Tool Details</h4> */}
                {/* {selectedEvent.details.function && (
                  <div className="text-sm text-yellow-700">
                    <span className="font-medium">Function: </span>
                    {selectedEvent.details.function}
                  </div>
                )} */}
                {selectedEvent.details.input && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-yellow-800">Input</h4>
                    <pre className="text-sm bg-white/50 p-3 rounded-lg overflow-x-auto text-yellow-900">
                      {selectedEvent.details.input}
                    </pre>
                  </div>
                )}
                {selectedEvent.details.output && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-yellow-800">Output</h4>
                    <pre className="text-sm bg-white/50 p-3 rounded-lg overflow-x-auto text-yellow-900">
                      {selectedEvent.details.output}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Error Details */}
            {selectedEvent.details.error_message && (
              <div className="bg-red-50 p-3 rounded-lg space-y-2">
                <h4 className="font-medium text-red-800">Error</h4>
                <pre className="text-sm text-red-700 whitespace-pre-wrap">
                  {selectedEvent.details.error_message}
                </pre>
              </div>
            )}

            {/* Interaction Details */}
            {selectedEvent.type.toLowerCase() === 'interaction' && selectedEvent.details.content && (
              <div className="bg-purple-50 p-3 rounded-lg space-y-2">
                <h4 className="font-medium text-purple-800">Interaction Content</h4>
                <div className="text-sm bg-white/50 p-3 rounded-lg whitespace-pre-wrap text-purple-900">
                  {selectedEvent.details.content}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ScrollArea>
  );
};

export default TimelineDetails;