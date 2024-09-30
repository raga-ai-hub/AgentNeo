import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Layout from './components/layout';
import NotFound from './components/ui/not_found';
import Dashboard from './components/dashboard';
import TraceAnalysis from './components/trace_analysis';
import { ProjectProvider } from './contexts/ProjectContext';
import TraceHistory from './components/trace_history';


function App() {
  return (
    <ProjectProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/trace-analysis" element={<TraceAnalysis />} />
            <Route path="/trace-history" element={<TraceHistory />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </Router>
    </ProjectProvider>
  );
}

export default App;