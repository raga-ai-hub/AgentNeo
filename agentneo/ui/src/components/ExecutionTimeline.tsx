import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TimelineControls from './TimelineControls';
import TimelineDetails from './TimelineDetails';
import TimelineLegend from './TimelineLegend';
import TimelineRows from './TimelineRows';
import TimelineContent from './TimelineContent';
import { TimelineData } from '../types/timeline';

const timelineData: TimelineData[] = [
  { name: 'Main', start: 0, duration: 192, color: '#4285F4', type: 'Action', row: 'Main' },
  { name: 'LLM Call 1', start: 10, duration: 40, color: '#34A853', type: 'LLM', row: 'LLM' },
  { name: 'Web Search', start: 63, duration: 86, color: '#FBBC05', type: 'Tool', row: 'Tool 1', details: {
    agent: 'Job Description Writer',
    function: 'Search the internet',
    input: 'AI job trends 2024',
    output: '[Truncated result summary]'
  }},
  { name: 'LLM Call 2', start: 70, duration: 30, color: '#34A853', type: 'LLM', row: 'LLM' },
  { name: 'Data Processing', start: 100, duration: 30, color: '#FBBC05', type: 'Tool', row: 'Tool 2' },
  { name: 'API Timeout', start: 110, duration: 5, color: '#EA4335', type: 'Error', row: 'Error' },
  { name: 'LLM Call 3', start: 130, duration: 50, color: '#34A853', type: 'LLM', row: 'LLM' },
];

const ExecutionTimeline: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<TimelineData | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [selectedTrace, setSelectedTrace] = useState("trace1");
  const timelineRef = useRef<HTMLDivElement>(null);

  const totalDuration = Math.max(...timelineData.map(event => event.start + event.duration));
  const rows = ['Main', 'LLM', 'Tool 1', 'Tool 2', 'Error'];

  const handleEventClick = (event: TimelineData) => {
    setSelectedEvent(event);
    setCurrentTime(event.start);
  };

  useEffect(() => {
    if (timelineRef.current) {
      const timelineWidth = timelineRef.current.offsetWidth;
      const scrollPosition = (currentTime / totalDuration) * timelineWidth * (zoom / 100) - timelineWidth / 2;
      timelineRef.current.scrollLeft = scrollPosition;
    }
  }, [currentTime, zoom, totalDuration]);

  return (
    <Card className="mt-8 bg-white shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold">Execution Timeline</CardTitle>
        <Select value={selectedTrace} onValueChange={setSelectedTrace}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select trace" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="trace1">Trace 1</SelectItem>
            <SelectItem value="trace2">Trace 2</SelectItem>
            <SelectItem value="trace3">Trace 3</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="flex">
          <div className="w-3/4 pr-4">
            <TimelineControls
              zoom={zoom}
              setZoom={setZoom}
              currentTime={currentTime}
              setCurrentTime={setCurrentTime}
              totalDuration={totalDuration}
            />
            <TimelineLegend timelineData={timelineData} />
            <div className="flex">
              <TimelineRows rows={rows} />
              <TimelineContent
                timelineRef={timelineRef}
                zoom={zoom}
                rows={rows}
                timelineData={timelineData}
                totalDuration={totalDuration}
                currentTime={currentTime}
                handleEventClick={handleEventClick}
              />
            </div>
          </div>
          <div className="w-1/4 pl-4 border-l border-gray-200">
            <TimelineDetails selectedEvent={selectedEvent} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExecutionTimeline;