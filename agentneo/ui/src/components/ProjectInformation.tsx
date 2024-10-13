import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Folder, DollarSign, Clock, FileText, Coins, AlertTriangle } from 'lucide-react';

interface ProjectInfoProps {
  projectData: {
    id: number;
    name: string;
    startTime: Date;
    endTime: Date | null;
    duration: number;
    totalCost: number;
    totalTokens: number;
    totalTraces: number;
    totalErrors: number;
  } | null;
}

const ProjectInformation: React.FC<ProjectInfoProps> = ({ projectData }) => {
  if (!projectData) {
    return <div>No project data available</div>;
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Project Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <InfoItem icon={<Folder className="w-5 h-5 text-indigo-600" />} label="Project Name" value={projectData.name} />
          <InfoItem icon={<DollarSign className="w-5 h-5 text-green-600" />} label="Total Cost" value={`$${projectData.totalCost.toFixed(2)}`} />
          <InfoItem icon={<Clock className="w-5 h-5 text-blue-600" />} label="Duration" value={`${projectData.duration.toFixed(2)} seconds`} />
          <InfoItem icon={<FileText className="w-5 h-5 text-purple-600" />} label="Total Traces" value={projectData.totalTraces.toString()} />
          <InfoItem icon={<Coins className="w-5 h-5 text-yellow-600" />} label="Total Tokens" value={projectData.totalTokens.toLocaleString()} />
          <InfoItem icon={<AlertTriangle className="w-5 h-5 text-red-600" />} label="Total Errors" value={projectData.totalErrors.toString()} />
        </div>
      </CardContent>
    </Card>
  );
};

const InfoItem: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex items-center space-x-3">
    {icon}
    <div className="flex-1">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-base font-medium">{value}</p>
    </div>
  </div>
);

export default ProjectInformation;