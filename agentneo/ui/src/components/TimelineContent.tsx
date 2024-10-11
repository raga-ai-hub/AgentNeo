import React from 'react';
import TimelineEvents from './TimelineEvents';
import { TimelineData } from '../types/timeline';

interface TimelineContentProps {
  timelineRef: React.RefObject<HTMLDivElement>;
  zoom: number;
  rows: string[];
  timelineData: TimelineData[];
  totalDuration: number;
  currentTime: number;
  handleEventClick: (event: TimelineData) => void;
}

const TimelineContent: React.FC<TimelineContentProps> = ({
  timelineRef,
  zoom,
  rows,
  timelineData,
  totalDuration,
  currentTime,
  handleEventClick
}) => {
  const renderTimeTicks = () => {
    const ticks = [];
    const tickInterval = 30; // 30 second interval
    for (let i = 0; i <= totalDuration; i += tickInterval) {
      const minutes = Math.floor(i / 60);
      const seconds = i % 60;
      ticks.push(
        <div key={i} className="absolute text-xs text-gray-500" style={{ left: `${(i / totalDuration) * 100}%` }}>
          <div className="h-2 border-l border-gray-300"></div>
          <div>{`${minutes}:${seconds.toString().padStart(2, '0')}`}</div>
        </div>
      );
    }
    return ticks;
  };

  return (
    <div className="w-5/6">
      <div className="relative" style={{ height: `${rows.length * 48 + 50}px`, overflowX: 'auto', overflowY: 'hidden' }} ref={timelineRef}>
        <div style={{ width: `${zoom}%`, minWidth: '100%', height: '100%', position: 'relative' }}>
          <TimelineEvents
            timelineData={timelineData}
            totalDuration={totalDuration}
            rows={rows}
            handleEventClick={handleEventClick}
          />
          <div
            className="absolute top-0 w-px h-full bg-red-500"
            style={{ left: `${(currentTime / totalDuration) * 100}%` }}
          ></div>
          <div className="absolute bottom-0 left-0 right-0 h-10 border-t border-gray-300">
            {renderTimeTicks()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineContent;