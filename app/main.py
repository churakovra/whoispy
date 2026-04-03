import asyncio

from fastapi import FastAPI
from handlers import routers


async def main():
    app = FastAPI()
    for router in routers:
        app.include_router(router)


if __name__ == "__main__":
    asyncio.run(main())
