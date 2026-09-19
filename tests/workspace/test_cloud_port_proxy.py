import asyncio


def test_cloud_port_proxy_relays_bytes_between_client_and_target():
    from tools.cloud_port_proxy import start_proxy

    async def exercise():
        async def echo(reader, writer):
            writer.write(await reader.readexactly(4))
            await writer.drain()
            writer.close()
            await writer.wait_closed()

        target = await asyncio.start_server(echo, "127.0.0.1", 0)
        target_port = target.sockets[0].getsockname()[1]
        proxy = await start_proxy("127.0.0.1", 0, "127.0.0.1", target_port)
        proxy_port = proxy.sockets[0].getsockname()[1]
        try:
            reader, writer = await asyncio.open_connection("127.0.0.1", proxy_port)
            writer.write(b"ping")
            await writer.drain()
            assert await reader.readexactly(4) == b"ping"
            writer.close()
            await writer.wait_closed()
        finally:
            proxy.close()
            target.close()
            await proxy.wait_closed()
            await target.wait_closed()

    asyncio.run(exercise())
