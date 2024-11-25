import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { fetchProjects, fetchTraces } from '../utils/api';

// API response interfaces
interface APIProject {
  id: number;
  project_name: string;
  start_time: string;
  end_time: string;
  duration: number;
  total_cost: number;
  total_tokens: number;
}

// Internal interfaces used by the application
interface Project {
  id: number;
  name: string;
}

interface Trace {
  id: string;
  name: string;
}

interface ProjectContextType {
  selectedProject: number | null;
  setSelectedProject: (id: number | null) => void;
  selectedTraceId: string | null;
  setSelectedTraceId: (id: string | null) => void;
  selectedTrace: any | null;
  setSelectedTrace: (trace: any | null) => void;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  traces: Trace[];
  setTraces: React.Dispatch<React.SetStateAction<Trace[]>>;
  worker: any;
  setError: (error: string) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};

interface ProjectProviderProps {
  children: ReactNode;
}

export const ProjectProvider: React.FC<ProjectProviderProps> = ({ children }) => {
  const [selectedProject, setSelectedProject] = useState<number | null>(() => {
    const stored = localStorage.getItem('selectedProject');
    return stored ? Number(stored) : null;
  });
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(() => {
    return localStorage.getItem('selectedTraceId');
  });
  const [selectedTrace, setSelectedTrace] = useState<any | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [traces, setTraces] = useState<Trace[]>([]);
  const [worker] = useState<any>(null);

  const setError = useCallback((error: string) => {
    console.error(error);
  }, []);

  const loadProjects = useCallback(async () => {
    try {
      const response = await fetchProjects();
      // Double type assertion to safely convert the response
      const fetchedProjects = (response as unknown) as APIProject[];
      const transformedProjects = fetchedProjects.map(p => ({
        id: p.id,
        name: p.project_name
      }));
      setProjects(transformedProjects);
      if (transformedProjects.length > 0 && !selectedProject) {
        setSelectedProject(transformedProjects[0].id);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      setError('Failed to load projects');
    }
  }, [setError, selectedProject]);

  const loadTraces = useCallback(async (projectId: number) => {
    try {
      const fetchedTraces = await fetchTraces(projectId);
      const transformedTraces = fetchedTraces.map(t => ({
        id: t.id,
        name: `Trace ${t.id} - ${new Date(t.start_time).toLocaleString()}`
      }));
      setTraces(transformedTraces);
      if (transformedTraces.length > 0 && !selectedTraceId) {
        setSelectedTraceId(transformedTraces[0].id);
      }
    } catch (error) {
      console.error('Error loading traces:', error);
      setError('Failed to load traces');
    }
  }, [setError, selectedTraceId]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (selectedProject) {
      localStorage.setItem('selectedProject', selectedProject.toString());
      loadTraces(selectedProject);
    } else {
      setTraces([]);
      setSelectedTraceId(null);
    }
  }, [selectedProject, loadTraces]);

  useEffect(() => {
    if (selectedTraceId) {
      localStorage.setItem('selectedTraceId', selectedTraceId);
    } else {
      localStorage.removeItem('selectedTraceId');
    }
  }, [selectedTraceId]);

  const contextSetSelectedProject = useCallback((id: number | null) => {
    setSelectedProject(id);
    setSelectedTraceId(null); // Reset trace when changing project
  }, []);

  const contextSetSelectedTraceId = useCallback((id: string | null) => {
    setSelectedTraceId(id);
  }, []);

  const contextValue = useMemo(() => ({
    selectedProject,
    setSelectedProject: contextSetSelectedProject,
    selectedTraceId,
    setSelectedTraceId: contextSetSelectedTraceId,
    selectedTrace,
    setSelectedTrace,
    projects,
    setProjects,
    traces,
    setTraces,
    worker,
    setError
  }), [
    selectedProject,
    contextSetSelectedProject,
    selectedTraceId,
    contextSetSelectedTraceId,
    selectedTrace,
    projects,
    traces,
    worker,
    setError
  ]);

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
    </ProjectContext.Provider>
  );
};