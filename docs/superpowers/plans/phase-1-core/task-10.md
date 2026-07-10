# Task 10: Validate Local Filepaths, Fingerprints, and Relinking

> **For agentic workers:** Use superpowers:test-driven-development. Exercise real temporary files and symlinks; do not mock `Path.resolve`.

## Purpose and traceability

Implement design §§5, 9, 20, 23–24: read-only local sources constrained to allowed roots, lightweight change detection, paused states, and explicit compatible relinking.

## Boundaries, exact files, and prerequisites

- Requires Tasks 5–8.
- Python application owns `SourceValidationPort.validate_and_persist(sourceAssetId) -> SourceValidationReceipt`; the receipt contains only source ID, health, fingerprint, and sanitized probe. The concrete adapter composes Task 8's authenticated locator client with local filesystem/hash helpers and posts the raw resolved path back through Task 8's validation endpoint before returning. Raw paths remain adapter-local and never enter application/domain or Temporal results.
- Create: `apps/worker/src/clip_factory/domain/source.py`
- Create: `apps/worker/src/clip_factory/ports/source_validation.py`
- Create: `apps/worker/src/clip_factory/application/validate_local_source.py`
- Create: `apps/worker/src/clip_factory/adapters/filesystem/local_source.py`
- Create: `apps/worker/src/clip_factory/adapters/http/source_locator_client_models.py`
- Create: `apps/worker/src/clip_factory/adapters/http/source_locator_client.py`
- Create: `apps/worker/src/clip_factory/adapters/source/local_source_validation_gateway.py`
- Create: `apps/worker/src/clip_factory/entrypoints/temporal/activities/source_activities.py`
- Test: `apps/worker/tests/domain/test_source.py`
- Test: `apps/worker/tests/application/test_validate_local_source.py`
- Test: `apps/worker/tests/adapters/filesystem/test_local_source.py`
- Test: `apps/worker/tests/adapters/http/test_source_locator_client.py`
- Test: `apps/worker/tests/adapters/source/test_local_source_validation_gateway.py`
- Test: `apps/worker/tests/entrypoints/temporal/activities/test_source_activities.py`
- Create: `apps/web/src/modules/projects/application/services/relink-source.service.ts`
- Create: `apps/web/src/modules/projects/delivery/http/dto/api/relink-source-api.dto.ts`
- Create: `apps/web/src/modules/projects/converters/api-entity/relink-source.converter.ts`
- Create: `apps/web/src/modules/projects/delivery/http/relink-source.controller.ts`
- Create: `apps/web/src/app/api/projects/[projectId]/source/relink/route.ts`
- Test: `apps/web/src/modules/projects/application/services/relink-source.service.test.ts`
- Test: `apps/web/src/modules/projects/converters/api-entity/relink-source.converter.test.ts`
- Test: `apps/web/src/modules/projects/delivery/http/relink-source.controller.test.ts`

## RED → GREEN → REFACTOR

- [ ] **RED: prove symlink escapes and non-files are rejected.**

```python
def test_resolve_rejects_symlink_that_escapes_allowed_root(tmp_path: Path) -> None:
    allowed = tmp_path / "allowed"
    outside = tmp_path / "outside.mov"
    allowed.mkdir()
    outside.write_bytes(b"outside")
    link = allowed / "escape.mov"
    link.symlink_to(outside)
    adapter = LocalSourceFilesystem((allowed,))
    with pytest.raises(SourceNotAllowedError, match="resolved path is outside allowed roots"):
        adapter.validate(link)
```

- [ ] Run `uv run --directory apps/worker pytest tests/adapters/filesystem/test_local_source.py -q`; expect import FAIL.

- [ ] **GREEN: create exact realpath and file checks.**

