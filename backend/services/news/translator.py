"""
News translator module.
Translates news content from English to Japanese using LLM.
"""
import os
import json
from typing import Optional
import re


class NewsTranslator:
    """Translates news content to Japanese."""

    def __init__(self):
        self.gemini_key = os.getenv("GEMINI_API_KEY")
        self._client = None
        self._model = None

    def _get_client(self):
        """Get or create LLM client."""
        if self._client is not None:
            return self._client

        if self.gemini_key:
            try:
                from google import genai
                self._client = genai.Client(api_key=self.gemini_key)
                self._model = "gemini-2.0-flash"
                return self._client
            except ImportError:
                print("Google GenAI package not installed")

        return None

    def translate_text(self, text: str) -> str:
        """
        Translate a single text from English to Japanese.
        Returns original text if translation fails.
        """
        if not text or text == "N/A":
            return text

        # Check if already in Japanese (has Japanese characters)
        if self._is_japanese(text):
            return text

        client = self._get_client()
        if not client:
            return text

        try:
            from google.genai import types

            prompt = f"""Translate the following English text to natural Japanese.
Keep any stock symbols (like AAPL, NVDA) and numbers unchanged.
Only output the translation, nothing else.

Text: {text}"""

            response = client.models.generate_content(
                model=self._model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.3,
                )
            )
            return response.text.strip()
        except Exception as e:
            print(f"Translation error: {e}")
            return text

    def translate_news_item(self, news_dict: dict) -> dict:
        """
        Translate all text fields in a news item to Japanese.
        """
        fields_to_translate = [
            "title",
            "relevance_reason",
            "predicted_impact",
            "supply_chain_impact",
            "competitor_impact",
        ]

        for field in fields_to_translate:
            if field in news_dict and news_dict[field]:
                original = news_dict[field]
                if not self._is_japanese(original) and original != "N/A":
                    news_dict[field] = self.translate_text(original)

        return news_dict

    def translate_batch(self, texts: list) -> list:
        """
        Translate multiple texts at once for efficiency.
        """
        if not texts:
            return texts

        # Filter out already Japanese texts
        texts_to_translate = []
        indices = []
        for i, text in enumerate(texts):
            if text and text != "N/A" and not self._is_japanese(text):
                texts_to_translate.append(text)
                indices.append(i)

        if not texts_to_translate:
            return texts

        client = self._get_client()
        if not client:
            return texts

        try:
            from google.genai import types

            # Create batch prompt
            numbered_texts = "\n".join([
                f"[{i+1}] {text}" for i, text in enumerate(texts_to_translate)
            ])

            prompt = f"""Translate the following English texts to natural Japanese.
Keep any stock symbols (like AAPL, NVDA) and numbers unchanged.
Output each translation on its own line with the same number prefix.

{numbered_texts}"""

            response = client.models.generate_content(
                model=self._model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.3,
                )
            )

            # Parse response
            translations = self._parse_batch_response(
                response.text, len(texts_to_translate)
            )

            # Apply translations
            result = list(texts)
            for idx, translation in zip(indices, translations):
                result[idx] = translation

            return result

        except Exception as e:
            print(f"Batch translation error: {e}")
            return texts

    def _is_japanese(self, text: str) -> bool:
        """Check if text contains Japanese characters."""
        if not text:
            return False
        # Check for hiragana, katakana, or kanji
        japanese_pattern = re.compile(r'[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]')
        return bool(japanese_pattern.search(text))

    def _parse_batch_response(self, response: str, expected_count: int) -> list:
        """Parse batch translation response."""
        lines = response.strip().split("\n")
        translations = []

        for line in lines:
            # Try to extract text after number prefix like "[1] " or "1. "
            match = re.match(r'^\[?\d+\]?\.?\s*(.+)$', line.strip())
            if match:
                translations.append(match.group(1))
            elif line.strip():
                translations.append(line.strip())

        # Pad with empty strings if needed
        while len(translations) < expected_count:
            translations.append("")

        return translations[:expected_count]


# Global translator instance
_translator: Optional[NewsTranslator] = None


def get_translator() -> NewsTranslator:
    """Get or create the global translator instance."""
    global _translator
    if _translator is None:
        _translator = NewsTranslator()
    return _translator


def translate_news_title(title: str) -> str:
    """Convenience function to translate a news title."""
    return get_translator().translate_text(title)


def translate_news_content(news_dict: dict) -> dict:
    """Convenience function to translate news content."""
    return get_translator().translate_news_item(news_dict)
