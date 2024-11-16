# from agentneo_hack.agentneo import AgentNeo
# from agentneo_hack.tracing.tracer import Tracer
# from agentneo_hack.evaluation.evaluation import Evaluation

from agentneo import AgentNeo, Tracer, Evaluation, launch_dashboard

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
        messages=[{"role": "user", "content": "HI How are you"}],
        max_tokens=max_tokens,
        temperature=0.7,
    )

    res = response.choices[0].message.content.strip()
    print(res)
    pass

exe = Evaluation(session=neo_session, trace_id=tracer.trace_id)

# run a single metric
exe.evaluate(metric_list=['goal_decomposition_efficiency', 
                         ])

# get your evaluated metrics results
metric_results = exe.get_results()
print(metric_results)

tracer.stop()

neo_session.launch_dashboard(port=3000)