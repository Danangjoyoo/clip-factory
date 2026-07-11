# Fake-Mode Local Integration Gate

## Goal

Provide one deterministic command that exercises the local Clip Factory stack with the supplied sample video while refusing live OpenAI mode.

## Design

`./scripts/integration-test.js` is a Node CLI with no new runtime dependency. It validates the sample file, confirms `OPENAI_ADAPTER=fake`, checks Compose service health, calls the existing local HTTP routes, and records a compact pass/fail report. The script exits non-zero on any failed invariant.

The gate is intentionally fake-mode only. It does not accept or forward an OpenAI API key and exits with an actionable error if `OPENAI_ADAPTER=live` is requested.

## Assertions

- Sample path exists, is a regular readable file, and has a non-zero size.
- PostgreSQL, Redis, MinIO, and Temporal endpoints are reachable.
- Manual clip creation accepts the supplied source and explicit time range.
- Fake-mode project submission returns a tracked project/job identity.
- Progress reaches a terminal state without a live provider call.
- Every produced clip has safe metadata: model mode, cost, duration, and artifact locator.
- The report contains no API key, absolute source path, or transcript body.

## Testing

The runner has unit tests for argument parsing, live-mode rejection, path validation, redaction, and terminal-state handling. The command itself is the green gate and may be run against the local Compose stack with the sample path.
