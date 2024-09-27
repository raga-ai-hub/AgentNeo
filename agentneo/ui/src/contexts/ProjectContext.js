import React, { createContext, useState, useContext, useEffect } from 'react';
import { createDbWorker } from 'sql.js-httpvfs';

const ProjectContext = createContext();

const workerUrl = new URL('sql.js-httpvfs/dist/sqlite.worker.js', import.meta.url);
const wasmUrl = new URL('sql.js-httpvfs/dist/sql-wasm.wasm', import.meta.url);

export const ProjectProvider = ({ children }) => {
    const [selectedProject, setSelectedProject] = useState(null);
    const [projects, setProjects] = useState([]);
    const [worker, setWorker] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const initDatabase = async () => {
            try {
                const worker = await createDbWorker(
                    [
                        {
                            from: 'inline',
                            config: {
                                serverMode: 'full',
                                url: '/trace_data.db',
                                requestChunkSize: 4096,
                            },
                        },
                    ],
                    workerUrl.toString(),
                    wasmUrl.toString()
                );
                console.log('Worker created successfully');
                setWorker(worker);

                // Fetch projects
                const result = await worker.db.query('SELECT id, project_name FROM project_info ORDER BY id DESC');
                const projectsList = result.map(({ id, project_name }) => ({ id, project_name }));
                setProjects(projectsList);
                if (projectsList.length > 0) {
                    setSelectedProject(projectsList[0].id);
                }
            } catch (err) {
                console.error('Database initialization error:', err);
                setError('Failed to initialize the database. Please check if the database file exists and is accessible.');
            }
        };

        initDatabase();
    }, []);

    return (
        <ProjectContext.Provider value={{ selectedProject, setSelectedProject, projects, worker, error, setError }}>
            {children}
        </ProjectContext.Provider>
    );
};

export const useProject = () => useContext(ProjectContext);