import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Sidebar from '../components/Sidebar';
import EvaluationTable from '../components/EvaluationTable';
import DateTimePicker from '../components/DateTimePicker';
import { ClipboardCheck } from 'lucide-react';
import { useSidebar } from '../contexts/SidebarContext';
import { useProject } from '../contexts/ProjectContext';

const metricsData = [
  { score: 0, 'Tool Selection Accuracy': 0, 'Tool Usage Efficiency': 0, 'Goal Decomposition': 0, 'Plan Adaptability': 0, 'Plan Execution Error Rate': 0 },
  { score: 0.5, 'Tool Selection Accuracy': 0.4, 'Tool Usage Efficiency': 0.35, 'Goal Decomposition': 0.45, 'Plan Adaptability': 0.3, 'Plan Execution Error Rate': 0.5 },
  { score: 1, 'Tool Selection Accuracy': 0, 'Tool Usage Efficiency': 0, 'Goal Decomposition': 0, 'Plan Adaptability': 0, 'Plan Execution Error Rate': 0 },
];

const evaluationData = [
  { 
    id: 'bec252ac-8db3...', 
    type: 'CHAIN', 
    input: 'What is the change_timestamp...',
    toolSelection: { score: 0.92, reason: 'Appropriate tools selected for the task. The agent correctly identified and utilized the database query tool to fetch the change_timestamp information. This demonstrates a good understanding of the available tools and their applicability to the given task.' },
    toolUsage: { score: 0.88, reason: 'Efficient use of selected tools. The agent constructed a well-formed SQL query to retrieve the change_timestamp data. However, there was a slight inefficiency in the query structure that could have been optimized for better performance.' },
    goalDecomp: { score: 0.78, reason: 'Good breakdown of complex task. The agent divided the main goal into subtasks: understanding the request, formulating the query, executing the query, and presenting the results. However, there was room for improvement in further decomposing the query formulation step.' },
    planAdapt: { score: 0.85, reason: 'Flexible adaptation to changing requirements. When faced with an unexpected data format, the agent quickly adjusted its approach to parse and present the information correctly. This demonstrates good adaptability, although the initial plan could have anticipated potential variations better.' },
    executionError: { score: 0.95, reason: 'Minimal errors during execution. The agent successfully completed the task with only minor issues in data formatting. No critical errors were encountered, and the final output was accurate and useful.' }
  },
  { 
    id: 'fcb9d43c-45de...', 
    type: 'TOOL', 
    input: 'How to optimize database q...',
    toolSelection: { score: 0.95, reason: 'Optimal tool choice for database optimization. The agent selected the most appropriate set of tools, including query analyzer, index recommendation tool, and execution plan visualizer. This comprehensive selection covers all aspects of query optimization.' },
    toolUsage: { score: 0.91, reason: 'Highly effective use of database tools. The agent demonstrated proficiency in using each selected tool, applying advanced features such as parameterized query analysis and index impact simulation. The tools were used in a logical sequence to build upon each other\'s outputs.' },
    goalDecomp: { score: 0.82, reason: 'Clear breakdown of optimization steps. The task was well-divided into phases: query analysis, bottleneck identification, index optimization, and query rewriting. Each phase had clear objectives and measurable outcomes. However, there could have been more emphasis on validating improvements at each step.' },
    planAdapt: { score: 0.88, reason: 'Good adaptation to specific database structure. When encountering a unique table partitioning scheme, the agent adjusted its optimization strategy accordingly. This flexibility ensured that the optimization recommendations were tailored to the specific database environment.' },
    executionError: { score: 0.97, reason: 'Nearly error-free execution. The optimization process was carried out smoothly with only a minor oversight in considering the impact of proposed changes on existing database triggers. This was quickly identified and corrected, resulting in a highly successful optimization outcome.' }
  },
  { 
    id: '926683cd-d2a2...', 
    type: 'LLM', 
    input: 'Summarize the key points o...',
    toolSelection: { score: 0.89, reason: 'Appropriate LLM model selected. The agent chose a model well-suited for text summarization tasks, considering factors such as context length, language understanding capabilities, and output coherence. However, there might have been a slightly more specialized model available for this specific type of summarization.' },
    toolUsage: { score: 0.86, reason: 'Effective use of LLM capabilities. The agent utilized advanced prompting techniques to guide the model towards producing a concise and accurate summary. This included using few-shot examples and specifying the desired output format. There was room for improvement in leveraging the model\'s ability to provide confidence scores for different parts of the summary.' },
    goalDecomp: { score: 0.75, reason: 'Adequate breakdown of summarization task. The agent divided the process into stages: document preprocessing, key point extraction, summary generation, and post-processing. While this covered the main aspects of summarization, it could have benefited from a more granular approach, particularly in the key point extraction phase.' },
    planAdapt: { score: 0.82, reason: 'Reasonable adaptation to text complexity. When faced with a document containing technical jargon, the agent adjusted its approach by incorporating domain-specific context into the prompts. This adaptation improved the quality of the summary, though there was potential for more dynamic adjustment based on interim results.' },
    executionError: { score: 0.93, reason: 'Low error rate in summary generation. The summarization process was completed with high accuracy, maintaining the core message of the original text. A minor error in date reference was detected and corrected during the post-processing stage, demonstrating good error-handling capabilities.' }
  },
];

