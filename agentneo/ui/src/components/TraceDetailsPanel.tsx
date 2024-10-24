import React, { useState, useEffect } from 'react';
import {
  ChevronRight,
  Clock,
  AlertCircle,
  Bot,
  Wrench,
  MessageSquare,
  Globe,
  User,
  ArrowDownCircle,
  ArrowUpCircle,
  Maximize2,
  Minimize2,
  X
} from 'lucide-react';

interface TraceComponent {
  name: string;
  type: 'agent' | 'tool' | 'llm' | 'network' | 'user';
  duration: string;
  status: 'success' | 'error' | 'warning';
  details: string;
  input?: any;
  output?: any;
  children?: TraceComponent[];
}

interface DetailedTraceComponents {
  id: string;
  duration: string;
  errors: number;
  components: TraceComponent[];
}

interface Breadcrumb {
  name: string;
  type: string;
  path: string;
}

interface TraceDetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  traceData: DetailedTraceComponents | null;
}

const CodeBlock: React.FC<{ data: any; label: React.ReactNode }> = ({ data, label }) => (
  <div className="space-y-1">
    <div className="flex justify-between items-center text-sm text-gray-500">
      <span>{label}</span>
    </div>
    <pre className="bg-gray-800 text-gray-100 rounded-md p-3 text-sm overflow-auto">
      <code>{JSON.stringify(data, null, 2)}</code>
    </pre>
  </div>
);

