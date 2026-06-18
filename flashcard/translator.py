from deep_translator import GoogleTranslator, exceptions


def translate_sentence(text: str) -> str:
    """Translate text to English, auto-detecting the source language."""
    try:
        translator = GoogleTranslator(source="auto", target="en")
        return translator.translate(text)
    except exceptions.TranslationNotFound:
        return "(translation not available)"
    except Exception as e:
        return f"(translation error: {e})"
