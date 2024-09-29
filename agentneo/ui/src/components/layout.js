import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, FileText, Layers, BookOpen, Clock } from 'lucide-react';

const Layout = ({ children }) => {
    return (
        <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Sidebar */}
            <aside className="w-64 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-400 text-white p-6 relative overflow-hidden flex flex-col border-r border-white border-opacity-20">
                <div className="absolute inset-0 bg-black opacity-10"></div>
                <div className="absolute inset-0 backdrop-blur-sm bg-white bg-opacity-5"></div>
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white to-transparent opacity-5"></div>
                <div className="relative z-10 flex-grow">
                    <div className="flex items-center mb-8">
                        <img src="/logo.png" alt="RagaAI Logo" className="w-10 h-10 mr-3" />
                        <div>
                            <h1 className="text-2xl font-bold">AgentNeo</h1>
                            <p className="text-sm text-white text-opacity-80 text-right -mt-1">by <a href="https://raga.ai" target="_blank" rel="noopener noreferrer" className="hover:underline">RagaAI</a></p>
                        </div>
                    </div>
                    <nav>
                        <ul className="space-y-4">
                            <li>
                                <NavLink to="/dashboard" className={({ isActive }) => `flex items-center p-2 rounded-lg hover:bg-white hover:bg-opacity-20 transition-all duration-200 ${isActive ? 'bg-white bg-opacity-20' : ''}`}>
                                    <Home size={20} className="mr-3" />
                                    Overview
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/trace-analysis" className={({ isActive }) => `flex items-center p-2 rounded-lg hover:bg-white hover:bg-opacity-20 transition-all duration-200 ${isActive ? 'bg-white bg-opacity-20' : ''}`}>
                                    <FileText size={20} className="mr-3" />
                                    Trace Analysis
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/trace-history" className={({ isActive }) => `flex items-center p-2 rounded-lg hover:bg-white hover:bg-opacity-20 transition-all duration-200 ${isActive ? 'bg-white bg-opacity-20' : ''}`}>
                                    <Clock size={20} className="mr-3" />
                                    Trace History
                                </NavLink>
                            </li>
                            <li>
                                <span className="flex flex-col items-start p-2 rounded-lg text-white text-opacity-50 cursor-not-allowed">
                                    <span className="flex items-center">
                                        <Layers size={20} className="mr-3" />
                                        Evaluation
                                    </span>
                                    <span className="ml-9 mt-1">(Coming Soon)</span>
                                </span>
                            </li>
                        </ul>
                    </nav>
                </div>
                <div className="relative z-10 mt-auto pt-6 border-t border-white border-opacity-20">
                    <ul className="space-y-4">
                        <li>
                            <a href="https://github.com/aristotle-ai/ragaai-agentneo" target="_blank" rel="noopener noreferrer" className="flex items-center p-2 rounded-lg hover:bg-white hover:bg-opacity-20 transition-all duration-200">
                                <img src="/github-mark-white.svg" alt="GitHub" className="w-5 h-5 mr-3" />
                                Code Repository
                            </a>
                        </li>
                        <li>
                            <a href="https://docs.raga.ai/agentneo" target="_blank" rel="noopener noreferrer" className="flex items-center p-2 rounded-lg hover:bg-white hover:bg-opacity-20 transition-all duration-200">
                                <BookOpen size={20} className="mr-3" />
                                Documentation
                            </a>
                        </li>
                    </ul>
                </div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full opacity-5 -mb-16 -ml-16"></div>
                <div className="absolute top-1/2 right-0 w-24 h-24 bg-white rounded-full opacity-5 -mr-12"></div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    );
};

export default Layout;