import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Project {
  id: number;
  name: string;
}

interface ProjectContextType {
  selectedProject: number | null;
  setSelectedProject: (id: number | null) => void;
  selectedTraceId: string | null;
  setSelectedTraceId: (id: string | null) => void;
  selectedTrace: any | null; // Add this line
  setSelectedTrace: (trace: any | null) => void; // Add this line
  projects: Project[];
  worker: any; // Replace 'any' with the actual type of your worker
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
  const [selectedTrace, setSelectedTrace] = useState<any | null>(null); // Add this line
  const [projects] = useState<Project[]>([
    { id: 1, name: 'Project 1' },
    { id: 2, name: 'Project 2' },
  ]);
  const [worker] = useState<any>(null); // Initialize with your actual worker
  const setError = (error: string) => {
    console.error(error); // For now, just log the error
  };

  return (
    <ProjectContext.Provider value={{ 
      selectedProject, 
      setSelectedProject, 
      selectedTraceId,
      setSelectedTraceId,
      selectedTrace, // Add this line
      setSelectedTrace, // Add this line
      projects, 
      worker, 
      setError 
    }}>
      {children}
    </ProjectContext.Provider>
  );
};