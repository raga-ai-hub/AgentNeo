import pytest
from agentneo.utils.security_utils import PIIObfuscation
from presidio_anonymizer.entities import OperatorConfig

def test_pii_masking_occurs():
    """Verify that PII masking actually changes the input."""
    obfuscator = PIIObfuscation()
    
    # Test cases with known PII
    text = f"""
    Joel Robin. You can email me at joel.joel.joel@example.com or call me at +1-213-456-7890. My health insurance number is HIN123456789. 
    My medical record number is MRN-9876543210. My degree transcript access key is 5678-XYZ-1234-ABCD.
    """
    
    masked_output = obfuscator.detect_and_mask_pii_secrets(text, enable_advanced_pii_mask=True)
    
    assert masked_output != text, f"Masking failed for input: {text}"

def test_pii_custom():    
    # Test cases with known PII
    test_case_1 = f"My name is Joel Robin"
    test_case_2 = f"My email adrress is joeljoel@joel.joel"
    entity = ["PERSON"]
    operator = {"PERSON": OperatorConfig("replace", {"new_value": "[NAME]"})}
    obfuscator = PIIObfuscation()
    masked_output_1 = obfuscator.detect_and_mask_pii_secrets(data=test_case_1, use_default=False,entities=entity,operators=operator)
    masked_output_2 = obfuscator.detect_and_mask_pii_secrets(data=test_case_2, use_default=False,entities=entity,operators=operator)

    assert masked_output_1!=test_case_1
    assert masked_output_2==test_case_2

def test_pii_advanced():
    test_case_1 = f"My key for home is 123@#$123@#34234"
    obfuscator = PIIObfuscation()
    masked_output_1 = obfuscator.detect_and_mask_pii_secrets(data=test_case_1, enable_advanced_pii_mask=True)
    masked_output_2 = obfuscator.detect_and_mask_pii_secrets(data=test_case_1)

    assert masked_output_1!=test_case_1
    assert masked_output_2==test_case_1
    

