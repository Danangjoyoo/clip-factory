from pathlib import Path


def test_import_linter_contract_names_are_stable() -> None:
    config = Path('.importlinter').read_text()
    assert 'domain-has-no-outer-imports' in config
    assert 'application-has-no-adapter-imports' in config
    assert 'temporal-entrypoints-are-outer' in config