```python
@dataclass(frozen=True)
class _ValidatedLocalFile:
    display_path: str
    resolved_path: Path
    size_bytes: int
    modified_ns: int
    fingerprint: str


class LocalSourceFilesystem:
    def __init__(self, allowed_roots: Sequence[Path]) -> None:
        self._roots = tuple(root.expanduser().resolve(strict=True) for root in allowed_roots)

    def validate(self, path: Path) -> _ValidatedLocalFile:
        resolved = path.expanduser().resolve(strict=True)
        if not any(resolved.is_relative_to(root) for root in self._roots):
            raise SourceNotAllowedError("resolved path is outside allowed roots")
        stat = resolved.stat()
        if not resolved.is_file() or not os.access(resolved, os.R_OK):
            raise SourceUnreadableError("source must be a readable regular file")
        return _ValidatedLocalFile(str(path), resolved, stat.st_size, stat.st_mtime_ns, fingerprint(resolved, stat))
```

`LocalSourceValidationGateway.validate_and_persist(sourceAssetId)` calls `SourceLocatorClient.get(sourceAssetId)`, requires the internal `LOCAL_FILE` locator, passes its candidate path to `LocalSourceFilesystem`, and calls `SourceLocatorClient.apply_locator_validation(...)` with the raw resolved path/size/mtime/fingerprint over the authenticated no-body-log route. That update returns path-free health `LOCATED`; Task 11 owns the later media probe and `HEALTHY` transition. Unit tests serialize every application/Temporal result and assert `/Users/` is absent; HTTP fake tests assert the raw path appears only in the internal request body.

- [ ] Run the test; expect PASS. Add exact tests for absent file, directory, unreadable file, relative path, and allowed nested symlink; make relative paths fail with `SOURCE_NOT_ABSOLUTE`.

- [ ] **RED: specify the lightweight fingerprint.** A 300 KiB fixture with known first/middle/last 64 KiB samples must equal `sha256("size:mtimeNs:" + three sample digests joined by colon)` and changing a sampled byte must change the result.

- [ ] **GREEN: add this implementation.**

```python
SAMPLE_BYTES = 65_536

def fingerprint(path: Path, stat: os.stat_result) -> str:
    offsets = (0, max(0, stat.st_size // 2 - SAMPLE_BYTES // 2), max(0, stat.st_size - SAMPLE_BYTES))
    digests: list[str] = []
    with path.open("rb") as source:
        for offset in offsets:
            source.seek(offset)
            digests.append(hashlib.sha256(source.read(SAMPLE_BYTES)).hexdigest())
    material = f"{stat.st_size}:{stat.st_mtime_ns}:{':'.join(digests)}"
    return hashlib.sha256(material.encode("ascii")).hexdigest()
```

- [ ] Run fingerprint tests; expect PASS and verify source mode/mtime/bytes do not change.

- [ ] **RED: write relink policy test.** Same duration, video dimensions, audio presence, and codec family with a different fingerprint returns `confirmationRequired: true`; incompatible duration difference over 1000 ms or different dimensions throws `RELINK_INCOMPATIBLE`; identical fingerprint resumes without confirmation.

- [ ] **GREEN:** implement `RelinkSourceService.execute({projectId, candidate, confirmedFingerprint})` using `SourceAssetDataService`, a worker validation port, and a workflow signal port. It sets `RELINKING_SOURCE`, compares the exact probe fields, requires the candidate fingerprint as confirmation token when changed, persists the new reference, and signals `source_relinked`; it never invokes delete on either path.

- [ ] Run relink tests; expect PASS.

- [ ] **REFACTOR:** map `FileNotFoundError`, fingerprint mismatch, root violation, and compatibility failure to `SOURCE_MISSING`, `SOURCE_CHANGED`, `SOURCE_NOT_ALLOWED`, and typed API errors. Add converter tests for paths being absent from default log payloads.

## Verification and commit

```bash
uv run --directory apps/worker pytest tests/domain/test_source.py tests/adapters/filesystem/test_local_source.py -q
pnpm exec vitest run apps/web/src/modules/projects/application/services/relink-source.service.test.ts
pnpm test:architecture
git diff --check
```

Expected: source files are opened read-only, symlink escapes fail, and changed compatible sources require explicit fingerprint confirmation.

**Suggested commit:** `feat: secure local filepath sources and relinking`