const Evaluation: React.FC = () => {
  const { isCollapsed } = useSidebar();
  const { selectedProject, setSelectedProject, selectedTraceId, setSelectedTraceId, projects } = useProject();
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);

  // Dummy traces data (replace with actual data fetching logic)
  const traces = [
    { id: 'all', name: 'All Traces' },
    { id: 'trace1', name: 'Trace 1' },
    { id: 'trace2', name: 'Trace 2' },
    { id: 'trace3', name: 'Trace 3' },
  ];

  const sortedData = useMemo(() => {
    let sortableItems = [...evaluationData];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (sortConfig.key === 'id') {
          return sortConfig.direction === 'ascending' 
            ? a.id.localeCompare(b.id)
            : b.id.localeCompare(a.id);
        } else {
          const aValue = a[sortConfig.key].score;
          const bValue = b[sortConfig.key].score;
          if (aValue < bValue) {
            return sortConfig.direction === 'ascending' ? -1 : 1;
          }
          if (aValue > bValue) {
            return sortConfig.direction === 'ascending' ? 1 : -1;
          }
          return 0;
        }
      });
    }
    return sortableItems;
  }, [sortConfig]);

  const requestSort = (key: string) => {
    if (key === 'input' || key === 'type') return; // Prevent sorting for 'input' and 'type'
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="flex items-center mb-6">
            <ClipboardCheck className="mr-2 h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Evaluation</h1>
          </div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Select 
              value={selectedProject?.toString() || ''} 
              onValueChange={(value) => setSelectedProject(Number(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedTraceId || ''} onValueChange={setSelectedTraceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select Trace" />
              </SelectTrigger>
              <SelectContent>
                {traces.map((trace) => (
                  <SelectItem key={trace.id} value={trace.id}>
                    {trace.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DateTimePicker date={startDate} setDate={setStartDate} />
            <DateTimePicker date={endDate} setDate={setEndDate} />
          </div>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Metrics Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={metricsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="score" label={{ value: 'Metric Score', position: 'insideBottom', offset: -10 }} />
                  <YAxis label={{ value: 'Frequency', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Tool Selection Accuracy" stroke="#8884d8" />
                  <Line type="monotone" dataKey="Tool Usage Efficiency" stroke="#82ca9d" />
                  <Line type="monotone" dataKey="Goal Decomposition" stroke="#ffc658" />
                  <Line type="monotone" dataKey="Plan Adaptability" stroke="#ff8042" />
                  <Line type="monotone" dataKey="Plan Execution Error Rate" stroke="#0088fe" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Evaluation Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mb-4"
              />
              <EvaluationTable sortedData={sortedData} requestSort={requestSort} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Evaluation;
