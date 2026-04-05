from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates


router = APIRouter()
templates = Jinja2Templates(directory="app/templates")

@router.get("/room", response_class=HTMLResponse)
async def get_room(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="create_room.html",
        context={}
    )
