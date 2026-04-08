from typing import Annotated
from fastapi import APIRouter, Form, Request, WebSocket
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
import logging
import json
from uuid import uuid4

from app.schemas.room import CreateRoomForm, EnterRoomForm, Room, ValidateRoomRequest
from app.schemas.user import User


router = APIRouter()
templates = Jinja2Templates(directory="app/templates")
logger = logging.getLogger(__name__)

# In-memory storage for rooms and WebSocket connections
# Add pg or redis storage instead of In-memory.
rooms: dict[str, Room] = {}
room_connections: dict[str, dict[str, WebSocket]] = {}  # room_id -> {user_id: ws}


@router.get("/room", response_class=HTMLResponse)
async def get_room(request: Request):
    return templates.TemplateResponse(
        request=request, name="create_room.html", context={}
    )


@router.post("/room/create", response_class=RedirectResponse)
async def create_room(data: Annotated[CreateRoomForm, Form()]):
    new_room_id = uuid4().hex[:8]
    rooms[new_room_id] = Room(
        label=data.room_label,
        is_closed=data.is_closed,
        password=data.room_password,
        max_players=data.max_players,
        max_spies=data.max_spies,
    )
    logger.info(f"Room created: id={new_room_id} label={data.room_label}")
    return RedirectResponse(url=f"/room/{new_room_id}", status_code=303)


@router.get("/room/join", response_class=HTMLResponse)
async def get_join_room_page(request: Request):
    return templates.TemplateResponse(
        request=request, name="join_room.html", context={}
    )


@router.get("/room/{room_id}/status", response_class=JSONResponse)
async def get_room_status(request: Request, room_id: str):
    if room_id not in rooms:
        return templates.TemplateResponse(
            request=request, name="404.html", context={}, status_code=404
        )
    return rooms[room_id].model_dump(include={"is_closed"})


@router.post("/room/{room_id}/validate", response_class=JSONResponse)
async def validate_room(data: ValidateRoomRequest, request: Request, room_id: str):
    if room_id not in rooms:
        return templates.TemplateResponse(
            request=request, name="404.html", context={}, status_code=404
        )
    room = rooms[room_id]
    return {"is_valid": data.room_password == room.password}


@router.get("/room/{room_id}", response_class=HTMLResponse)
async def get_room_page(request: Request, room_id: str):
    if room_id not in rooms:
        return templates.TemplateResponse(
            request=request, name="404.html", context={}, status_code=404
        )
    room_data = rooms[room_id]
    # Generate a temporary user ID for the template context
    # The actual user ID will be generated when WebSocket connects
    return templates.TemplateResponse(
        request=request,
        name="room.html",
        context={
            "room_id": room_id,
            "room_label": room_data.label,
            "host_user_id": room_data.host_user_id,
        },
    )


@router.post("/room/{room_id}", response_class=RedirectResponse)
async def try_to_join_room(data: Annotated[EnterRoomForm, Form()], room_id: str):
    redirect = RedirectResponse(url=f"/room/{room_id}", status_code=303)
    room = rooms[room_id]
    if data.room_password != room.password:
        redirect = RedirectResponse(url="/room/join", status_code=303)
    return redirect


@router.websocket("/ws/room/{room_id}")
async def room_websocket(websocket: WebSocket, room_id: str):
    if room_id not in rooms:
        await websocket.close(code=1000)
        return

    await websocket.accept()
    user_id = str(uuid4())
    user_name = f"Player {len(rooms[room_id].users) + 1}"
    rooms[room_id].users[user_id] = User(name=user_name)
    room_connections.setdefault(room_id, {})[user_id] = websocket

    # Set host if this is the first user
    if len(rooms[room_id].users) == 1:
        rooms[room_id].host_user_id = user_id

    # Send current user ID to the newly connected user
    await websocket.send_text(json.dumps({"user_id": user_id, "host_user_id": rooms[room_id].host_user_id}))

    # Send initial users list to all users in the room
    await send_users_list_to_all(room_id)

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            if message.get("action") == "set_ready":
                user = rooms[room_id].users[user_id]
                user.ready = message["ready"]
                await send_users_list_to_all(room_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        # Disconnect
        if room_id in rooms and user_id in rooms[room_id].users:
            del rooms[room_id].users[user_id]
        if room_id in room_connections and user_id in room_connections[room_id]:
            del room_connections[room_id][user_id]
        await send_users_list_to_all(room_id)


async def send_users_list_to_all(room_id: str):
    if room_id not in rooms:
        return
    users = [
        {"id": uid, "name": user.name, "ready": user.ready}
        for uid, user in rooms[room_id].users.items()
    ]
    message = json.dumps({
        "users": users,
        "host_user_id": rooms[room_id].host_user_id,
    })
    for ws in room_connections.get(room_id, {}).values():
        try:
            await ws.send_text(message)
        except Exception:
            pass  # Handle disconnected users
