def mask_keywords(text, keywords):
    from flashtext import KeywordProcessor
    processor = KeywordProcessor()
    try:
        for keyword in keywords:
            processor.add_keyword(keyword, "[removed]")
    except Exception as e:
        print(f"Error while masking keywords: {e}")
    return processor.replace_keywords(text)

def anonymize_text(text, entities, regex_patterns):
    # Importing required libraries inside the function
    from presidio_analyzer import AnalyzerEngine, PatternRecognizer, Pattern
    from presidio_anonymizer import AnonymizerEngine

    try:
        # Step 1: Initialize the Presidio engines
        analyzer = AnalyzerEngine()
        anonymizer = AnonymizerEngine()

        # Step 2: Dynamically add custom recognizers using a loop
        if regex_patterns:
            for entity, regex in regex_patterns.items():
                pattern = Pattern(name=f"{entity} Pattern", regex=regex, score=0.85)
                recognizer = PatternRecognizer(
                    supported_entity=entity,
                    patterns=[pattern],
                )
                analyzer.registry.add_recognizer(recognizer)
        
        # Step 3: Analyze the text to identify PII
        results = analyzer.analyze(
            text=text,
            entities=(entities or []) + list(regex_patterns.keys()) if regex_patterns else entities,
            language="en",
        )

        # Step 4: Anonymize the PII using the analyzer results
        anonymized_text = anonymizer.anonymize(text=text, analyzer_results=results)
        return anonymized_text.text

    except Exception as e:
        print(f"Error during anonymization: {e}")
        return text  # Return original text in case of failure

def replace_similar_words(text, target_word, threshold=0.6, model="en_core_web_md"):
    import spacy
    try:
        # Load SpaCy's model with word vectors
        nlp = spacy.load(model)

        # Process the text and target word
        doc = nlp(text)
        target_token = nlp(target_word)[0]

        # Initialize variables
        modified_tokens = list(doc)
        similar_words = []

        # Find and replace similar words
        for token in doc:
            if token.has_vector and target_token.has_vector:
                similarity = target_token.similarity(token)
                if similarity > threshold:
                    similar_words.append((token.text, similarity))
                    modified_tokens[token.i] = "[removed]"

        # Reconstruct the modified text
        modified_text = "".join(
            token if isinstance(token, str) else token.text_with_ws for token in modified_tokens
        )

        return modified_text, similar_words

    except Exception as e:
        print(f"Error during similar word replacement: {e}")
        return text, []  # Return original text and empty list in case of failure

def filter_text(txt, filters):
    try:  
        # Step 1: Mask keywords using FlashText for specific keywords
        txt = mask_keywords(txt, filters.get('flashtext', []))

        # Step 2: Anonymize PII using Presidio for entities and regex patterns
        txt = anonymize_text(
            txt, 
            filters.get('presidio', []), 
            filters.get('regex_patterns', {})
        )

        # Step 3: Replace similar words using SpaCy for the specified entities and threshold
        spacy_filters = filters.get('spacy', {})
        if spacy_filters:
            for entity in spacy_filters.get('entities', []):
                txt, _ = replace_similar_words(
                    txt, 
                    entity, 
                    threshold=spacy_filters.get('threshold', 0.6)
                )

        return txt

    except Exception as e:
        print(f"Error in filter function: {e}")
        return txt  # Return original text in case of failure

filters = {
    "presidio": [
    "EMAIL_ADDRESS",
    "PHONE_NUMBER",
    "CREDIT_CARD",
    "DATE_TIME",
    "IP_ADDRESS",
    "DOMAIN_NAME",
    "URL",
    "NRP",
    "IBAN_CODE",
    "SWIFT_CODE",
    "LOCATION",
    "PERSON",
    "US_SSN",
    "US_ITIN",
    "DRIVER_LICENSE",
    "PASSPORT",
    "MEDICAL_LICENSE",
    "HEALTH_INSURANCE",
    "CRYPTO",
    "AWS_ACCESS_KEY",
    "AWS_SECRET_KEY",
    "API_KEY",
    "KEY",
    "USER",
    "AGE",
    "BANK_ACCOUNT",
    "IN_AADHAAR",
    "AU_ACN",
    "UK_NHS",
    "IN_PASSPORT",
    "AU_ABN",
    "IN_VOTER",
    "US_BANK_NUMBER",
    "ORGANIZATION",
    "AU_TFN",
    "US_PASSPORT",
    "SG_NRIC_FIN",
    "IN_PAN",
    "IN_VEHICLE_REGISTRATION",
    "AU_MEDICARE"
],
    "flashtext": [
        "bank"
    ],
    "spacy": {
        "threshold": 0.85,
        "entities": [
            "account"
        ]
    },
    "regex_patterns": {
        "email_address": r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
        "openai_api_key": r"sk-[a-zA-Z0-9]{32,}",
    }
}

# Sample text to be filtered
text = '''Rahul is the boy which is very famous for his openai api key sk-1234567890abcdefghijklmnopqrstuvwx  and his details are John Doe's email is john.doe@example.com,
   He lives at 1234 Elm Street, Springfield, USA. 
   His credit card number is 4111-1111-1111-1111. 
   His bank account number is 1234567890, and 
   the IBAN code is DE89370400440532013000. 
   His Bitcoin wallet address is 1BoatSLRHtKNngkdXEeobR76b53LETtpyT.'''

filtered_text = filter_text(text, filters)
print(filtered_text)
