"""Compatibility entrypoint for the current daily/strategy browser acceptance.

The old delivery-date proposal and year-only slider were replaced by the
continuous model-time viewer. Keep existing automation commands working.
"""
import asyncio
from strategy_smoke import main

if __name__ == '__main__':
    asyncio.run(main())
