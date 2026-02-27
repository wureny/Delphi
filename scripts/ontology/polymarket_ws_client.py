#!/usr/bin/env python3
from __future__ import annotations

import base64
import hashlib
import os
import socket
import ssl
import struct
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse


@dataclass(frozen=True)
class WebSocketConfig:
    timeout_seconds: float = 15.0
    max_frame_size: int = 2_000_000


class MinimalWebSocketClient:
    def __init__(self, url: str, config: WebSocketConfig | None = None) -> None:
        self.url = url
        self.config = config or WebSocketConfig()
        self._socket: socket.socket | ssl.SSLSocket | None = None
        self._connected = False

    def connect(self) -> None:
        parsed = urlparse(self.url)
        if parsed.scheme not in {"ws", "wss"}:
            raise ValueError(f"unsupported websocket scheme: {parsed.scheme}")
        host = parsed.hostname or ""
        port = parsed.port or (443 if parsed.scheme == "wss" else 80)
        path = parsed.path or "/"
        if parsed.query:
            path = f"{path}?{parsed.query}"
        raw_socket = socket.create_connection((host, port), timeout=self.config.timeout_seconds)
        raw_socket.settimeout(self.config.timeout_seconds)
        if parsed.scheme == "wss":
            context = ssl.create_default_context()
            ws_socket = context.wrap_socket(raw_socket, server_hostname=host)
        else:
            ws_socket = raw_socket
        key = base64.b64encode(os.urandom(16)).decode("ascii")
        headers = [
            f"GET {path} HTTP/1.1",
            f"Host: {host}:{port}",
            "Upgrade: websocket",
            "Connection: Upgrade",
            f"Sec-WebSocket-Key: {key}",
            "Sec-WebSocket-Version: 13",
            "User-Agent: DelphiOntology/0.1",
            "",
            "",
        ]
        ws_socket.sendall("\r\n".join(headers).encode("ascii"))
        response = self._read_http_headers(ws_socket)
        if " 101 " not in response.splitlines()[0]:
            raise RuntimeError(f"websocket handshake failed: {response.splitlines()[0]}")
        accept_key = self._header_value(response, "Sec-WebSocket-Accept")
        expected = base64.b64encode(hashlib.sha1((key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode("ascii")).digest()).decode("ascii")
        if accept_key != expected:
            raise RuntimeError("invalid websocket accept key")
        self._socket = ws_socket
        self._connected = True

    def close(self) -> None:
        if self._socket is None:
            return
        try:
            self._send_frame(0x8, b"")
        except Exception:
            pass
        try:
            self._socket.close()
        finally:
            self._connected = False
            self._socket = None

    def send_json(self, payload: Any) -> None:
        import json

        self.send_text(json.dumps(payload))

    def send_text(self, payload: str) -> None:
        self._send_frame(0x1, payload.encode("utf-8"))

    def recv_text(self) -> str:
        while True:
            opcode, payload = self._recv_frame()
            if opcode == 0x1:
                return payload.decode("utf-8")
            if opcode == 0x8:
                raise EOFError("websocket closed by remote peer")
            if opcode == 0x9:
                self._send_frame(0xA, payload)
                continue
            if opcode == 0xA:
                continue
            raise RuntimeError(f"unsupported websocket opcode: {opcode}")

    def _send_frame(self, opcode: int, payload: bytes) -> None:
        if self._socket is None or not self._connected:
            raise RuntimeError("websocket is not connected")
        if len(payload) > self.config.max_frame_size:
            raise ValueError("payload too large")
        fin_and_opcode = 0x80 | opcode
        mask_bit = 0x80
        length = len(payload)
        header = bytearray([fin_and_opcode])
        if length < 126:
            header.append(mask_bit | length)
        elif length < (1 << 16):
            header.append(mask_bit | 126)
            header.extend(struct.pack("!H", length))
        else:
            header.append(mask_bit | 127)
            header.extend(struct.pack("!Q", length))
        mask = os.urandom(4)
        header.extend(mask)
        masked_payload = bytes(byte ^ mask[index % 4] for index, byte in enumerate(payload))
        self._socket.sendall(bytes(header) + masked_payload)

    def _recv_frame(self) -> tuple[int, bytes]:
        if self._socket is None or not self._connected:
            raise RuntimeError("websocket is not connected")
        header = self._recv_exact(2)
        first, second = header[0], header[1]
        fin = (first >> 7) & 1
        opcode = first & 0x0F
        masked = (second >> 7) & 1
        length = second & 0x7F
        if length == 126:
            length = struct.unpack("!H", self._recv_exact(2))[0]
        elif length == 127:
            length = struct.unpack("!Q", self._recv_exact(8))[0]
        if length > self.config.max_frame_size:
            raise RuntimeError("received websocket frame exceeds limit")
        mask_key = self._recv_exact(4) if masked else b""
        payload = self._recv_exact(length) if length else b""
        if masked:
            payload = bytes(byte ^ mask_key[index % 4] for index, byte in enumerate(payload))
        if not fin:
            raise RuntimeError("fragmented websocket frames are not supported")
        return opcode, payload

    def _recv_exact(self, size: int) -> bytes:
        if self._socket is None:
            raise RuntimeError("websocket is not connected")
        chunks = []
        remaining = size
        while remaining > 0:
            chunk = self._socket.recv(remaining)
            if not chunk:
                raise EOFError("unexpected websocket EOF")
            chunks.append(chunk)
            remaining -= len(chunk)
        return b"".join(chunks)

    def _read_http_headers(self, ws_socket: socket.socket | ssl.SSLSocket) -> str:
        data = b""
        while b"\r\n\r\n" not in data:
            chunk = ws_socket.recv(4096)
            if not chunk:
                raise EOFError("unexpected EOF while reading websocket handshake")
            data += chunk
        head, _sep, _rest = data.partition(b"\r\n\r\n")
        return head.decode("utf-8", errors="replace")

    def _header_value(self, headers: str, name: str) -> str:
        prefix = f"{name}:"
        for line in headers.splitlines()[1:]:
            if line.lower().startswith(prefix.lower()):
                return line.split(":", 1)[1].strip()
        return ""
