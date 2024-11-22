from flashtext import KeywordProcessor
from presidio_analyzer import AnalyzerEngine, PatternRecognizer, Pattern
from presidio_anonymizer import AnonymizerEngine
import spacy
import logging

# Set the logging level for Presidio to WARNING or higher
logging.getLogger("presidio-analyzer").setLevel(logging.WARNING)

def mask_keywords(text, keywords):
    """
    Masks specified keywords in the text by replacing them with '[removed]'.

    Args:
        text (str): The input text to process.
        keywords (list): A list of keywords to be masked.

    Returns:
        str: The text with specified keywords masked.
    """
    processor = KeywordProcessor()
    try:
        for keyword in keywords:
            processor.add_keyword(keyword, "[removed]")
        return processor.replace_keywords(text)
    except Exception as e:
        print(f"Error while masking keywords: {e}")
        return text


def anonymize_text(text, entities=[], regex_patterns={}):
    """
    Anonymizes Personally Identifiable Information (PII) in the text using Presidio.

    Args:
        text (str): The input text to anonymize.
        entities (list): A list of entities to anonymize (e.g., 'EMAIL_ADDRESS').
        regex_patterns (dict): A dictionary of custom regex patterns for additional PII.

    Returns:
        str: The anonymized text.
    """
    try:

        # Initialize Presidio engines with the loaded NLP engine
        analyzer = AnalyzerEngine(supported_languages=["en","es","it","pl"])  # Pass the model object here
        anonymizer = AnonymizerEngine()  # Pass the model object here

        # Add custom regex patterns as recognizers
        if regex_patterns:
            for entity, regex in regex_patterns.items():
                pattern = Pattern(name=f"{entity} Pattern", regex=regex, score=0.85)
                recognizer = PatternRecognizer(
                    supported_entity=entity,
                    patterns=[pattern]
                )
                analyzer.registry.add_recognizer(recognizer)

        # Analyze text for PII
        results = analyzer.analyze(
            text=text,
            entities=(entities or []) + list(regex_patterns.keys()),
            language="en"
        )

        # Anonymize identified PII
        anonymized_text = anonymizer.anonymize(text=text, analyzer_results=results)
        return anonymized_text.text
    except Exception as e:
        print(f"Error during anonymization: {e}")
        return text


def replace_similar_words(text, target_word, threshold=0.6, model="en_core_web_md"):
    """
    Replaces words in the text similar to the target word with '[removed]'.

    Args:
        text (str): The input text to process.
        target_word (str): The word to compare for similarity.
        threshold (float): Similarity threshold for replacement.
        model (str): SpaCy model to use for similarity calculations.

    Returns:
        tuple: Modified text and a list of replaced words with their similarity scores.
    """
    try:
        # Load SpaCy model
        nlp = spacy.load(model)
        doc = nlp(text)
        target_token = nlp(target_word)[0]

        # Process text and replace similar words
        modified_tokens = list(doc)
        similar_words = []

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
        return text, []


def filter_text(text, filters={}, pii=False):
    """
    Applies multiple filtering mechanisms (masking, anonymization, similarity replacement)
    to sanitize the input text.

    Args:
        text (str): The input text to filter.
        filters (dict): A dictionary of filtering options.

    Returns:
        str: The filtered text.
    """
    try:
        if pii is True:
            return anonymize_text(text, entities=['PERSON', 'PHONE_NUMBER', 'EMAIL_ADDRESS'])
  
        # Step 1: Mask keywords using FlashText
        if 'flashtext' in filters:
            text = mask_keywords(text, filters['flashtext'])

        # Step 2: Anonymize PII using Presidio
        presidio_filters = filters.get('presidio', [])
        regex_patterns = filters.get('regex_patterns', {})
        if presidio_filters:
            text = anonymize_text(text, presidio_filters, regex_patterns)

        # Step 3: Replace similar words using SpaCy
        spacy_filters = filters.get('spacy', {})
        if spacy_filters:
            for entity in spacy_filters.get('entities', []):
                text, _ = replace_similar_words(
                    text, 
                    target_word=entity, 
                    threshold=spacy_filters.get('threshold', 0.6)
                )

        return text
    except Exception as e:
        print(f"Error in filter_text function: {e}")
        return text