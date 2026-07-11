from tiktoken import get_encoding

from clip_factory.ports.tokenizer import TokenizationResult


class OpenAITokenizer:
    encoding_name = "o200k_base"
    version = "tiktoken-0.13.0"

    def __init__(self) -> None:
        self._encoding = get_encoding(self.encoding_name)

    def count(
        self, prompt: str, transcript: str, output_tokens: int = 0
    ) -> TokenizationResult:
        return TokenizationResult(
            len(self._encoding.encode(prompt + transcript)),
            0,
            0,
            output_tokens,
            self.encoding_name,
            self.version,
        )
