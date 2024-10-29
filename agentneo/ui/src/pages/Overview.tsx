import React, { useEffect, useCallback, useState } from 'react';
import ProjectInformation from '../components/ProjectInformation';
import SystemInformation from '../components/SystemInformation';
import ExecutionGraph from '../components/ExecutionGraph';
import AgentCalls from '../components/AgentCalls';
import InstalledPackages from '../components/InstalledPackages';
import Sidebar from '../components/Sidebar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LayoutDashboard } from 'lucide-react';
import { useProject } from '../contexts/ProjectContext';

import { fetchTraceData, fetchSystemInfo, fetchInstalledPackages, fetchAgentCalls, fetchProjectInfo } from '../utils/databaseUtils';

const Index = () => {
  const {
    selectedProject,
    setSelectedProject,
    selectedTraceId,
    setSelectedTraceId,
    setSelectedTrace,
    projects,
    traces,
    setError
  } = useProject();

  const [projectData, setProjectData] = useState(null);
  const [systemInfo, setSystemInfo] = useState(null);
  const [installedPackages, setInstalledPackages] = useState(null);
  const [agentCalls, setAgentCalls] = useState(null);

  const loadProjectData = useCallback(async (projectId: number) => {
    if (!projectId) return;

    console.log(`Loading data for project ${projectId}`);

    try {
      const [projectInfo, sysInfo, packages, calls] = await Promise.all([
        fetchProjectInfo(projectId),
        fetchSystemInfo(projectId),
        fetchInstalledPackages(projectId),
        fetchAgentCalls(projectId)
      ]);

      setProjectData(projectInfo);
      setSystemInfo(sysInfo);
      setInstalledPackages(packages);
      setAgentCalls(calls);
    } catch (error) {
      console.error('Error loading project data:', error);
      setError('Failed to load project data');
    }
  }, [setError]);

  const loadTraceData = useCallback(async (projectId: number, traceId: string) => {
    if (!projectId || !traceId) return;

    try {
      const data = await fetchTraceData(projectId, traceId);
      setSelectedTrace(data);
    } catch (error) {
      console.error('Error loading trace data:', error);
      setError('Failed to load trace data');
    }
  }, [setSelectedTrace, setError]);

  useEffect(() => {
    if (selectedProject) {
      loadProjectData(selectedProject);
    }
  }, [selectedProject, loadProjectData]);

  useEffect(() => {
    if (selectedProject && selectedTraceId) {
      loadTraceData(selectedProject, selectedTraceId);
    }
  }, [selectedProject, selectedTraceId, loadTraceData]);

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Sidebar />

      {/* Main content area with proper overflow handling */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Fixed header section */}
        <div className="flex-shrink-0 p-8 bg-opacity-90 backdrop-blur-sm bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div className="flex items-center">
              <LayoutDashboard className="mr-2 h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Project Dashboard</h1>
                <p className="text-gray-600 dark:text-gray-300">Overview of project metrics and performance</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Select
                value={selectedProject?.toString() || ''}
                onValueChange={(value) => setSelectedProject(Number(value))}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
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
                onValueChange={(value) => setSelectedTraceId(value)}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
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
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-8">
            {/* First row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="h-full">
                <ProjectInformation projectData={projectData} />
              </div>
              <div className="h-full">
                <SystemInformation systemData={systemInfo} />
              </div>
            </div>

            {/* Middle row */}
            <div className="mb-8">
              <ExecutionGraph />
            </div>

            {/* Last row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="h-full">
                <AgentCalls agentCalls={agentCalls} />
              </div>
              <div className="h-full">
                <InstalledPackages packages={installedPackages} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;