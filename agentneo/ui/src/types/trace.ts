export interface Project {
    id: number;
    name: string;
}

export interface TraceHistoryItem {
    id: string;
    start_time: string;
    duration: number;
    llm_call_count: number;
    tool_call_count: number;
    agent_call_count: number;
    error_count: number;
}

export interface TraceComponent {
    name: string;
    type: 'agent' | 'tool' | 'llm' | 'network' | 'user';
    duration: string;
    status: 'success' | 'error' | 'warning';
    details: string;
    input?: any;
    output?: any;
    children?: TraceComponent[];
}

export interface DetailedTraceComponents {
    id: string;
    duration: string;
    errors: number;
    components: TraceComponent[];
}