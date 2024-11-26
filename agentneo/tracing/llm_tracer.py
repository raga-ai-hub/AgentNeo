import asyncio
import psutil
import json
import wrapt
import functools
from datetime import datetime
import re
import os
import spacy

from detoxify import Detoxify

from detect_secrets import SecretsCollection
from detect_secrets.settings import default_settings

from .user_interaction_tracer import UserInteractionTracer
from ..utils.trace_utils import calculate_cost, load_model_costs, convert_usage_to_dict
from ..utils.llm_utils import extract_llm_output
from ..data import LLMCallModel


class LLMTracerMixin:
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.patches = []
        self.model_costs = load_model_costs()
        self.model_offensive = Detoxify('original')
        self.nlp = spacy.load("en_core_web_sm")


       

    def instrument_llm_calls(self):
        # Use wrapt to register post-import hooks
        wrapt.register_post_import_hook(self.patch_openai_methods, "openai")
        wrapt.register_post_import_hook(self.patch_litellm_methods, "litellm")

    def patch_openai_methods(self, module):
        if hasattr(module, "OpenAI"):
            client_class = getattr(module, "OpenAI")
            self.wrap_openai_client_methods(client_class)
        if hasattr(module, "AsyncOpenAI"):
            async_client_class = getattr(module, "AsyncOpenAI")
            self.wrap_openai_client_methods(async_client_class)

    def wrap_openai_client_methods(self, client_class):
        original_init = client_class.__init__

        @functools.wraps(original_init)
        def patched_init(client_self, *args, **kwargs):
            original_init(client_self, *args, **kwargs)
            self.wrap_method(client_self.chat.completions, "create")
            if hasattr(client_self.chat.completions, "acreate"):
                self.wrap_method(client_self.chat.completions, "acreate")

        setattr(client_class, "__init__", patched_init)

    def patch_litellm_methods(self, module):
        # Wrap methods in litellm
        self.wrap_method(module, "completion")
        self.wrap_method(module, "acompletion")

    def wrap_method(self, obj, method_name):
        original_method = getattr(obj, method_name)

        @wrapt.decorator
        def wrapper(wrapped, instance, args, kwargs):
            return self.trace_llm_call(wrapped, *args, **kwargs)

        wrapped_method = wrapper(original_method)
        setattr(obj, method_name, wrapped_method)
        self.patches.append((obj, method_name, original_method))

    def trace_llm_call(self, original_func, *args, **kwargs):
        start_time = datetime.now()
        start_memory = psutil.Process().memory_info().rss

        agent_id = self.current_agent_id.get()
        llm_call_name = self.current_llm_call_name.get() or original_func.__name__

        try:
            print("I am here")
            print(args[0])
            result = original_func(*args, **kwargs)

            end_time = datetime.now()
            end_memory = psutil.Process().memory_info().rss
            memory_used = max(0, end_memory - start_memory)

            sanitized_args = self._sanitize_api_keys(args)
            sanitized_kwargs = self._sanitize_api_keys(kwargs)

            model_name = self._extract_model_name(sanitized_kwargs)
            try:
                model = (
                    os.path.join("groq", model_name) if result.x_groq else model_name
                )
            except:
                model = model_name

            llm_call = self.process_llm_result(
                result,
                llm_call_name,
                model,
                self._extract_input(sanitized_args, sanitized_kwargs),
                start_time,
                end_time,
                memory_used,
                agent_id,
            )

            # Append llm_call_id to current_llm_call_ids
            llm_call_ids = self.current_llm_call_ids.get()
            if llm_call_ids is None:
                llm_call_ids = []
                self.current_llm_call_ids.set(llm_call_ids)
            llm_call_ids.append(llm_call.id)

            return result
        except Exception as e:
            self._log_error(e, "llm", llm_call_name)
            raise

    def process_llm_result(
        self, result, name, model, prompt, start_time, end_time, memory_used, agent_id
    ):
        llm_data = extract_llm_output(result)
        agent_id = self.current_agent_id.get()

        token_usage = {"input": 0, "completion": 0, "reasoning": 0}

        if hasattr(result, "usage"):
            usage = result.usage
            token_usage["input"] = getattr(usage, "prompt_tokens", 0)
            token_usage["completion"] = getattr(usage, "completion_tokens", 0)
            token_usage["reasoning"] = getattr(usage, "reasoning_tokens", 0)

        # Default cost values if the model or default is not found
        default_cost = {"input": 0.0, "output": 0.0, "reasoning": 0.0}

        # Try to get the model-specific cost, fall back to default, then to default_cost
        model_cost = self.model_costs.get(
            model, self.model_costs.get("default", default_cost)
        )

        cost = {
            "input": token_usage["input"] * model_cost["input_cost_per_token"],
            "output": token_usage["completion"] * model_cost["output_cost_per_token"],
            "reasoning": token_usage["reasoning"]
            * model_cost.get("reasoning_cost_per_token", 0),
        }

        llm_call = LLMCallModel(
            project_id=self.project_id,
            trace_id=self.trace_id,
            agent_id=agent_id,
            name=name,
            model=llm_data.model_name,
            input_prompt=str(prompt),
            output=str(llm_data.output_response),
            tool_call=(
                str(llm_data.tool_call) if llm_data.tool_call else llm_data.tool_call
            ),
            start_time=start_time,
            end_time=end_time,
            duration=(end_time - start_time).total_seconds(),
            token_usage=json.dumps(token_usage),
            cost=json.dumps(cost),
            memory_used=memory_used,
        )

        with self.Session() as session:
            session.add(llm_call)
            session.commit()
            session.refresh(llm_call)

            # Create a dictionary with all the necessary information
            llm_call_data = {
                "id": llm_call.id,
                "name": name,
                "model": llm_data.model_name,
                "input_prompt": prompt,
                "output": llm_data.output_response,
                "tool_call": llm_data.tool_call,
                "start_time": start_time,
                "end_time": end_time,
                "duration": (end_time - start_time).total_seconds(),
                "token_usage": token_usage,
                "cost": cost,
                "memory_used": memory_used,
                "agent_id": agent_id,
            }

        if agent_id:
            llm_call_ids = self.current_llm_call_ids.get()
            if llm_call_ids is None:
                llm_call_ids = []
                self.current_llm_call_ids.set(llm_call_ids)
            llm_call_ids.append(llm_call.id)

        # Append the data to trace_data outside the session
        self.trace_data.setdefault("llm_calls", []).append(llm_call_data)

        return llm_call

    def _extract_model_name(self, kwargs):
        return kwargs.get("model", "unknown")

    def _extract_input(self, args, kwargs):
        if "prompt" in kwargs:
            return kwargs["prompt"]
        elif "messages" in kwargs:
            return kwargs["messages"]
        else:
            return args[0] if args else ""

    def _sanitize(self,*text):
        data = self._sanitize_api_keys(text[0])
        data = self._sanitize_personal_info(data)
        data = self._sanitize_language(data)
        return data
    
    def _sanitize_api_keys(self, data):
        temp_file = "temp_test.txt"
        with open(temp_file, "w") as f:
            f.write(data)
        
        try:
            secrets = SecretsCollection()
            
            with default_settings():
                secrets.scan_file(temp_file)

            secrets_data = secrets.json()
            if secrets_data:
                print("\nSecrets found in the text:")
                print(json.dumps(secrets_data, indent=2))
                
                for filename, secrets_list in secrets_data.items():
                    for secret in secrets_list:
                        secret_value = secret.get('hashed_secret', None) or 'unknown'
                        data = re.sub(rf'\b{re.escape(secret_value)}\b', '[REDACTED]', data)
            else:
                print()
        except Exception as e:
            print(f"\nAn unexpected error occurred: {e}")
        finally:
            # Clean up the temporary file
            import os
            if os.path.exists(temp_file):
                os.remove(temp_file)

        return data

    def _sanitize_personal_info(self,text):
        patterns = {
            "PHONE_NUMBER": r"\b\d{10}\b",  # 10-digit phone number
            "OTP": r"\b\d{6}\b",  # 6-digit OTP
            "CREDIT_CARD": r"\b(?:\d[ -]*?){13,16}\b",  # 13-16 digit credit card
            "BANK_PIN": r"\b\d{4,6}\b",  # 4 or 6 digit PIN
            "AADHAR": r"\b\d{4}-\d{4}-\d{4}\b",  # Aadhar in xxxx-xxxx-xxxx format
            "PAN": r"\b[A-Z]{5}\d{4}[A-Z]\b",  # PAN card
            "PASSPORT": r"\b[A-Z]{1}\d{7}\b",  # Passport
            "API_KEY": r"\b[a-zA-Z0-9_-]{16,}\b",  # Alphanumeric API key (16+ chars)
        }
        results = {}

        # Regex-based extraction and sanitization
        for label, pattern in patterns.items():
            matches = re.findall(pattern, text)
            if matches:
                # For CREDIT_CARD, validate matches
                if label == "CREDIT_CARD":
                    valid_cards = [card for card in matches if self._is_valid_credit_card(card)]
                    results[label] = valid_cards if valid_cards else "Invalid card(s) detected"
                    matches = valid_cards
                else:
                    results[label] = matches
                
                # Remove matches from text
                for match in matches:
                    text = re.sub(re.escape(match), "[REDACTED]", text)

        # spaCy-based NER extraction for Name and Address
        doc = self.nlp(text)
        name_entities = [ent.text for ent in doc.ents if ent.label_ == "PERSON"]
        address_entities = [ent.text for ent in doc.ents if ent.label_ == "GPE"]

        # Add to results and sanitize text
        if name_entities:
            results["NAME"] = name_entities
            for name in name_entities:
                text = text.replace(name, "[REDACTED]")
        
        if address_entities:
            results["ADDRESS"] = address_entities
            for address in address_entities:
                text = text.replace(address, "[REDACTED]")

        # Print found personal information
        # if results:
        #     print("\nPersonal Information Found:")
        #     for key, value in results.items():
        #         print(f"{key}: {value}")
        # else:
        #     print("\nNo personal information detected.")

        # Return sanitized text
        return text

    def _sanitize_language(self,text):

        words = text.split()
        masked_words = []

        for word in words:
            word_lower = word.lower()

            toxicity = self.model_offensive.predict(word_lower)
            
            toxic_categories = ['toxicity', 'severe_toxicity', 'obscene', 'threat', 'insult', 'identity_attack']
            
            if any([toxicity[category] > 0.95 for category in toxic_categories]):  # You can adjust this threshold as needed
                masked_words.append("[REDACTED]")
            else:
                masked_words.append(word)

        print()

        return " ".join(masked_words)

    

    def _is_valid_credit_card(self,card_number):
        """Check if credit card number is valid using Luhn's Algorithm."""
        card_number = re.sub(r"[^\d]", "", card_number)  # Remove non-digits
        total = 0
        reverse_digits = card_number[::-1]
        for i, digit in enumerate(map(int, reverse_digits)):
            if i % 2 == 1:
                digit *= 2
                if digit > 9:
                    digit -= 9
            total += digit
        return total % 10 == 0



    def unpatch_llm_calls(self):
        for obj, method_name, original_method in self.patches:
            setattr(obj, method_name, original_method)
        self.patches.clear()

    def trace_llm(self, name: str):
        def decorator(func_or_class):
            if isinstance(func_or_class, type):
                for attr_name, attr_value in func_or_class.__dict__.items():
                    if callable(attr_value) and not attr_name.startswith("__"):
                        setattr(
                            func_or_class,
                            attr_name,
                            self.trace_llm(f"{name}.{attr_name}")(attr_value),
                        )
                return func_or_class
            else:

                @functools.wraps(func_or_class)
                async def async_wrapper(*args, **kwargs):
                    token = self.current_llm_call_name.set(name)
                    try:
                        print("hey there")
                        print(args[0])
                        data1 = self._sanitize(*args)
                        print("The sanitized prompt:\n")
                        print(data1)
                        return await func_or_class(data1, **kwargs)
                    finally:
                        self.current_llm_call_name.reset(token)

                @functools.wraps(func_or_class)
                def sync_wrapper(*args, **kwargs):
                    token = self.current_llm_call_name.set(name)
                    try:
                        return func_or_class(*args, **kwargs)
                    finally:
                        self.current_llm_call_name.reset(token)

                return (
                    async_wrapper
                    if asyncio.iscoroutinefunction(func_or_class)
                    else sync_wrapper
                )

        return decorator
