from pathlib import Path
import os
import subprocess


def test_import_linter_contract_names_are_stable() -> None:
    config = Path(".importlinter").read_text()
    assert "domain-has-no-outer-imports" in config
    assert "application-has-no-adapter-imports" in config
    assert "temporal-entrypoints-are-outer" in config


def test_import_linter_rejects_domain_application_fixture() -> None:
    worker = Path(__file__).resolve().parents[2]
    repo = worker.parents[1]
    fixture = worker / "src/clip_factory/domain/_boundary_probe.py"
    fixture.write_text("from clip_factory.application.render_clip import RenderClip\n")
    try:
        result = subprocess.run(
            [
                str(repo / ".tools/bin/uv"),
                "run",
                "--directory",
                "apps/worker",
                "lint-imports",
                "--no-cache",
            ],
            cwd=repo,
            env={**os.environ, "PYTHONPATH": str(worker / "src")},
            capture_output=True,
            text=True,
            check=False,
        )
    finally:
        fixture.unlink(missing_ok=True)
    assert result.returncode != 0
    assert "domain-has-no-outer-imports" in result.stdout + result.stderr
