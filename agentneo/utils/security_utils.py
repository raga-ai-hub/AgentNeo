import re
import password_strength
from presidio_analyzer import AnalyzerEngine, RecognizerRegistry
from presidio_anonymizer import AnonymizerEngine
from presidio_anonymizer.entities import OperatorConfig
from dataclasses import dataclass, asdict, is_dataclass
from typing import List, Dict, Any, Union, Optional
import spacy
import json

spacy.load('en_core_web_lg')

class PIIObfuscation:
    def __init__(self):
        self.registry = RecognizerRegistry()
        self.registry.load_predefined_recognizers()

    def _get_entities(self, use_default=True, entities = None):
        """
        Retrieve entities for text anonymization.

        Args:
            use_default (bool, optional): Flag to use default predefined entities. 
                Defaults to True.
            entities (list, optional): Custom list of entities to use.

        Returns:
            list: A list of entity types to be used for anonymization.

        Raises:
            ValueError: If no custom entities are defined when use_default is False.
        """
        if use_default:
            return ["PERSON", "PHONE_NUMBER", "EMAIL_ADDRESS", "SSN", "URL"]
        
        if not entities:
            raise ValueError("""If not using default Entities, you must define your own entities and operators, 
                             else enable use_default to true""")
        
        return entities

    def _get_operators(self, use_default=True, operators = None):
        """
        Retrieve operator configurations for entity masking.

        Args:
            use_default (bool, optional): Flag to use default operator configurations. 
                Defaults to True.
            operators (dict, optional): Custom operators to use.

        Returns:
            dict: A dictionary of OperatorConfig for different entity types.

        Raises:
            ValueError: If no custom operators are defined when use_default is False.
        """
        default_operators = {
            "PERSON": OperatorConfig("replace", {"new_value": "[NAME]"}),
            "PHONE_NUMBER": OperatorConfig("replace", {"new_value": "[PHONE]"}),
            "EMAIL_ADDRESS": OperatorConfig("replace", {"new_value": "[EMAIL]"}),
            "SSN": OperatorConfig("replace", {"new_value": "[SSN]"}),
            "URL": OperatorConfig("replace", {"new_value": "[URL]"})
        }

        if use_default:
            return default_operators
        
        if not operators:
            raise ValueError("""If not using default operators, you must define your own operator and entities configurations. Else enable use_default to true
                             eg: operators = {"CUSTOM": OperatorConfig("replace", {"new_value": "[CUSTOM]"})}
                             """)
        
        return operators

    def _extract_strings(self, data: Any) -> List[str]:
        """
        Recursively extract all string values from various data types.

        Args:
            data (Any): Input data of any type.

        Returns:
            List[str]: List of extracted string values.
        """
        strings = []

        if isinstance(data, str):
            return [data]
        elif isinstance(data, dict):
            for value in data.values():
                strings.extend(self._extract_strings(value))
        elif isinstance(data, (list,tuple)):
            for item in data:
                strings.extend(self._extract_strings(item))
        elif is_dataclass(data):
            strings.extend(self._extract_strings(asdict(data)))
        
        return strings

    def _replace_strings(self, data: Any, replacements: Dict[str, str]) -> Any:
        """
        Recursively replace strings in the original data structure.

        Args:
            data (Any): Original data structure.
            replacements (Dict[str, str]): Dictionary of original strings and their masked versions.

        Returns:
            Any: Data structure with strings replaced.
        """
        if isinstance(data, str):
            return replacements.get(data, data)
        
        if isinstance(data, dict):
            return {k: self._replace_strings(v, replacements) for k, v in data.items()}
        
        if isinstance(data, list):
            return [self._replace_strings(item, replacements) for item in data]
        
        if isinstance(data, tuple):
            return tuple(self._replace_strings(item, replacements) for item in data)
        
        
        if is_dataclass(data):
            data_dict = asdict(data)
            replaced_dict = self._replace_strings(data_dict, replacements)
            return type(data)(**replaced_dict)
        
        return data

    def detect_and_mask_pii_secrets(self, 
                                    data: Any, 
                                    language="en", 
                                    use_default=True, 
                                    enable_advanced_pii_mask=True, 
                                    entities=None, 
                                    operators=None) -> Any:
        """
        Detects and masks Personally Identifiable Information (PII) and strong passwords 
        in the given data structure.

        Args:
            data (Any): The input data to be processed.
            language (str): The language of the input text (default: "en").
            use_default (bool): If True, applies the default PII detection rules.
            enable_advanced_pii_mask (bool): If True, enables advanced masking techniques.
            entities (list[str], optional): Custom PII entity types to detect.
            operators (dict, optional): Custom rules for PII detection and masking.

        Returns:
            Any: The processed data with PII and strong passwords masked.
        """
        strings = self._extract_strings(data)

        # Track replacements to maintain original structure
        replacements = {}

        for text in strings:
            # First mask sensitive data using Presidio
            pii_masked_text = self.detect_and_mask_pii_data(
                text, language, use_default, entities, operators
            )

            # Then mask potential passwords if advanced masking is enabled
            if enable_advanced_pii_mask:
                fully_masked_text = self.detect_and_mask_sensitive_data(pii_masked_text)
            else:
                fully_masked_text = pii_masked_text

            # Store the replacement if the text has changed
            if text != fully_masked_text:
                replacements[text] = fully_masked_text

        # Replace strings in the original data structure
        return self._replace_strings(data, replacements)

    def detect_and_mask_pii_data(self, text, language="en", use_default=True, entities=None, operators=None):
        """
        Mask sensitive information using Presidio Analyzer and Anonymizer
        
        Args:
            text (str): Input text to anonymize
            language (str): Language of the text (default: English)
        
        Returns:
            str: Text with sensitive data masked
        """
        # Validate and get entities and operators
        entities = self._get_entities(use_default, entities)
        operators = self._get_operators(use_default, operators)

        # Set up analyzer
        analyzer = AnalyzerEngine(registry=self.registry)

        # Analyze the text with specific entity types
        analyzer_results = analyzer.analyze(
            text=text, 
            language=language, 
            entities=entities
        )

        # Set up anonymizer
        anonymizer = AnonymizerEngine()

        # Anonymize the text
        anonymized_text = anonymizer.anonymize(
            text=text, 
            analyzer_results=analyzer_results,
            operators=operators
        )

        return anonymized_text.text

    @staticmethod
    def detect_and_mask_sensitive_data(text):
        """
        Detect and mask potential strong passwords/sensitive data in text
        
        Args:
            text (str): Input text to process
        
        Returns:
            str: Text with strong passwords masked
        """
        def extract_potential_passwords(text):
            """
            Extract potential password-like strings from text
            """
            
            # Regex to find potential passwords
            password_patterns = [
                r'\b[A-Za-z0-9!@#$%^&*()_+\-=\[\]{};:\'",.<>?/]{8,}\b',  # Complex strings
                r'\b(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()])[A-Za-z\d!@#$%^&*()]{8,}\b'  # Mixed character types
            ]
            
            password_candidates = []
            for pattern in password_patterns:
                password_candidates.extend(re.findall(pattern, text))
            
            return password_candidates

        def is_strong_password(password):
            """
            Use password_strength to evaluate password strength
            """
            try:
                strength = password_strength.PasswordStats(password)
                return (strength.entropy_bits > 40 and strength.length > 2)
            except:
                return False

        def mask_password(password):
            """
            Secure password masking
            """
            return "REDACTED"

        # Extract potential passwords
        potential_passwords = extract_potential_passwords(text)
        
        # Filter and mask strong passwords
        masked_text = text
        for password in potential_passwords:
            if is_strong_password(password):
                masked_password = mask_password(password)
                masked_text = masked_text.replace(password, masked_password)
        
        return masked_text

# text = f"""
#     Joel Robin. You can email me at joel.joel.joel@example.com or call me at +1-213-456-7890. My health insurance number is HIN123456789. 
#     My medical record number is MRN-9876543210. My degree transcript access key is 5678-XYZ-1234-ABCD.
# """

# entity = ["PERSON"]
# operator = {"PERSON": OperatorConfig("replace", {"new_value": "[NAME]"})}
# obfuscator = PIIObfuscation()
# print(obfuscator.detect_and_mask_pii_secrets(text))