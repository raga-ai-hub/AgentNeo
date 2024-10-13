export interface TimelineData {
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