export const TraceDetailsPanel: React.FC<TraceDetailsPanelProps> = ({
  isOpen,
  onClose,
  traceData
}) => {
  const [expandedComponents, setExpandedComponents] = useState<Set<string>>(new Set());
  const [selectedComponent, setSelectedComponent] = useState<TraceComponent | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setExpandedComponents(new Set());
      setSelectedComponent(null);
      setBreadcrumbs([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedComponent && traceData) {
      const generateBreadcrumbs = (
        components: TraceComponent[],
        targetName: string,
        path: string = '',
        result: Breadcrumb[] = []
      ): Breadcrumb[] | null => {
        for (const component of components) {
          const currentPath = `${path}/${component.name}`;
          if (component.name === targetName) {
            return [...result, { name: component.name, type: component.type, path: currentPath }];
          }
          if (component.children?.length) {
            const found = generateBreadcrumbs(
              component.children,
              targetName,
              currentPath,
              [...result, { name: component.name, type: component.type, path: currentPath }]
            );
            if (found) return found;
          }
        }
        return null;
      };

      const newBreadcrumbs = generateBreadcrumbs(traceData.components, selectedComponent.name);
      if (newBreadcrumbs) {
        setBreadcrumbs(newBreadcrumbs);
      }
    } else {
      setBreadcrumbs([]);
    }
  }, [selectedComponent, traceData]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'agent': return <Bot className="w-4 h-4" />;
      case 'tool': return <Wrench className="w-4 h-4" />;
      case 'llm': return <MessageSquare className="w-4 h-4" />;
      case 'network': return <Globe className="w-4 h-4" />;
      case 'user': return <User className="w-4 h-4" />;
      default: return <ChevronRight className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'agent': return 'text-violet-600';
      case 'tool': return 'text-blue-600';
      case 'llm': return 'text-emerald-600';
      case 'network': return 'text-amber-600';
      case 'user': return 'text-rose-600';
      default: return 'text-gray-600';
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'agent': return 'bg-violet-100 text-violet-800';
      case 'tool': return 'bg-blue-100 text-blue-800';
      case 'llm': return 'bg-emerald-100 text-emerald-800';
      case 'network': return 'bg-amber-100 text-amber-800';
      case 'user': return 'bg-rose-100 text-rose-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleExpandAll = () => {
    if (traceData) {
      const getAllPaths = (components: TraceComponent[], parentPath = ''): Set<string> => {
        let paths = new Set<string>();
        components.forEach(component => {
          const currentPath = `${parentPath}/${component.name}`;
          paths.add(currentPath);
          if (component.children?.length) {
            const childPaths = getAllPaths(component.children, currentPath);
            childPaths.forEach(path => paths.add(path));
          }
        });
        return paths;
      };
      setExpandedComponents(getAllPaths(traceData.components));
    }
  };

  const renderComponentDetails = (component: TraceComponent) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className={`px-2 py-1 rounded-full text-sm ${getTypeBadgeColor(component.type)}`}>
          {component.type.charAt(0).toUpperCase() + component.type.slice(1)}
        </span>
        <span className="text-sm text-gray-500">{component.duration}</span>
      </div>

      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
        {component.details}
      </div>

      {component.input && (
        <CodeBlock
          data={component.input}
          label={
            <div className="flex items-center gap-1">
              <ArrowDownCircle className="w-4 h-4" />
              <span>Input</span>
            </div>
          }
        />
      )}

      {component.output && (
        <CodeBlock
          data={component.output}
          label={
            <div className="flex items-center gap-1">
              <ArrowUpCircle className="w-4 h-4" />
              <span>Output</span>
            </div>
          }
        />
      )}
    </div>
  );

  const renderComponent = (component: TraceComponent, depth = 0, parentPath = '') => {
    const currentPath = `${parentPath}/${component.name}`;
    const isExpanded = expandedComponents.has(currentPath);
    const isSelected = selectedComponent?.name === component.name;
    const hasChildren = component.children?.length > 0;

    return (
      <div key={currentPath} className="mb-2">
        <div
          className={`rounded-lg border transition-all duration-200 ${isSelected ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-white'
            }`}
          style={{ marginLeft: `${depth * 16}px` }}
        >
          <div
            className="flex items-center gap-2 p-3 cursor-pointer hover:bg-gray-50"
            onClick={() => {
              if (hasChildren) {
                setExpandedComponents(prev => {
                  const next = new Set(prev);
                  if (next.has(currentPath)) {
                    next.delete(currentPath);
                  } else {
                    next.add(currentPath);
                  }
                  return next;
                });
              }
              setSelectedComponent(isSelected ? null : component);
            }}
          >
            <div className="flex items-center gap-2">
              {hasChildren && (
                <ChevronRight
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'transform rotate-90' : ''
                    }`}
                />
              )}
              <div className={getTypeColor(component.type)}>
                {getTypeIcon(component.type)}
              </div>
            </div>
            <div className="flex-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">{component.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${getTypeBadgeColor(component.type)}`}>
                  {component.type}
                </span>
              </div>
              <span className="text-sm text-gray-500">{component.duration}</span>
            </div>
          </div>

          {isSelected && (
            <div className="px-4 pb-3 border-t">
              {renderComponentDetails(component)}
            </div>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="relative ml-4 pl-4 border-l border-gray-200">
            {component.children.map(child =>
              renderComponent(child, depth + 1, currentPath)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`fixed right-0 top-0 h-screen w-96 border-l bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
    >
      <div className="h-full flex flex-col">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Bot className="w-5 h-5 text-purple-500" />
              Trace Details
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {traceData && (
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded">
                <Clock size={16} />
                <span>{traceData.duration}</span>
              </div>
              <div className="flex items-center gap-1 bg-red-50 px-2 py-1 rounded">
                <AlertCircle size={16} />
                <span>{traceData.errors} errors</span>
              </div>
            </div>
          )}
        </div>

        {traceData && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">Execution Timeline</h3>
                  <div className="space-x-2">
                    <button
                      onClick={handleExpandAll}
                      className="text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1 inline-flex"
                    >
                      <Maximize2 className="w-4 h-4" />
                      <span>Expand All</span>
                    </button>
                    <button
                      onClick={() => setExpandedComponents(new Set())}
                      className="text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1 inline-flex"
                    >
                      <Minimize2 className="w-4 h-4" />
                      <span>Collapse All</span>
                    </button>
                  </div>
                </div>

                {breadcrumbs.length > 0 && (
                  <div className="mb-4 border-b pb-2">
                    <div className="flex items-center gap-1 text-sm text-gray-500 overflow-x-auto">
                      {breadcrumbs.map((item, index) => (
                        <React.Fragment key={item.path}>
                          {index > 0 && <ChevronRight className="w-3 h-3" />}
                          <button
                            onClick={() => {
                              const component = traceData.components.find(c => c.name === item.name);
                              if (component) {
                                setSelectedComponent(component);
                              }
                            }}
                            className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 ${index === breadcrumbs.length - 1 ? 'text-purple-600 font-medium' : ''
                              }`}
                          >
                            {getTypeIcon(item.type)}
                            <span>{item.name}</span>
                          </button>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {traceData.components.map(component =>
                    renderComponent(component, 0, '')
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TraceDetailsPanel;
