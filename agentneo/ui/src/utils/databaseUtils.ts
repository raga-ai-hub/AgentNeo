import { TimelineData } from '../types/timeline';

import initSqlJs from 'sql.js';

let SQL;
let db;

export const initDatabase = async () => {
    if (!SQL) {
        console.log('Initializing SQL.js');
        SQL = await initSqlJs({ locateFile: file => `/${file}` });
    }
    if (!db) {
        console.log('Loading trace_data.db');
        const response = await fetch('/trace_data.db');
        const arrayBuffer = await response.arrayBuffer();
        db = new SQL.Database(new Uint8Array(arrayBuffer));
        console.log('Database loaded successfully');
    }
};

export const fetchAllProjects = async () => {
    await initDatabase();

    console.log('Fetching all projects');

    const result = db.exec(`
      SELECT id, project_name
      FROM project_info
      ORDER BY id
    `);

    console.log('All projects query result:', result);

    if (result[0] && result[0].values) {
        return result[0].values.map(([id, project_name]) => ({
            id,
            name: project_name,
        }));
    }

    console.log('No projects found');
    return [];
};

export const fetchTraceData = async (projectId) => {
    await initDatabase();

    console.log(`Fetching data for project ID: ${projectId}`);

    // Query to fetch project information
    const result = db.exec(`
    SELECT 
      id,
      project_name,
      start_time,
      end_time,
      duration,
      total_cost,
      total_tokens
    FROM project_info 
    WHERE id = ${projectId}
  `);

    console.log('Project info query result:', result);

    if (result[0] && result[0].values[0]) {
        const [id, project_name, start_time, end_time, duration, total_cost, total_tokens] = result[0].values[0];

        // Query to count total traces for the project
        const tracesResult = db.exec(`
      SELECT COUNT(*) as total_traces
      FROM traces
      WHERE project_id = ${projectId}
    `);

        // Query to count total errors for the project
        const errorsResult = db.exec(`
      SELECT COUNT(*) as total_errors
      FROM errors
      WHERE project_id = ${projectId}
    `);

        const totalTraces = tracesResult[0].values[0][0];
        const totalErrors = errorsResult[0].values[0][0];

        const projectInfo = {
            id,
            name: project_name,
            startTime: new Date(start_time),
            endTime: end_time ? new Date(end_time) : null,
            duration: duration,
            totalCost: total_cost,
            totalTokens: total_tokens,
            totalTraces: totalTraces,
            totalErrors: totalErrors,
        }

        console.log('Processed project data:', projectInfo);
        return { projectInfo };
    }

    console.log('No project data found');
    return { projectInfo: null };
};

export const fetchSystemInfo = async (projectId) => {
    await initDatabase();

    const result = db.exec(`
      SELECT os_name, os_version, python_version, cpu_info, gpu_info, memory_total, disk_info
      FROM system_info
      WHERE project_id = ${projectId}
      ORDER BY id DESC
      LIMIT 1
    `);

    if (result[0] && result[0].values[0]) {
        const [os_name, os_version, python_version, cpu_info, gpu_info, memory_total, disk_info] = result[0].values[0];
        return {
            os: `${os_name} ${os_version}`,
            pythonVersion: python_version,
            cpu: cpu_info,
            gpu: gpu_info || 'N/A',
            totalMemory: `${(memory_total).toFixed(2)} GB`,
            diskSpace: disk_info
        };
    }
    return null;
};

export const fetchInstalledPackages = async (projectId) => {
    await initDatabase();

    const result = db.exec(`
      SELECT installed_packages
      FROM system_info
      WHERE project_id = ${projectId}
      ORDER BY id DESC
      LIMIT 1
    `);

    if (result[0] && result[0].values[0]) {
        const installedPackages = JSON.parse(result[0].values[0][0]);
        return Object.entries(installedPackages).map(([name, version]) => ({ name, version }));
    }
    return [];
};

