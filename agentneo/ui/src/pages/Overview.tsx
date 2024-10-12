import React, { useEffect, useState } from 'react';
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
import { fetchTraceData, initDatabase, fetchSystemInfo, fetchInstalledPackages, fetchAgentCalls } from '../utils/databaseUtils';

const Index = () => {
  const { selectedProject, setSelectedProject, projects } = useProject();
  const [traceData, setTraceData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [systemInfo, setSystemInfo] = useState(null);
  const [installedPackages, setInstalledPackages] = useState(null);
  const [agentCalls, setAgentCalls] = useState(null);

  useEffect(() => {
    const initializeDatabase = async () => {
      await initDatabase();
      setIsLoading(false);
    };

    initializeDatabase();
  }, []);

  useEffect(() => {
    if (projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0].id);
    }
  }, [projects, selectedProject, setSelectedProject]);

  useEffect(() => {
    const loadData = async () => {
      if (selectedProject && !isLoading) {
        console.log(`Loading data for project ${selectedProject}`);
        const data = await fetchTraceData(selectedProject);
        setTraceData(data);

        const sysInfo = await fetchSystemInfo(selectedProject);
        setSystemInfo(sysInfo);

        const packages = await fetchInstalledPackages(selectedProject);
        setInstalledPackages(packages);

        const calls = await fetchAgentCalls(selectedProject);
        setAgentCalls(calls);
      }
    };

    loadData();
  }, [selectedProject, isLoading]);

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
            <Select
              value={selectedProject?.toString() || ''}
              onValueChange={(value) => {
                console.log('Selected project:', value);
                setSelectedProject(Number(value));
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
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <ProjectInformation projectData={traceData?.projectInfo} />
            <SystemInformation systemData={systemInfo} />
          </div>

          <div className="grid grid-cols-1 gap-8 mb-8">
            <ExecutionGraph />
            <ExecutionTimeline projectId={selectedProject} />
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