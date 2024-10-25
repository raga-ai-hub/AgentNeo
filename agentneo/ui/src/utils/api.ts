import { Project, TraceHistoryItem, DetailedTraceComponents } from '../types/trace';

let BASE_URL: string | null = null;

const getBaseUrl = async (): Promise<string> => {
    if (BASE_URL) return BASE_URL;

    try {
        const response = await fetch('/api/port');
        if (!response.ok) throw new Error('Failed to fetch port');
        const { port } = await response.json();
        BASE_URL = `http://localhost:${port}/api`;
    } catch (error) {
        console.error('Error fetching port:', error);
        BASE_URL = 'http://localhost:3000/api'; // Fallback to default
    }

    return BASE_URL;
};

export const fetchProjects = async (): Promise<Project[]> => {
    const baseUrl = await getBaseUrl();
    const response = await fetch(`${baseUrl}/projects`);
    if (!response.ok) throw new Error('Failed to fetch projects');
    return response.json();
};

export const fetchTraces = async (projectId: number): Promise<TraceHistoryItem[]> => {
    const baseUrl = await getBaseUrl();
    const response = await fetch(`${baseUrl}/projects/${projectId}/traces`);
    if (!response.ok) throw new Error('Failed to fetch traces');
    return response.json();
};

export const fetchTraceDetails = async (traceId: string): Promise<DetailedTraceComponents> => {
    const baseUrl = await getBaseUrl();
    const response = await fetch(`${baseUrl}/traces/${traceId}`);
    if (!response.ok) throw new Error('Failed to fetch trace details');
    return response.json();
};