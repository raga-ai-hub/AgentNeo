import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SidebarProvider } from './contexts/SidebarContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { ThemeProvider } from './components/theme-provider';
import Overview from './pages/Overview';
import Analysis from './pages/Analysis';
import TraceHistory from './pages/TraceHistory';
import Evaluation from './pages/Evaluation';
import ThemeToggleButton from './components/toggle-button';

function App() {
  return (
    <ThemeProvider>
      <ProjectProvider>
        <SidebarProvider>
          <Router>
            <div className="min-h-screen bg-background text-foreground">
              {/* Replace with the new toggle switch */}
              <ThemeToggleButton />
              <Routes>
                <Route path="/" element={<Overview />} />
                <Route path="/analysis" element={<Analysis />} />
                <Route path="/trace-history" element={<TraceHistory />} />
                <Route path="/evaluation" element={<Evaluation />} />
              </Routes>
            </div>
          </Router>
        </SidebarProvider>
      </ProjectProvider>
    </ThemeProvider>
  );
}

export default App;