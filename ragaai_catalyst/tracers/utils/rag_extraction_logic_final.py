import logging
logger = logging.getLogger(__name__)
import json

def rag_trace_json_converter(input_trace):
    tracer_type = input_trace.get("tracer_type")
    input_trace = input_trace.get("data", [])[0].get("spans", [])
    def get_prompt(input_trace):
        try:
            if tracer_type == "langchain":
                for span in input_trace:
                    try:
                        attributes = span.get("attributes", {})
                        
                        if attributes:
                            for key, value in attributes.items():
                                try:
                                    if key.startswith("llm.input_messages.") and key.endswith(".message.role") and value == "user":
                                        message_num = key.split(".")[2]
                                        content_key = f"llm.input_messages.{message_num}.message.content"
                                        if content_key in attributes:
                                            return attributes.get(content_key)
                                except Exception as e:
                                    logger.warning(f"Error processing attribute key-value pair: {str(e)}")
                                    continue

                            for key, value in attributes.items():
                                try:
                                    if key.startswith("llm.prompts") and isinstance(value, list):
                                        human_message = None
                                        for message in value:
                                            if isinstance(message, str):
                                                human_index = message.find("Human:")
                                                if human_index != -1:
                                                    human_message = message[human_index:].replace("Human:", "")
                                                    break
                                        return human_message if human_message else value
                                except Exception as e:
                                    logger.warning(f"Error processing attribute key-value pair for prompt: {str(e)}")
                                    continue
                    except Exception as e:
                        logger.warning(f"Error processing span for prompt extraction: {str(e)}")
                        continue
                
                for span in input_trace:
                    try:
                        if span["name"] == "LLMChain":
                            try:
                                input_value = span["attributes"].get("input.value", "{}")
                                return json.loads(input_value).get("question", "")
                            except json.JSONDecodeError:
                                logger.warning(f"Invalid JSON in LLMChain input.value: {input_value}")
                                continue
                        elif span["name"] == "RetrievalQA":
                            return span["attributes"].get("input.value", "")
                        elif span["name"] == "VectorStoreRetriever":
                            return span["attributes"].get("input.value", "")
                    except Exception as e:
                        logger.warning(f"Error processing span for fallback prompt extraction: {str(e)}")
                        continue
                
                logger.warning("No user message found in any span")
                logger.warning("Returning empty string for prompt.")
                return ""
            elif tracer_type == "llamaindex":
                for span in input_trace:
                    if span["name"] == "BaseQueryEngine.query":
                        return span["attributes"]["input.value"]
                    elif "query_bundle" in span["attributes"].get("input.value", ""):
                        try:
                            query_data = json.loads(span["attributes"]["input.value"])
                            if "query_bundle" in query_data:
                                return query_data["query_bundle"]["query_str"]
                        except json.JSONDecodeError:
                            logger.error("Failed to parse query_bundle JSON")
            logger.error("Prompt not found in the trace")
            return None
        except Exception as e:
            logger.error(f"Error while extracting prompt from trace: {str(e)}")
            return None
    
    def get_response(input_trace):
        try:
            if tracer_type == "langchain":
                for span in input_trace:
                    try:
                        attributes = span.get("attributes", {})
                        if attributes:
                            for key, value in attributes.items():
                                try:
                                    if key.startswith("llm.output_messages.") and key.endswith(".message.content"):
                                        return value
                                except Exception as e:
                                    logger.warning(f"Error processing attribute key-value pair for response: {str(e)}")
                                    continue
                            
                            for key, value in attributes.items():
                                try:
                                    if key.startswith("output.value"):
                                        try:
                                            output_json = json.loads(value)
                                            if "generations" in output_json and isinstance(output_json.get("generations"), list) and len(output_json.get("generations")) > 0:
                                                if isinstance(output_json.get("generations")[0], list) and len(output_json.get("generations")[0]) > 0:
                                                    first_generation = output_json.get("generations")[0][0]
                                                    if "text" in first_generation:
                                                        return first_generation["text"]
                                        except json.JSONDecodeError:
                                            logger.warning(f"Invalid JSON in output.value: {value}")
                                            continue
                                except Exception as e:
                                    logger.warning(f"Error processing attribute key-value pair for response: {str(e)}")
                                    continue
                    except Exception as e:
                        logger.warning(f"Error processing span for response extraction: {str(e)}")
                        continue
                
                for span in input_trace:
                    try:
                        if span["name"] == "LLMChain":
                            try:
                                output_value = span["attributes"].get("output.value", "")
                                if output_value:
                                    return json.loads(output_value)
                                return ""
                            except json.JSONDecodeError:
                                logger.warning(f"Invalid JSON in LLMChain output.value: {output_value}")
                                continue
                        elif span["name"] == "RetrievalQA":
                            return span["attributes"].get("output.value", "")
                        elif span["name"] == "VectorStoreRetriever":
                            return span["attributes"].get("output.value", "")
                    except Exception as e:
                        logger.warning(f"Error processing span for fallback response extraction: {str(e)}")
                        continue
                
                logger.warning("No response found in any span")
                return ""
            elif tracer_type == "llamaindex":
                for span in input_trace:
                    if span["name"] == "BaseQueryEngine.query":
                        return span["attributes"]["output.value"]
            logger.error("Response not found in the trace")
            return None
        except Exception as e:
            logger.error(f"Error while extracting response from trace: {str(e)}")
            return None
    
    def get_context(input_trace):
        try:
            if tracer_type == "langchain":
                for span in input_trace:
                    try:
                        if span["name"] == "CustomContextSpan":
                            return span["attributes"].get("input.value", "")
                        elif span["name"] == "VectorStoreRetriever":
                            return span["attributes"].get("retrieval.documents.1.document.content", "")
                    except Exception as e:
                        logger.warning(f"Error processing span for context extraction: {str(e)}")
                        continue
            elif tracer_type == "llamaindex":
                for span in input_trace:
                    try:
                        if span["name"] == "CustomContextSpan":
                            return span["attributes"].get("input.value", "")
                        elif span["name"] == "BaseRetriever.retrieve":
                            return span["attributes"]["retrieval.documents.1.document.content"]
                    except Exception as e:
                        logger.warning(f"Error processing span for context extraction: {str(e)}")
                        continue
            logger.warning("Context not found in the trace")
            return ""
        except Exception as e:
            logger.error(f"Error while extracting context from trace: {str(e)}")
            return ""

    def get_gt(input_trace):
        try:
            if tracer_type == "langchain":
                for span in input_trace:
                    try:
                        if span["name"] == "CustomGroundTruthSpan":
                            return span["attributes"].get("input.value", "")
                    except Exception as e:
                        logger.warning(f"Error processing span for ground truth extraction: {str(e)}")
                        continue
            elif tracer_type == "llamaindex":
                for span in input_trace:
                    try:
                        if span["name"] == "CustomGroundTruthSpan":
                            return span["attributes"].get("input.value", "")
                    except Exception as e:
                        logger.warning(f"Error processing span for ground truth extraction: {str(e)}")
                        continue
            logger.warning("Ground truth not found in the trace")
            return ""
        except Exception as e:
            logger.error(f"Error while extracting ground truth from trace: {str(e)}")
            return ""
    
    prompt = get_prompt(input_trace)
    response = get_response(input_trace)
    context = get_context(input_trace)
    gt = get_gt(input_trace)
    
    return prompt, response, context, gt