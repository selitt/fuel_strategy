from fastapi import FastAPI
import uvicorn

try:
    from .HelloController import router as hello_router
    from .calc_controller import router as calc_router
except (ImportError, ValueError):
    from src.app.api.HelloController import router as hello_router
    from src.app.api.calc_controller import router as calc_router

app = FastAPI(
    title="Топливный космоконтур 2035 — REST API",
    description="API расчёта и управления",
    version="1.0.0",
)

app.include_router(hello_router)
app.include_router(calc_router)

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
