import { Project, TraceHistoryItem, DetailedTraceComponents } from '../types/trace';


const BASE_URL = `${process.env.AGENTNEO_DASHBOARD_URL || 'http://localhost:3000'}/api`;

export const fetchProjects = async (): Promise<Project[]> => {
    const response = await fetch(`${BASE_URL}/projects`);
    if (!response.ok) throw new Error('Failed to fetch projects');
    return response.json();
};

export const fetchTraces = async (projectId: number): Promise<TraceHistoryItem[]> => {
    const response = await fetch(`${BASE_URL}/projects/${projectId}/traces`);
    if (!response.ok) throw new Error('Failed to fetch traces');
    return response.json();
};

export const fetchTraceDetails = async (traceId: string): Promise<DetailedTraceComponents> => {
    const response = await fetch(`${BASE_URL}/traces/${traceId}`);
    if (!response.ok) throw new Error('Failed to fetch trace details');
    return response.json();
};