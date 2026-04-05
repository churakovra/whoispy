from pydantic import BaseModel, Field
from app.schemas.user import User


class CreateRoomForm(BaseModel):
    room_label: str
    is_closed: bool
    room_password: str | None
    max_players: int
    max_spies: int


class Room(BaseModel):
    label: str
    is_closed: bool
    password: str | None
    max_players: int
    max_spies: int
    users: dict[str, User] = Field(default_factory=dict)
