import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TimelineControls from './TimelineControls';
import TimelineDetails from './TimelineDetails';
import TimelineLegend from './TimelineLegend';
import TimelineRows from './TimelineRows';
import TimelineContent from './TimelineContent';
import { TimelineData } from '../types/timeline';
import { fetchTracesForProject, fetchTimelineData } from '../utils/databaseUtils';

interface ExecutionTimelineProps {
  projectId: number | null;
}

const ExecutionTimeline: React.FC<ExecutionTimelineProps> = ({ projectId }) => {
  const [selectedEvent, setSelectedEvent] = useState<TimelineData | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [zoom, setZoom] = useState(100);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [selectedTrace, setSelectedTrace] = useState<string | null>(null);
  const [traces, setTraces] = useState<{ id: string; name: string }[]>([]);
  const [timelineData, setTimelineData] = useState<TimelineData[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTraces = async () => {
      if (projectId) {
        setIsLoading(true);
        try {
          const fetchedTraces = await fetchTracesForProject(projectId);
          setTraces(fetchedTraces);
          if (fetchedTraces.length > 0 && !selectedTrace) {
            setSelectedTrace(fetchedTraces[0].id);
          }
        } catch (error) {
          console.error('Error fetching traces:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchTraces();
  }, [projectId]);

  useEffect(() => {
    const loadTimelineData = async () => {
      if (projectId && selectedTrace) {
        setIsLoading(true);
        try {
          console.log('Fetching timeline data for project:', projectId, 'and trace:', selectedTrace);
          const fetchedTimelineData = await fetchTimelineData(projectId, selectedTrace);
          console.log('Fetched timeline data:', fetchedTimelineData);
          setTimelineData(fetchedTimelineData);
        } catch (error) {
          console.error('Error fetching timeline data:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    loadTimelineData();
  }, [projectId, selectedTrace]);

  const { totalDuration, rows } = useMemo(() => {
    if (!timelineData) {
      return { totalDuration: 0, rows: [] };
    }
    const duration = Math.max(...timelineData.map(event => event.start + event.duration));
    const uniqueRows = Array.from(new Set(timelineData.map(event => event.row)));
    return { totalDuration: duration, rows: uniqueRows };
  }, [timelineData]);

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

  if (isLoading) {
    return <div>Loading timeline data...</div>;
  }

  if (!timelineData || timelineData.length === 0) {
    return <div>No timeline data available.</div>;
  }

  return (
    <Card className="mt-8 bg-white shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold">Execution Timeline</CardTitle>
        <Select value={selectedTrace || ''} onValueChange={(value) => setSelectedTrace(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select trace" />
          </SelectTrigger>
          <SelectContent>
            {traces.map((trace) => (
              <SelectItem key={trace.id} value={trace.id}>{trace.name}</SelectItem>
            ))}
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