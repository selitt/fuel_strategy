"""Compatibility entrypoint for the current compact desktop browser acceptance."""
import asyncio
from compact_workspace_smoke import main
if __name__ == '__main__':
    asyncio.run(main())
