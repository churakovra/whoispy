from .room import router as room_router
from .root import router as root_router

routers = [
    root_router,
    room_router,
]

__all__ = ["root_router"]
