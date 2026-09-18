from fastapi import FastAPI
import uvicorn

try:
    from .HelloController import router
except ImportError:
    from HelloController import router

app = FastAPI(title="My Backend App")

app.include_router(router)

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
