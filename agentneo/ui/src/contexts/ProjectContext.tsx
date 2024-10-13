import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { fetchAllProjects } from '../utils/databaseUtils';


interface Project {
  id: number;
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
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [selectedTrace, setSelectedTrace] = useState<any | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [worker] = useState<any>(null);
  const setError = (error: string) => {
    console.error(error);
  };

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const fetchedProjects = await fetchAllProjects();
        setProjects(fetchedProjects);
        if (fetchedProjects.length > 0 && !selectedProject) {
          setSelectedProject(fetchedProjects[0].id);
        }
      } catch (error) {
        console.error('Error loading projects:', error);
        setError('Failed to load projects');
      }
    };

    loadProjects();
  }, []);

  return (
    <ProjectContext.Provider value={{
      selectedProject,
      setSelectedProject,
      selectedTraceId,
      setSelectedTraceId,
      selectedTrace,
      setSelectedTrace,
      projects,
      setProjects,
      worker,
      setError
    }}>
      {children}
    </ProjectContext.Provider>
  );
};