export const fetchAgentCalls = async (projectId) => {
    await initDatabase();

    const result = db.exec(`
      SELECT 
        name,
        COUNT(*) as count,
        AVG(JULIANDAY(end_time) - JULIANDAY(start_time)) * 86400 as avg_duration,
        AVG(JSON_ARRAY_LENGTH(tool_call_ids)) as avg_tool_calls,
        AVG(JSON_ARRAY_LENGTH(llm_call_ids)) as avg_llm_calls
      FROM agent_call
      WHERE project_id = ${projectId}
      GROUP BY name
    `);

    if (result[0] && result[0].values) {
        return result[0].values.map(([name, count, avgDuration, avgToolCalls, avgLLMCalls]) => ({
            name,
            count,
            avgDuration: parseFloat(avgDuration).toFixed(2),
            avgToolCalls: parseFloat(avgToolCalls).toFixed(2),
            avgLLMCalls: parseFloat(avgLLMCalls).toFixed(2)
        }));
    }
    return [];
};


const typeColors = {
    'LLM': '#34A853',
    'Tool': '#FBBC05',
    'Action': '#4285F4',
    'Error': '#EA4335',
    // Add more types and colors as needed
};

export const fetchTimelineData = async (projectId: number, traceId: string): Promise<TimelineData[]> => {
    await initDatabase();

    const result = db.exec(`
      SELECT 
        CASE
          WHEN ac.id IS NOT NULL THEN ac.name
          WHEN lc.id IS NOT NULL THEN lc.name
          WHEN tc.id IS NOT NULL THEN tc.name
          WHEN e.id IS NOT NULL THEN e.error_type
          WHEN ui.id IS NOT NULL THEN ui.interaction_type
          ELSE 'Unknown'
        END as name,
        COALESCE(ac.start_time, lc.start_time, tc.start_time, e.timestamp, ui.timestamp) as start_time,
        COALESCE(ac.end_time, lc.end_time, tc.end_time, e.timestamp, ui.timestamp) as end_time,
        CASE
          WHEN ac.id IS NOT NULL THEN 'Action'
          WHEN lc.id IS NOT NULL THEN 'LLM'
          WHEN tc.id IS NOT NULL THEN 'Tool'
          WHEN e.id IS NOT NULL THEN 'Error'
          WHEN ui.id IS NOT NULL THEN 'UserInteraction'
          ELSE 'Unknown'
        END as type,
        COALESCE(ac.id, lc.id, tc.id, e.id, ui.id) as id,
        ac.name as agent_name,
        ac.llm_call_ids,
        ac.tool_call_ids,
        lc.input_prompt,
        lc.output as llm_output,
        lc.model,
        lc.token_usage,
        lc.cost,
        tc.name as tool_name,
        tc.input_parameters,
        tc.output as tool_output,
        tc.network_calls,
        e.error_type,
        e.error_message,
        ui.interaction_type,
        ui.content
      FROM traces t
      LEFT JOIN agent_call ac ON t.id = ac.trace_id
      LEFT JOIN llm_call lc ON t.id = lc.trace_id
      LEFT JOIN tool_call tc ON t.id = tc.trace_id
      LEFT JOIN errors e ON t.id = e.trace_id
      LEFT JOIN user_interactions ui ON t.id = ui.trace_id
      WHERE t.project_id = ? AND t.id = ?
      ORDER BY start_time
    `, [projectId, traceId]);

    if (result[0] && result[0].values) {
        return result[0].values.map(([
            name, start_time, end_time, type, id,
            agent_name, llm_call_ids, tool_call_ids,
            input_prompt, llm_output, model, token_usage, cost,
            tool_name, input_parameters, tool_output, network_calls,
            error_type, error_message, interaction_type, content
        ]) => ({
            name,
            start_time,
            end_time,
            type,
            id,
            details: {
                agent: agent_name,
                llm_call_ids,
                tool_call_ids,
                input: input_prompt || input_parameters,
                output: llm_output || tool_output,
                model,
                token_usage,
                cost,
                function: tool_name,
                network_calls,
                error_type,
                error_message,
                interaction_type,
                content
            }
        }));
    }

    return [];
};

export const fetchTracesForProject = async (projectId: number): Promise<{ id: string; name: string }[]> => {
    await initDatabase();

    const result = db.exec(`
      SELECT id, start_time
      FROM traces
      WHERE project_id = ${projectId}
      ORDER BY start_time DESC
    `);

    if (result[0] && result[0].values) {
        return result[0].values.map(([id, start_time]) => ({
            id: id.toString(),
            name: `Trace ${id} (${new Date(start_time).toLocaleString()})`
        }));
    }

    return [];
};

// For Trace History Page
export interface TraceHistoryItem {
    id: string;
    start_time: string;
    duration: number;
    llm_call_count: number;
    tool_call_count: number;
    agent_call_count: number;
    error_count: number;
}

