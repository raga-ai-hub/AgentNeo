# from agentneo_hack.agentneo import AgentNeo
# from agentneo_hack.tracing.tracer import Tracer
# from agentneo_hack.evaluation.evaluation import Evaluation

from agentneo import AgentNeo, Tracer, Evaluation, launch_dashboard
from datetime import datetime
from openai import OpenAI
import os

neo_session = AgentNeo(session_name="my_session")

try:
    neo_session.create_project(project_name="my_project")
except:
    neo_session.connect_project(project_name="my_project")

tracer = Tracer(session=neo_session)
tracer.start()

@tracer.trace_llm("my_llm_call")
async def my_llm_function(max_tokens=512, model="gpt-4o-mini"):
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": """Plan a trip to Paris from London for 7 days such that it include 
                   food for all the 3 times a day, hotel booking and all other itenaries. make sure the total cost lies below $500"""}],
        max_tokens=max_tokens,
        temperature=0.7,
    )

    res = response.choices[0].message.content.strip()
    print(res)
    pass

tracer.stop()

exe = Evaluation(session=neo_session, trace_id=tracer.trace_id)

evaluations = [
    {
        "metric_list": ["goal_decomposition_efficiency"],
    },
    {
        "metric_list": ["goal_fulfillment_rate"],
    },
    {
        "metric_list": ["tool_call_correctness_rate"],
    },
    {
        "metric_list": ["tool_call_success_rate"],
    }
]

start_time = datetime.now()
exe.evaluate(evaluations=evaluations)
end_time = datetime.now()
duration = (end_time - start_time).total_seconds()
print(f"Evaluation operation took {duration} seconds.")

evaluations = [
    {
        "metric_list":[
        'goal_decomposition_efficiency',
        'goal_fulfillment_rate',
        'tool_call_correctness_rate',
        'tool_call_success_rate'
    ]
    }
]
start_time = datetime.now()
exe.evaluate(evaluations=evaluations, max_metric_workers=4)
end_time = datetime.now()
duration = (end_time - start_time).total_seconds()
print(f"Evaluation operation took {duration} seconds.")


# get your evaluated metrics results
metric_results = exe.get_results()
# print(metric_results)

neo_session.launch_dashboard(port=3000)