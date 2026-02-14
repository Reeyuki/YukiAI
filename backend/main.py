"""
This module implements a FastAPI-based server for handling chat interactions,
managing chat history, and generating audio responses using AI models.
"""

import logging
import os
import sys
import time
import uuid
from pathlib import Path
from typing import Optional

import uvicorn
from fastapi import Cookie, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from ai import (
    extract_user_input_async,
    process_audio_file_with_language,
    response_stream_generator,
)
from chat import chat_storage_manager
from config import SYSTEM_MESSAGE
from ollama import does_model_exist, ollama_models

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler("server.log"), logging.StreamHandler(sys.stdout)],
)

os.makedirs("static/audio", exist_ok=True)
os.makedirs("frontend/dist", exist_ok=True)


BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"
BACKEND_STATIC_DIR = BASE_DIR / "backend" / "static"
FRONTEND_STATIC_DIR = BASE_DIR / "frontend" / "static"
DIST_DIR = BASE_DIR / "frontend" / "dist"
ASSETS_DIR = BASE_DIR / "frontend" / "assets"


os.makedirs(BACKEND_STATIC_DIR, exist_ok=True)
os.makedirs(FRONTEND_STATIC_DIR, exist_ok=True)
os.makedirs(DIST_DIR, exist_ok=True)
os.makedirs(ASSETS_DIR, exist_ok=True)


class FallbackStaticFiles(StaticFiles):
    def __init__(self, primary_dir, fallback_dir, **kwargs):
        super().__init__(directory=primary_dir, **kwargs)
        self.fallback_dir = fallback_dir

    async def get_response(self, path, scope):
        response = await super().get_response(path, scope)
        if response.status_code == 404:
            fallback_file = self.fallback_dir / path
            if fallback_file.exists() and fallback_file.is_file():
                from fastapi.responses import FileResponse

                return FileResponse(fallback_file)
        return response


app = FastAPI()

app.mount(
    "/static",
    FallbackStaticFiles(BACKEND_STATIC_DIR, FRONTEND_STATIC_DIR),
    name="static",
)
app.mount("/dist", StaticFiles(directory=DIST_DIR), name="dist")
app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")


@app.post("/api/chat/")
async def chat_llm_api(
    session_id: Optional[str] = Cookie(default=None),
    channel_id: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None),
    model: Optional[str] = Form(None),
    language: Optional[str] = Form(None),
    system_message: Optional[str] = Form(None),
):
    """Handles chat requests and manages chat history."""
    if channel_id and not chat_storage_manager.does_channel_exist(
        session_id, channel_id
    ):
        logging.error(
            "Channel %s does not exist for session %s.", channel_id, session_id
        )
        raise HTTPException(status_code=404, detail="Channel does not exist.")
    if not model:
        raise HTTPException(status_code=400, detail="Model parameter missing")
    if not does_model_exist(model):
        raise HTTPException(status_code=404, detail="Model does not exist")

    is_channel_created = False
    step_start_time = time.time()
    is_file_uploaded = file is not None and not text

    if is_file_uploaded:
        user_input = await process_audio_file_with_language(file, language)
    else:
        user_input = await extract_user_input_async(file, text)

    logging.info("Input reached: %s", user_input)
    if not user_input:
        logging.warning("Failed to extract user input for session %s.", session_id)
        raise HTTPException(
            status_code=400,
            detail="Could not extract any user input from audio or text.",
        )
    channel = None

    if not channel_id:
        channel_id = str(uuid.uuid4())
        is_channel_created = True
        channel = chat_storage_manager.create_channel(session_id, channel_id, text)

    step_start_time = time.time()
    chat_history = chat_storage_manager.load_chat_history(session_id, channel_id, True)

    logging.info(
        "Loaded chat history for channel %s. Time taken: %.2f seconds",
        channel_id,
        time.time() - step_start_time,
    )

    if not chat_history or chat_history[0].get("role") != "system":
        chat_history.insert(0, {"role": "system", "content": SYSTEM_MESSAGE})

    chat_history.append({"role": "user", "content": user_input})

    chat_history = chat_history[::-1] if not is_channel_created else chat_history
    return StreamingResponse(
        response_stream_generator(
            channel,
            channel_id,
            session_id,
            user_input,
            is_file_uploaded,
            chat_history,
            model,
            language,
        ),
        media_type="text/plain",
    )


@app.get("/api/history/{channel_id}")
async def get_history(
    channel_id: str, session_id: Optional[str] = Cookie(default=None)
):
    """Get chat history for a given channel ID."""
    if not session_id:
        logging.error("Session ID is missing in request to get history.")
        raise HTTPException(status_code=400, detail="Session id missing")
    if not channel_id:
        logging.error("Channel ID is missing in request to get history.")
        raise HTTPException(status_code=400, detail="Channel id missing")
    chat_history = chat_storage_manager.load_chat_history(session_id, channel_id)
    logging.info("Retrieved history for channel %s.", channel_id)
    return {"history": chat_history}


@app.delete("/api/history/{channel_id}/")
async def delete_history(
    channel_id: str,
    session_id: Optional[str] = Cookie(default=None),
):
    """Delete chat history for a given channel ID."""
    if not session_id:
        logging.error("Session ID is missing in request to delete history.")
        raise HTTPException(status_code=400, detail="Session id missing")
    chat_storage_manager.delete_channel(session_id, channel_id)
    logging.info("Deleted history for channel %s.", channel_id)
    return {"success": "true", "message": "History deleted successfully."}


@app.delete("/api/history/delete-all")
async def delete_all_history(session_id: Optional[str] = Cookie(default=None)):
    """Delete all chat history for a given session ID."""
    if not session_id:
        logging.error("Session ID is missing in request to delete all history.")
        raise HTTPException(status_code=400, detail="Session id missing")
    chat_storage_manager.delete_all_channels(session_id)
    logging.info("Deleted all history for session %s.", session_id)
    return {"success": "true", "message": "History deleted successfully."}


@app.get("/api/data")
async def get_init_data(session_id: Optional[str] = Cookie(default=None)):
    user_id = session_id
    channels = chat_storage_manager.get_channels(user_id)
    models = ollama_models if ollama_models is not None else []
    return {"channels": channels, "models": models}


@app.middleware("http")
async def add_session_id(request, call_next):
    """Middleware to add a session ID to the request if it doesn't exist."""
    session_id = request.cookies.get("session_id")
    if not session_id:
        session_id = str(uuid.uuid4())
    response = await call_next(request)
    if not request.cookies.get("session_id"):
        response.set_cookie("session_id", session_id)
    return response


@app.get("/", response_class=HTMLResponse)
async def get_index():
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/c/{id}", response_class=HTMLResponse)
async def get_index_chat(id: str):
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/favicon.ico", include_in_schema=False)
async def get_favicon():
    """Serve the favicon."""
    from io import BytesIO

    with open(os.path.join("favicon.ico"), "rb") as f:
        favicon_content = f.read()
    return StreamingResponse(BytesIO(favicon_content), media_type="image/x-icon")


if __name__ == "__main__":
    logging.info("Starting FastAPI server...")

    uvicorn.run(app, host="0.0.0.0", port=8010)
