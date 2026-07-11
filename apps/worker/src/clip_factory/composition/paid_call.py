"""Small durable local paid-call store used by the worker composition."""

import json
import sqlite3
from pathlib import Path
from typing import Any

from clip_factory.ports.cost_reservation import CostReservation


class LocalPaidCallDependencies:
    """SQLite-backed state; a file path is required for non-test durability."""

    def __init__(self, path: str | Path | None = None) -> None:
        path = path or ".clip-factory-paid-calls.sqlite3"
        self._db = sqlite3.connect(str(path))
        self._db.executescript(
            """
            CREATE TABLE IF NOT EXISTS reservations (
              call_id TEXT PRIMARY KEY, request_hash TEXT NOT NULL,
              project_id TEXT NOT NULL, analysis_run_id TEXT NOT NULL,
              worst_case_microusd INTEGER NOT NULL, status TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS artifacts (key TEXT PRIMARY KEY, value TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS callbacks (
              call_id TEXT NOT NULL, request_hash TEXT NOT NULL,
              value TEXT NOT NULL, PRIMARY KEY (call_id, request_hash)
            );
            """
        )
        self._db.commit()

    async def reserve(self, request: Any) -> CostReservation:
        row = self._db.execute(
            "SELECT request_hash, project_id, analysis_run_id, worst_case_microusd, status FROM reservations WHERE call_id = ?",
            (request.call_id,),
        ).fetchone()
        if row:
            if tuple(row[:4]) != (
                request.request_hash,
                request.project_id,
                request.analysis_run_id,
                request.worst_case_microusd,
            ):
                raise RuntimeError("PAID_CALL_CONFLICT")
            return CostReservation(request.call_id, request, row[4])
        self._db.execute(
            "INSERT INTO reservations VALUES (?, ?, ?, ?, ?, 'RESERVED')",
            (
                request.call_id,
                request.request_hash,
                request.project_id,
                request.analysis_run_id,
                request.worst_case_microusd,
            ),
        )
        self._db.commit()
        return CostReservation(request.call_id, request, "RESERVED")

    async def mark_sent(self, call_id: str, request_hash: str) -> None:
        row = self._db.execute(
            "SELECT request_hash FROM reservations WHERE call_id = ?", (call_id,)
        ).fetchone()
        if not row or row[0] != request_hash:
            raise RuntimeError("PAID_CALL_RESERVATION_MISMATCH")
        self._db.execute(
            "UPDATE reservations SET status = 'SENT' WHERE call_id = ?", (call_id,)
        )
        self._db.commit()

    async def put_json(self, key: str, value: dict[str, object]) -> object:
        self._db.execute(
            "INSERT OR REPLACE INTO artifacts VALUES (?, ?)",
            (key, json.dumps(value, sort_keys=True)),
        )
        self._db.commit()
        return key

    async def reconcile(self, call_id: str, request_hash: str) -> object | None:
        row = self._db.execute(
            "SELECT value FROM callbacks WHERE call_id = ? AND request_hash = ?",
            (call_id, request_hash),
        ).fetchone()
        return json.loads(row[0]) if row else None

    async def head_json(self, key: str) -> bool:
        return (
            self._db.execute("SELECT 1 FROM artifacts WHERE key = ?", (key,)).fetchone()
            is not None
        )

    async def get_json(self, key: str) -> object:
        row = self._db.execute(
            "SELECT value FROM artifacts WHERE key = ?", (key,)
        ).fetchone()
        if row is None:
            raise KeyError(key)
        return json.loads(row[0])

    async def record_paid_call(self, value: dict[str, object]) -> None:
        call_id, request_hash = str(value["callId"]), str(value["requestHash"])
        artifact_key = str(value.get("artifactKey", ""))
        self._db.execute("BEGIN IMMEDIATE")
        row = self._db.execute(
            "SELECT request_hash, status FROM reservations WHERE call_id = ?",
            (call_id,),
        ).fetchone()
        if not row or row[0] != request_hash or row[1] != "SENT":
            self._db.rollback()
            raise RuntimeError("PAID_CALL_COMPLETION_MISMATCH")
        if (
            artifact_key
            and self._db.execute(
                "SELECT 1 FROM artifacts WHERE key = ?", (artifact_key,)
            ).fetchone()
            is None
        ):
            self._db.rollback()
            raise RuntimeError("PAID_CALL_ARTIFACT_MISSING")
        self._db.execute(
            "INSERT OR IGNORE INTO callbacks VALUES (?, ?, ?)",
            (call_id, request_hash, json.dumps(value, sort_keys=True)),
        )
        self._db.execute(
            "UPDATE reservations SET status = 'COMPLETED' WHERE call_id = ?", (call_id,)
        )
        self._db.commit()
