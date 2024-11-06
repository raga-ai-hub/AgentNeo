import axios from 'axios';
import { Project, TraceHistoryItem, DetailedTraceComponents } from '../types/trace';

let BASE_URL: string | null = null;

const getBaseUrl = async (): Promise<string> => {
    if (BASE_URL) return BASE_URL;

    try {
        const response = await fetch('/api/port');
        if (!response.ok) throw new Error('Failed to fetch port');
        const { port } = await response.json();
        BASE_URL = `http://localhost:${port}/api`;
        console.log('BASE_URL:', BASE_URL);
    } catch (error) {
        console.error('Error fetching port:', error);
        BASE_URL = '/api'; // Fallback to default
        console.log('BASE_URL:', BASE_URL);
    }

    return BASE_URL;
};

// ... existing imports and code ...

export const fetchMetrics = async (projectId: number, traceId: string | null): Promise<any[]> => {
    const baseUrl = await getBaseUrl();
    const url = traceId 
        ? `${baseUrl}/projects/${projectId}/metrics?trace_id=${traceId}`
        : `${baseUrl}/projects/${projectId}/metrics`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch metrics');
    return response.json();
};

// ... rest of the existing code ...

export const fetchProjects = async (): Promise<Project[]> => {
    const baseUrl = await getBaseUrl();
    const response = await fetch(`${baseUrl}/projects`);
    if (!response.ok) throw new Error('Failed to fetch projects');
    return response.json();
};

export const fetchProjectDetails = async (projectId: number): Promise<any> => {
    const baseUrl = await getBaseUrl();
    const response = await fetch(`${baseUrl}/projects/${projectId}`);
    if (!response.ok) throw new Error('Failed to fetch project details');
    return response.json();
};


export const fetchTraces = async (projectId: number): Promise<TraceHistoryItem[]> => {
    const baseUrl = await getBaseUrl();
    const response = await fetch(`${baseUrl}/projects/${projectId}/traces`);
    if (!response.ok) throw new Error('Failed to fetch traces');

    return response.json();
};

export const fetchTraceDetails = async (traceId: string): Promise<any> => {
    const baseUrl = await getBaseUrl();
    const response = await fetch(`${baseUrl}/traces/${traceId}`);
    if (!response.ok) throw new Error('Failed to fetch trace details');
    return response.json();
};


// export const fetchTimelineData = async (projectId: number, traceId: string): Promise<any[]> => {
//     const baseUrl = await getBaseUrl();
//     const response = await fetch(`${baseUrl}/projects/${projectId}/traces/${traceId}`);
//     if (!response.ok) throw new Error('Failed to fetch timeline data');
//     return response.json();
// }


export const fetchAnalysisTrace = async (traceId: string): Promise<any> => {
    const baseUrl = await getBaseUrl();
    const response = await fetch(`${baseUrl}/analysis_traces/${traceId}`);
    if (!response.ok) throw new Error('Failed to fetch analysis trace');
    return response.json();
};