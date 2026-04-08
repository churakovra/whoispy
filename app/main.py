import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.handlers import routers

if os.getenv("DEBUG") == "1":
    import debugpy
    debugpy.listen(("0.0.0.0", 5678))
    print("Debugpy listening on 0.0.0.0:5678")

app = FastAPI()
app.mount("/static", StaticFiles(directory="app/static"), name="static")

for router in routers:
    app.include_router(router)
