// export interface TimelineData {
//   name: string;
//   start: number;
//   duration: number;
//   color: string;
//   type: string;
//   row: string;
//   details?: {
//     agent?: string;
//     function?: string;
//     input?: string;
//     output?: string;
//   };
// }

export interface TimelineData {
  name: string;
  start_time: string;
  end_time: string;
  type: string;
  id: number;
  details: {
    agent?: string;
    llm_call_ids?: string;
    tool_call_ids?: string;
    input?: string;
    output?: string;
    model?: string;
    token_usage?: string;
    cost?: string;
    function?: string;
    input_parameters?: string;
    network_calls?: string;
    error_type?: string;
    error_message?: string;
    interaction_type?: string;
    content?: string;
  };
}