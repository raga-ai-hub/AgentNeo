export interface InteractionDetail {
  interaction_type: string;
  content: string;
}

export interface TimelineEventDetails {
  name?: string;
  parentName: string;
  interactions?: InteractionDetail[];
  model?: string;
  input?: string;
  output?: string;
  content?: string;
  error_message?: string;
  agent?: string;
}

export interface TimelineData {
  name: string;
  startTime: string;
  endTime: string;
  duration: number;
  color: string;
  type: string;
  row: string;
  isDot?: boolean;
  details: TimelineEventDetails;
  counts?: {
    llms: number;
    tools: number;
    interactions: number;
    errors: number;
    agents: number;
  };
}