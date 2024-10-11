import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Folder, DollarSign, Clock, FileText, Coins, AlertTriangle } from 'lucide-react';

const ProjectInformation = () => {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Project Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <InfoItem icon={<Folder className="w-5 h-5 text-indigo-600" />} label="Project Name" value="ai_web_researcher_7" />
          <InfoItem icon={<DollarSign className="w-5 h-5 text-green-600" />} label="Total Cost" value="$0.00" />
          <InfoItem icon={<Clock className="w-5 h-5 text-blue-600" />} label="Duration" value="173.98 seconds" />
          <InfoItem icon={<FileText className="w-5 h-5 text-purple-600" />} label="Total Traces" value="3" />
          <InfoItem icon={<Coins className="w-5 h-5 text-yellow-600" />} label="Total Tokens" value="4,652" />
          <InfoItem icon={<AlertTriangle className="w-5 h-5 text-red-600" />} label="Total Errors" value="0" />
        </div>
      </CardContent>
    </Card>
  );
};

const InfoItem = ({ icon, label, value }) => (
  <div className="flex items-center space-x-3">
    {icon}
    <div className="flex-1">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-base font-medium">{value}</p>
    </div>
  </div>
);

export default ProjectInformation;