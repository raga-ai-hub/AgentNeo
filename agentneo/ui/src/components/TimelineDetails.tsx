import React from 'react';

interface TimelineData {
  name: string;
  start: number;
  duration: number;
  color: string;
  type: string;
  row: string;
  details?: {
    agent?: string;
    function?: string;
    input?: string;
    output?: string;
  };
}

interface TimelineDetailsProps {
  selectedEvent: TimelineData | null;
}

const TimelineDetails: React.FC<TimelineDetailsProps> = ({ selectedEvent }) => {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Details</h3>
      {selectedEvent ? (
        <>
          <p><strong>Tool:</strong> {selectedEvent.name}</p>
          {selectedEvent.details && (
            <>
              <p><strong>Agent:</strong> {selectedEvent.details.agent}</p>
              <p><strong>Start - End:</strong> {selectedEvent.start}s - {selectedEvent.start + selectedEvent.duration}s</p>
              <p><strong>Duration:</strong> {selectedEvent.duration}s</p>
              <p><strong>Function:</strong> {selectedEvent.details.function}</p>
              <p><strong>Input:</strong> {selectedEvent.details.input}</p>
              <p><strong>Output:</strong> {selectedEvent.details.output}</p>
            </>
          )}
        </>
      ) : (
        <p>Select an event to see details</p>
      )}
      
      <h3 className="text-lg font-semibold mt-6 mb-4">Performance Summary</h3>
      <p>Total Duration: 3m 12s</p>
      <p>LLM Calls: 3 (1,500 tokens)</p>
      <p>Tool Calls: 2</p>
      <p>Errors: 1</p>
      <p>Avg. Response Time: 0.8s</p>
      <p>Cost Estimate: $0.03</p>
    </div>
  );
};

export default TimelineDetails;