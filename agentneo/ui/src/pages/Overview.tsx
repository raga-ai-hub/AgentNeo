import React, { useEffect, useState, useCallback, useRef } from 'react';
import ProjectInformation from '../components/ProjectInformation';
import SystemInformation from '../components/SystemInformation';
import ExecutionGraph from '../components/ExecutionGraph';
import ExecutionTimeline from '../components/ExecutionTimeline';
import AgentCalls from '../components/AgentCalls';
import InstalledPackages from '../components/InstalledPackages';
import Sidebar from '../components/Sidebar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LayoutDashboard } from 'lucide-react';
import { useProject } from '../contexts/ProjectContext';

import { TimelineData } from '../types/timeline';
import { fetchTraceData, initDatabase, fetchSystemInfo, fetchInstalledPackages, fetchAgentCalls, fetchTracesForProject, fetchProjectInfo } from '../utils/databaseUtils';

const Index = () => {
  const {
    selectedProject,
    setSelectedProject,
    selectedTraceId,
    setSelectedTraceId,
    selectedTrace,
    setSelectedTrace,
    projects,
    setError
  } = useProject();

  const [traceData, setTraceData] = useState(null);
  const [projectData, setProjectData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [systemInfo, setSystemInfo] = useState(null);
  const [installedPackages, setInstalledPackages] = useState(null);
  const [agentCalls, setAgentCalls] = useState(null);
  const [traces, setTraces] = useState<{ id: string; name: string }[]>([]);

  const prevProjectIdRef = useRef<number | null>(null);
  const prevTraceIdRef = useRef<string | null>(null);

  const loadProjectData = useCallback(async (projectId: number) => {
    if (!projectId) return;

    console.log(`Loading data for project ${projectId}`);

    try {
      const [projectInfo, projectTraces, sysInfo, packages, calls] = await Promise.all([
        fetchProjectInfo(projectId),
        fetchTracesForProject(projectId),
        fetchSystemInfo(projectId),
        fetchInstalledPackages(projectId),
        fetchAgentCalls(projectId)
      ]);

      setProjectData(projectInfo);
      setTraces(projectTraces);
      setSystemInfo(sysInfo);
      setInstalledPackages(packages);
      setAgentCalls(calls);

      if (projectTraces.length > 0 && !selectedTraceId) {
        setSelectedTraceId(projectTraces[0].id);
      }
    } catch (error) {
      console.error('Error loading project data:', error);
      setError('Failed to load project data');
    }
  }, [setSelectedTraceId, setError]);

  const loadTraceData = useCallback(async (projectId: number, traceId: string) => {
    if (!projectId || !traceId) return;

    try {
      const data = await fetchTraceData(projectId, traceId);
      setTraceData(data);
      setSelectedTrace(data);
    } catch (error) {
      console.error('Error loading trace data:', error);
      setError('Failed to load trace data');
    }
  }, [setSelectedTrace, setError]);

  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        await initDatabase();
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing database:', error);
        setError('Failed to initialize database');
      }
    };

    initializeDatabase();
  }, [setError]);

  useEffect(() => {
    if (selectedProject && !isLoading && selectedProject !== prevProjectIdRef.current) {
      loadProjectData(selectedProject);
      prevProjectIdRef.current = selectedProject;
    }
  }, [selectedProject, isLoading, loadProjectData]);

  useEffect(() => {
    if (selectedProject && selectedTraceId &&
      (selectedProject !== prevProjectIdRef.current || selectedTraceId !== prevTraceIdRef.current)) {
      loadTraceData(selectedProject, selectedTraceId);
      prevProjectIdRef.current = selectedProject;
      prevTraceIdRef.current = selectedTraceId;
    }
  }, [selectedProject, selectedTraceId, loadTraceData]);

  if (isLoading) {
    return <div>Loading database...</div>;
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center">
              <LayoutDashboard className="mr-2 h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Project Dashboard</h1>
                <p className="text-gray-600 dark:text-gray-300">Overview of project metrics and performance</p>
              </div>
            </div>
            <div className="flex space-x-4">
              <Select
                value={selectedProject?.toString() || ''}
                onValueChange={(value) => {
                  console.log('Selected project:', value);
                  setSelectedProject(Number(value));
                  setSelectedTraceId(null);
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedTraceId || ''}
                onValueChange={(value) => {
                  console.log('Selected trace:', value);
                  setSelectedTraceId(value);
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select trace" />
                </SelectTrigger>
                <SelectContent>
                  {traces.map((trace) => (
                    <SelectItem key={trace.id} value={trace.id}>
                      {trace.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <ProjectInformation projectData={projectData} />
            <SystemInformation systemData={systemInfo} />
          </div>

          <div className="grid grid-cols-1 gap-8 mb-8">
            <ExecutionGraph />
            {/* {<ExecutionTimeline />} */}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            <AgentCalls agentCalls={agentCalls} />
            <InstalledPackages packages={installedPackages} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;