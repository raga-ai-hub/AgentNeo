import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Terminal, Monitor, Cpu, HardDrive, Microchip, Database } from 'lucide-react';

const SystemInformation = () => {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">System Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <InfoItem icon={<Terminal className="w-5 h-5 text-green-600" />} label="Python Version" value="3.11.4" />
          <InfoItem icon={<Monitor className="w-5 h-5 text-blue-600" />} label="OS" value="Darwin 15.0" />
          <InfoItem icon={<Cpu className="w-5 h-5 text-purple-600" />} label="CPU" value="Apple M1 Pro" />
          <InfoItem icon={<Microchip className="w-5 h-5 text-red-600" />} label="GPU" value="Apple M1 Pro (7-core)" />
          <InfoItem icon={<HardDrive className="w-5 h-5 text-yellow-600" />} label="Total Memory" value="16.00 GB" />
          <InfoItem icon={<Database className="w-5 h-5 text-indigo-600" />} label="Disk Space" value="512 GB (380 GB free)" />
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

export default SystemInformation;