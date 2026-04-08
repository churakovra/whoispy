from pydantic import BaseModel, Field


class User(BaseModel):
    name: str
    ready: bool = Field(default=False)
