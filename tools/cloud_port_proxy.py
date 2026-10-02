#!/usr/bin/env python3
"""Expose a user-owned TCP listener for GigaIDE Cloud port publishing."""

import argparse
import asyncio
from contextlib import suppress


async def _relay(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
    try:
        while data := await reader.read(65536):
            writer.write(data)
            await writer.drain()
    except (ConnectionError, asyncio.CancelledError):
        pass
    finally:
        writer.close()
        with suppress(ConnectionError):
            await writer.wait_closed()


async def _handle(
    client_reader: asyncio.StreamReader,
    client_writer: asyncio.StreamWriter,
    target_host: str,
    target_port: int,
) -> None:
    try:
        server_reader, server_writer = await asyncio.open_connection(
            target_host, target_port
        )
    except OSError:
        client_writer.close()
        with suppress(ConnectionError):
            await client_writer.wait_closed()
        return
    await asyncio.gather(
        _relay(client_reader, server_writer),
        _relay(server_reader, client_writer),
    )


async def start_proxy(
    listen_host: str,
    listen_port: int,
    target_host: str,
    target_port: int,
) -> asyncio.Server:
    return await asyncio.start_server(
        lambda reader, writer: _handle(
            reader, writer, target_host, target_port
        ),
        listen_host,
        listen_port,
    )


async def _run(args: argparse.Namespace) -> None:
    server = await start_proxy(
        args.listen_host,
        args.listen_port,
        args.target_host,
        args.target_port,
    )
    print(
        f"Cloud port proxy ready on {args.listen_host}:{args.listen_port} "
        f"-> {args.target_host}:{args.target_port}",
        flush=True,
    )
    async with server:
        await server.serve_forever()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--listen-host", default="0.0.0.0")
    parser.add_argument("--listen-port", type=int, default=8081)
    parser.add_argument("--target-host", default="127.0.0.1")
    parser.add_argument("--target-port", type=int, default=8080)
    asyncio.run(_run(parser.parse_args()))


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
