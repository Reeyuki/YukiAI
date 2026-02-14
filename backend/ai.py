"""This module handles AI chat requests"""

import json
import logging
import time
import uuid
from typing import AsyncGenerator

import langid
from fastapi import HTTPException

from chat import chat_storage_manager
from ollama import ask_ollama_stream
from speech import process_audio_file_common, save_speak_file


def process_audio_file(file):
    """
    Process the audio file synchronously.
    """
    return process_audio_file_common(file, is_async=False)


async def process_audio_file_async(file):
    """
    Process the audio file asynchronously.
    """
    return await process_audio_file_common(file, is_async=True)


async def process_audio_file_with_language(file, language=None):
    user_input = await process_audio_file_common(file)
    if language:
        return process_audio_file_common(user_input, language=language)
    return user_input


async def extract_user_input_async(file, text):
    """
    Asynchronously extract user input from either an audio file or text input.
    """
    if file:
        return await process_audio_file_async(file)
    elif text:
        return text.strip()
    else:
        raise HTTPException(
            status_code=400, detail="Either an audio file or text input is required."
        )


def detect_language(text: str) -> str:
    """
    Detect the language of the given text using langid.
    Returns the language code (e.g., 'en', 'fr', etc.).
    """
    return langid.classify(text)[0]


async def extract_content_from_chunk(chunk) -> str:
    if isinstance(chunk, dict):
        return chunk.get("message", {}).get("content") or ""
    if isinstance(chunk, str):
        return chunk
    return ""


async def stream_llm_response(model, chat_history) -> AsyncGenerator[str, None]:
    async for chunk in ask_ollama_stream(model, chat_history):
        content = await extract_content_from_chunk(chunk)
        if content:
            yield content


async def generate_audio_file(
    response_text: str, language: str | None, request_id: str
) -> str:
    lang = language or detect_language(response_text)
    await save_speak_file(response_text, lang, request_id)
    return f"/static/audio/audio-{request_id}.mp3"


def persist_chat_history(
    session_id, channel_id, chat_history, response_text, audio_url
):
    chat_history.append(
        {
            "role": "ai",
            "content": response_text,
            "audio_url": audio_url,
        }
    )
    chat_storage_manager.save_chat_history(session_id, channel_id, chat_history)


async def response_stream_generator(
    channel,
    channel_id,
    session_id,
    user_input,
    is_file_uploaded,
    chat_history,
    model,
    language=None,
) -> AsyncGenerator[str, None]:
    audio_request_id = str(uuid.uuid4())
    start_marker = "$[[START_JSON]]"
    end_marker = "$[[END_JSON]]"
    audio_marker = "$[[AUDIO_DONE]]"

    start_payload = {
        "channel_name": getattr(channel, "channel_name", None),
        "channel_id": channel_id,
    }

    if is_file_uploaded:
        start_payload["resolved_text"] = user_input

    yield f"{start_marker}{json.dumps(start_payload)}{end_marker}\n\n"

    accumulated_chunks: list[str] = []
    start_time = time.time()

    logging.info(
        "Sending request to LLM with input: %s history: %s",
        user_input,
        chat_history,
    )

    try:
        async for content in stream_llm_response(model, chat_history):
            accumulated_chunks.append(content)
            yield content
    except Exception:
        logging.exception("Error during LLM streaming")
        return

    response_text = "".join(accumulated_chunks).strip()

    if not response_text:
        logging.error("No response received from LLM.")
        return

    audio_url = ""

    try:
        audio_url = await generate_audio_file(response_text, language, audio_request_id)
        audio_payload = json.dumps(
            {
                "audio_url": audio_url,
                "channel_id": channel_id,
            }
        )
        yield f"\n{audio_marker}{audio_payload}{audio_marker}"
    except Exception:
        logging.exception("Audio generation failed")

    persist_chat_history(
        session_id,
        channel_id,
        chat_history,
        response_text,
        audio_url,
    )

    logging.info(
        "Completed response pipeline for channel %s in %.2f seconds",
        channel_id,
        time.time() - start_time,
    )
