import React from 'react';
import { TimelineData } from '../types/timeline';

interface TimelineDetailsProps {
  selectedEvent: TimelineData | null;
  overlappingEvents: TimelineData[];
  counts: {
    llms: number;
    tools: number;
    interactions: number;
    errors: number;
    agents: number;
  };
}

const TimelineDetails: React.FC<TimelineDetailsProps> = ({ selectedEvent, overlappingEvents, counts }) => {
  if (!selectedEvent) {
    return (
      <div className="h-full">
        <p className="text-gray-500">Select an event to view details</p>
      </div>
    );
  }

  const renderInteractionDetails = (details: any) => {
    if (details.interactions) {
      return (
        <div>
          <h3 className="font-semibold mb-2">Interactions ({details.interactions.length})</h3>
          {details.interactions.map((interaction: any, index: number) => (
            <div key={index} className="mb-4 p-2 bg-gray-50 rounded">
              <p className="font-medium">Type: {interaction.interaction_type}</p>
              <p className="mt-1 whitespace-pre-wrap">{interaction.content}</p>
            </div>
          ))}
        </div>
      );
    }
    
    return (
      <div>
        <p className="font-medium">Type: {details.interaction_type}</p>
        <p className="mt-1 whitespace-pre-wrap">{details.content}</p>
      </div>
    );
  };

  const renderEventDetails = () => {
    switch (selectedEvent.type) {
      case 'LLM':
        return (
          <>
            <div>
              <p className="font-semibold">Model:</p>
              <p>{selectedEvent.details.model}</p>
            </div>
            <div>
              <p className="font-semibold">Input:</p>
              <p className="whitespace-pre-wrap">{selectedEvent.details.input}</p>
            </div>
            <div>
              <p className="font-semibold">Output:</p>
              <p className="whitespace-pre-wrap">{selectedEvent.details.output}</p>
            </div>
          </>
        );
      case 'Tool':
        return (
          <>
            <div>
              <p className="font-semibold">Tool Name:</p>
              <p>{selectedEvent.details.name}</p>
            </div>
            <div>
              <p className="font-semibold">Input:</p>
              <p className="whitespace-pre-wrap">{JSON.stringify(selectedEvent.details.input, null, 2)}</p>
            </div>
            <div>
              <p className="font-semibold">Output:</p>
              <p className="whitespace-pre-wrap">{JSON.stringify(selectedEvent.details.output, null, 2)}</p>
            </div>
          </>
        );
      case 'Interaction':
        return renderInteractionDetails(selectedEvent.details);
      case 'Error':
        return (
          <div>
            <p className="font-semibold">Error Message:</p>
            <p className="text-red-600">{selectedEvent.details.error_message}</p>
          </div>
        );
      default:
        return (
          <div>
            <p className="whitespace-pre-wrap">{selectedEvent.details.content}</p>
            {selectedEvent.counts && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Statistics:</h3>
                <div className="grid grid-cols-2 gap-2">
                  <p>LLM Calls: {selectedEvent.counts.llms}</p>
                  <p>Tool Calls: {selectedEvent.counts.tools}</p>
                  <p>Interactions: {selectedEvent.counts.interactions}</p>
                  <p>Errors: {selectedEvent.counts.errors}</p>
                  <p>Agents: {selectedEvent.counts.agents}</p>
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="h-full">
      <h2 className="text-lg font-bold mb-4">Event Details</h2>
      <div className="space-y-4">
        <div>
          <p className="font-semibold">Type:</p>
          <p>{selectedEvent.type}</p>
        </div>
        <div>
          <p className="font-semibold">Parent:</p>
          <p>{selectedEvent.details.parentName}</p>
        </div>
        {renderEventDetails()}
      </div>
    </div>
  );
};

export default TimelineDetails;