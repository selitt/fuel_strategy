from fastapi import APIRouter

router = APIRouter(prefix="/hello", tags=["hello"])


@router.get("")
async def get_hello():
    return {"message": "Hello, World!"}


@router.get("/{name}")
async def get_hello_with_name(name: str):
    return {"message": f"Hello, {name}!"}
