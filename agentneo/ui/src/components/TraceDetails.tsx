import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

// Dummy data for trace details (kept the same)
const dummyTraceDetails = {
  llm_calls: [
    { id: 'llm-001', name: 'GPT-4 Query', model: 'gpt-4', duration: 2.3, token_usage: '150 tokens', cost: '$0.03', input_prompt: 'Summarize the main points of climate change.', output: 'Climate change refers to long-term shifts in global weather patterns and average temperatures...' },
    { id: 'llm-002', name: 'Text Classification', model: 'gpt-3.5-turbo', duration: 1.1, token_usage: '80 tokens', cost: '$0.01', input_prompt: 'Classify the sentiment of this text: "I love this product!"', output: 'Sentiment: Positive' },
  ],
  tool_calls: [
    { id: 'tool-001', name: 'Web Search', duration: 1.5, input_parameters: { query: 'latest climate change reports' }, output: 'Found 5 recent reports on climate change from reputable sources.' },
    { id: 'tool-002', name: 'Database Query', duration: 0.8, input_parameters: { table: 'products', filter: { category: 'electronics' } }, output: 'Retrieved 50 electronic products from the database.' },
  ],
  agent_calls: [
    { id: 'agent-001', name: 'Research Assistant', duration: 5.2, input_parameters: { topic: 'renewable energy trends' }, output: 'Compiled a summary of current renewable energy trends, including solar, wind, and hydroelectric power developments.' },
  ],
  errors: [
    { id: 'error-001', error_type: 'API Timeout', error_message: 'The external API request timed out after 30 seconds.' },
  ],
};

const TraceDetails: React.FC<{ traceId: string }> = ({ traceId }) => {
  // In a real application, you would fetch the trace details based on the traceId
  // For now, we'll use our dummy data
  const details = dummyTraceDetails;

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <Tabs defaultValue="llm_calls" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="llm_calls">LLM Calls ({details.llm_calls.length})</TabsTrigger>
            <TabsTrigger value="tool_calls">Tool Calls ({details.tool_calls.length})</TabsTrigger>
            <TabsTrigger value="agent_calls">Agent Calls ({details.agent_calls.length})</TabsTrigger>
            <TabsTrigger value="errors">Errors ({details.errors.length})</TabsTrigger>
          </TabsList>
          <ScrollArea className="h-[60vh]">
            <TabsContent value="llm_calls">
              <div className="space-y-4">
                {details.llm_calls.map((call, index) => (
                  <Card key={call.id} className="relative">
                    <CardContent className="p-4">
                      <div className="flex items-center mb-2">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold mr-3">
                          {index + 1}
                        </div>
                        <h3 className="text-lg font-semibold">{call.name}</h3>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div><span className="font-medium">Model:</span> {call.model}</div>
                        <div><span className="font-medium">Duration:</span> {call.duration}s</div>
                        <div><span className="font-medium">Cost:</span> {call.cost}</div>
                      </div>
                      <div className="mb-4">
                        <h4 className="font-medium mb-2">Token Usage:</h4>
                        <div className="bg-gray-200 h-4 rounded-full overflow-hidden">
                          <div 
                            className="bg-green-500 h-full" 
                            style={{width: `${(parseInt(call.token_usage) / 1000) * 100}%`}}
                          ></div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{call.token_usage}</p>
                      </div>
                      <div className="mb-4">
                        <h4 className="font-medium mb-2">Input Prompt:</h4>
                        <pre className="bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto text-sm">{call.input_prompt}</pre>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Output:</h4>
                        <pre className="bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto text-sm">{call.output}</pre>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="tool_calls">
              {details.tool_calls.map((call) => (
                <Card key={call.id} className="mb-4">
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold mb-2">{call.name}</h3>
                    <div className="mb-4">
                      <span className="font-medium">Duration:</span> {call.duration}s
                    </div>
                    <div className="mb-4">
                      <h4 className="font-medium mb-2">Input Parameters:</h4>
                      <pre className="bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto text-sm">{JSON.stringify(call.input_parameters, null, 2)}</pre>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Output:</h4>
                      <pre className="bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto text-sm">{call.output}</pre>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
            <TabsContent value="agent_calls">
              {details.agent_calls.map((call) => (
                <Card key={call.id} className="mb-4">
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold mb-2">{call.name}</h3>
                    <div className="mb-4">
                      <span className="font-medium">Duration:</span> {call.duration}s
                    </div>
                    <div className="mb-4">
                      <h4 className="font-medium mb-2">Input Parameters:</h4>
                      <pre className="bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto text-sm">{JSON.stringify(call.input_parameters, null, 2)}</pre>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Output:</h4>
                      <pre className="bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto text-sm">{call.output}</pre>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
            <TabsContent value="errors">
              {details.errors.map((error) => (
                <Card key={error.id} className="mb-4">
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold mb-2 text-red-600">{error.error_type}</h3>
                    <div>
                      <h4 className="font-medium mb-2">Error Message:</h4>
                      <pre className="bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto text-sm text-red-500">{error.error_message}</pre>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TraceDetails;