export const fetchTraceHistory = async (projectId: number): Promise<TraceHistoryItem[]> => {
    await initDatabase();

    const result = db.exec(`
      SELECT 
        t.id,
        t.start_time,
        t.duration,
        (SELECT COUNT(*) FROM llm_call WHERE trace_id = t.id) as llm_call_count,
        (SELECT COUNT(*) FROM tool_call WHERE trace_id = t.id) as tool_call_count,
        (SELECT COUNT(*) FROM agent_call WHERE trace_id = t.id) as agent_call_count,
        (SELECT COUNT(*) FROM errors WHERE trace_id = t.id) as error_count
      FROM traces t
      WHERE t.project_id = ?
      ORDER BY t.start_time DESC
    `, [projectId]);

    if (result[0] && result[0].values) {
        return result[0].values.map(([id, start_time, duration, llm_call_count, tool_call_count, agent_call_count, error_count]) => ({
            id: id.toString(),
            start_time,
            duration: duration || 0,
            llm_call_count: llm_call_count || 0,
            tool_call_count: tool_call_count || 0,
            agent_call_count: agent_call_count || 0,
            error_count: error_count || 0
        }));
    }

    return [];
};


// For Detailed Trace in Trace History Page
export interface DetailedTraceComponents {
    agents: any[];
    tools: any[];
    llmCalls: any[];
    errors: any[];
}

export const fetchDetailedTraceComponents = async (traceId: string): Promise<DetailedTraceComponents> => {
    await initDatabase();

    const agentResult = db.exec(`
        SELECT *
        FROM agent_call
        WHERE trace_id = ?
    `, [traceId]);

    const toolResult = db.exec(`
        SELECT *
        FROM tool_call
        WHERE trace_id = ?
    `, [traceId]);

    const llmResult = db.exec(`
        SELECT *
        FROM llm_call
        WHERE trace_id = ?
    `, [traceId]);

    const errorResult = db.exec(`
        SELECT *
        FROM errors
        WHERE trace_id = ?
    `, [traceId]);

    return {
        agents: agentResult[0]?.values.map(row => {
            const columns = agentResult[0].columns;
            return columns.reduce((obj, col, index) => {
                obj[col] = row[index];
                return obj;
            }, {});
        }) || [],
        tools: toolResult[0]?.values.map(row => {
            const columns = toolResult[0].columns;
            return columns.reduce((obj, col, index) => {
                obj[col] = row[index];
                return obj;
            }, {});
        }) || [],
        llmCalls: llmResult[0]?.values.map(row => {
            const columns = llmResult[0].columns;
            return columns.reduce((obj, col, index) => {
                obj[col] = row[index];
                return obj;
            }, {});
        }) || [],
        errors: errorResult[0]?.values.map(row => {
            const columns = errorResult[0].columns;
            return columns.reduce((obj, col, index) => {
                obj[col] = row[index];
                return obj;
            }, {});
        }) || [],
    };
};


// ... existing imports and code ...
// ... existing imports and code ...

export const fetchEvaluationData = async (projectId: number, traceId: string | null): Promise<any[]> => {
    await initDatabase();
  
    let query = `
      SELECT 
        m.id,
        t.id as trace_id,
        m.metric_name,
        m.score,
        m.reason,
        m.result_detail,
        m.config,
        t.start_time,
        t.end_time,
        (julianday(t.end_time) - julianday(t.start_time)) * 86400 as duration
      FROM metrics m
      JOIN traces t ON m.trace_id = t.id
      WHERE t.project_id = ?
    `;
  
    const params = [projectId];
  
    if (traceId) {
      query += ' AND t.id = ?';
      params.push(traceId);
    }
  
    query += ' ORDER BY t.start_time DESC';
  
    const result = db.exec(query, params);
  
    if (result[0] && result[0].values) {
      return result[0].values.map(([id, trace_id, metric_name, score, reason, result_detail, config, start_time, end_time, duration]) => ({
        id,
        trace_id,
        type: metric_name,
        [metric_name.toLowerCase().replace(/ /g, '_')]: {
          score: parseFloat(score),
          reason,
          result_detail: JSON.parse(result_detail),
          config: JSON.parse(config),
        },
        start_time,
        end_time,
        duration: parseFloat(duration)
      }));
    }
  
    return [];
  };
  
  // ... existing code ...