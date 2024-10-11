import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

const InstalledPackages = () => {
  const packages = [
    { name: 'babel', version: '2.11.0' },
    { name: 'bottleneck', version: '1.3.8' },
    { name: 'brotli', version: '1.0.9' },
    { name: 'cython', version: '3.0.0' },
    { name: 'datetime', version: '5.4' },
    { name: 'dbias', version: '0.1.5' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Installed Packages</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[350px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PACKAGE</TableHead>
                <TableHead>VERSION</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map((pkg, index) => (
                <TableRow key={index}>
                  <TableCell>{pkg.name}</TableCell>
                  <TableCell>{pkg.version}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default InstalledPackages;