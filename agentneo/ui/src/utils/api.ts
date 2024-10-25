import { Project, TraceHistoryItem, DetailedTraceComponents } from '../types/trace';

let BASE_URL: string | null = null;

const getBaseUrl = async (): Promise<string> => {
    if (BASE_URL) return BASE_URL;

    const defaultPort = 3000;
    const initialBaseUrl = `http://localhost:${defaultPort}`;

    try {
        const response = await fetch(`${initialBaseUrl}/api/port`);
        if (!response.ok) throw new Error('Failed to fetch port');
        const { port } = await response.json();
        BASE_URL = `http://localhost:${port}/api`;

        console.log('BASE_URL:', BASE_URL);
    } catch (error) {
        console.error('Error fetching port:', error);
        BASE_URL = `${initialBaseUrl}/api`; // Fallback to default
        console.log('BASE_URL:', BASE_URL);
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