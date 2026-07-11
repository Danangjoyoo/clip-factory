from clip_factory.adapters.tokenization.openai_tokenizer import OpenAITokenizer


def test_records_encoding_version() -> None:
    result = OpenAITokenizer().count("hello", " world")
    assert result.total_input > 0
    assert result.encoding == "o200k_base"
    assert result.version == "tiktoken-0.13.0"
