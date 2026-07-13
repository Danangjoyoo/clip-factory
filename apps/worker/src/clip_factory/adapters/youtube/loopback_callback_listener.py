import asyncio
from dataclasses import dataclass
import socket
from urllib.parse import parse_qs, urlsplit


@dataclass(frozen=True, slots=True)
class LoopbackOAuthCallback:
    code: str
    state: str


class OAuthConsentDeniedError(RuntimeError):
    pass


class LoopbackCallbackListener:
    def __init__(self, timeout_seconds: float = 600) -> None:
        self._timeout_seconds = timeout_seconds
        self._server: asyncio.AbstractServer | None = None
        self._callback_uri: str | None = None
        self._result: asyncio.Future[LoopbackOAuthCallback] | None = None

    async def start(self) -> str:
        if self._server is not None:
            raise RuntimeError("OAuth callback listener already started")
        loop = asyncio.get_running_loop()
        self._result = loop.create_future()
        self._server = await asyncio.start_server(
            self._handle_client,
            host="127.0.0.1",
            port=0,
            family=socket.AF_INET,
            limit=8192,
        )
        socket_info = self._server.sockets[0].getsockname()
        port = int(socket_info[1])
        self._callback_uri = f"http://127.0.0.1:{port}/oauth2/callback"
        return self._callback_uri

    async def wait_for_callback(self) -> LoopbackOAuthCallback:
        if self._result is None:
            raise RuntimeError("OAuth callback listener is not started")
        try:
            return await asyncio.wait_for(self._result, timeout=self._timeout_seconds)
        except TimeoutError as error:
            raise TimeoutError("OAuth callback timed out") from error
        finally:
            await self._close()

    async def _handle_client(
        self,
        reader: asyncio.StreamReader,
        writer: asyncio.StreamWriter,
    ) -> None:
        try:
            request_line = await reader.readline()
            if len(request_line) > 8192:
                await self._respond(writer, 414, "Request too large")
                return
            try:
                method, target, _version = request_line.decode("ascii").strip().split(
                    " ", 2
                )
            except ValueError:
                await self._respond(writer, 400, "Bad request")
                return
            headers = await self._read_headers(reader)
            parsed = urlsplit(target)
            if self._callback_uri is None:
                await self._respond(writer, 400, "Bad request")
                return
            expected_host = self._callback_uri.removeprefix("http://").split("/")[0]
            if method != "GET" or headers.get("host") != expected_host:
                await self._respond(writer, 400, "Bad request")
                return
            if parsed.path != "/oauth2/callback":
                await self._respond(writer, 404, "Not found")
                return
            if self._result is None or self._result.done():
                await self._respond(writer, 409, "OAuth callback already received")
                return

            query = parse_qs(parsed.query, keep_blank_values=True)
            state = query.get("state", [""])[0]
            if "error" in query:
                self._result.set_exception(OAuthConsentDeniedError("OAuth denied"))
                await self._respond(writer, 200, "Authorization denied. You may return to Clip Factory.")
                return
            code = query.get("code", [""])[0]
            if not code or not state:
                await self._respond(writer, 400, "Bad request")
                return
            self._result.set_result(LoopbackOAuthCallback(code=code, state=state))
            await self._respond(
                writer,
                200,
                "Authorization received. You may return to Clip Factory.",
            )
        finally:
            writer.close()
            await writer.wait_closed()

    async def _read_headers(self, reader: asyncio.StreamReader) -> dict[str, str]:
        headers: dict[str, str] = {}
        while True:
            line = await reader.readline()
            if line in {b"\r\n", b"\n", b""}:
                return headers
            if b":" not in line:
                continue
            name, value = line.decode("ascii", errors="ignore").split(":", 1)
            headers[name.strip().lower()] = value.strip()

    async def _respond(
        self,
        writer: asyncio.StreamWriter,
        status: int,
        body: str,
    ) -> None:
        status_text = {
            200: "OK",
            400: "Bad Request",
            404: "Not Found",
            409: "Conflict",
            414: "URI Too Long",
        }[status]
        encoded = body.encode("utf-8")
        writer.write(
            (
                f"HTTP/1.1 {status} {status_text}\r\n"
                "Content-Type: text/html; charset=utf-8\r\n"
                f"Content-Length: {len(encoded)}\r\n"
                "Connection: close\r\n\r\n"
            ).encode("ascii")
            + encoded
        )
        await writer.drain()

    async def _close(self) -> None:
        if self._server is None:
            return
        self._server.close()
        await self._server.wait_closed()
        self._server = None
