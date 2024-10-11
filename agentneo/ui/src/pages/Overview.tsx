import React from 'react';
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

const Index = () => {
  const { selectedProject, setSelectedProject, projects } = useProject();

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
              onValueChange={(value) => setSelectedProject(Number(value))}
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
            <ProjectInformation />
            <SystemInformation />
          </div>
          
          <div className="grid grid-cols-1 gap-8 mb-8">
            <ExecutionGraph />
            <ExecutionTimeline />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            <AgentCalls />
            <InstalledPackages />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;