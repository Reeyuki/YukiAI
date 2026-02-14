import logging
import os
import subprocess
import uuid
from tempfile import gettempdir

import edge_tts
import regex
import speech_recognition as sr
from fastapi import HTTPException


def clean_text_for_tts(text: str) -> str:
    text = text.strip()
    cleaned = regex.sub(r"[^\p{L}\d\s,.!?'-]", "", text)
    return cleaned


async def save_speak_file(text: str, lang: str = "en", request_id: str = None):
    voice_map = {
        "en": "en-US-AriaNeural",
        "fr": "fr-FR-DeniseNeural",
        "de": "de-DE-KatjaNeural",
        "es": "es-ES-ElviraNeural",
        "it": "it-IT-ElsaNeural",
        "pt": "pt-PT-FernandaNeural",
        "ru": "ru-RU-DariyaNeural",
        "zh": "zh-CN-XiaoxiaoNeural",
        "ja": "ja-JP-NanamiNeural",
        "ko": "ko-KR-SunHiNeural",
        "tr": "tr-TR-EmelNeural",
    }
    voice = voice_map.get(lang, "en-US-AriaNeural")
    output_file_path = os.path.join("static", "audio", f"audio-{request_id}.mp3")

    cleaned_text = clean_text_for_tts(text)

    if not cleaned_text or len(cleaned_text.strip()) < 3:
        raise HTTPException(
            status_code=400, detail="Text is too short or empty after cleaning"
        )

    if len(cleaned_text) > 10000:
        raise HTTPException(
            status_code=400, detail="Text is too long for TTS generation"
        )

    os.makedirs(os.path.dirname(output_file_path), exist_ok=True)

    try:
        communicate = edge_tts.Communicate(cleaned_text, voice)
        await communicate.save(output_file_path)

        if (
            not os.path.exists(output_file_path)
            or os.path.getsize(output_file_path) == 0
        ):
            raise HTTPException(
                status_code=500, detail="Audio file was not created or is empty"
            )

    except edge_tts.exceptions.NoAudioReceived as e:
        raise HTTPException(
            status_code=500,
            detail=f"No audio received from TTS service. Text may contain unsupported characters or be too short: {str(e)}",
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to generate speech: {str(e)}"
        ) from e

    logging.info(f"Saved speak file: {output_file_path}")
    return output_file_path


def validate_and_convert_audio(input_file):
    try:
        repaired_file = f"{input_file}_repaired.webm"
        temp_wav = f"{input_file}.wav"

        try:
            repair_cmd = ["ffmpeg", "-i", input_file, "-c", "copy", "-y", repaired_file]
            subprocess.run(
                repair_cmd, check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE
            )

            if os.path.exists(repaired_file) and os.path.getsize(repaired_file) > 0:
                input_file = repaired_file
                logging.info(f"Successfully repaired WebM file: {repaired_file}")
        except Exception as e:
            logging.warning(f"WebM repair attempt failed: {str(e)}")

        cmd = [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "stream=index,codec_name,codec_type",
            "-of",
            "json",
            input_file,
        ]
        result = subprocess.run(
            cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE
        )
        logging.info(f"FFprobe output: {result.stdout.decode()}")

        cmd = [
            "ffmpeg",
            "-i",
            input_file,
            "-ar",
            "16000",
            "-ac",
            "1",
            "-c:a",
            "pcm_s16le",
            "-f",
            "wav",
            "-y",
            temp_wav,
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        logging.info(f"File converted to WAV: {temp_wav}")

        if os.path.exists(repaired_file):
            try:
                os.remove(repaired_file)
            except Exception:
                pass

        return temp_wav
    except subprocess.CalledProcessError as e:
        logging.error(f"Error during validation/conversion: {e.stderr.decode()}")

        try:
            logging.info("Trying fallback conversion method...")
            fallback_cmd = [
                "ffmpeg",
                "-i",
                input_file,
                "-ar",
                "16000",
                "-ac",
                "1",
                "-acodec",
                "pcm_s16le",
                "-y",
                "-f",
                "wav",
                "-fflags",
                "+genpts",
                "-ignore_unknown",
                temp_wav,
            ]
            subprocess.run(
                fallback_cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE
            )
            logging.info(f"Fallback conversion succeeded: {temp_wav}")
            return temp_wav
        except subprocess.CalledProcessError as inner_e:
            logging.error(
                f"Fallback conversion also failed: {inner_e.stderr.decode() if hasattr(inner_e, 'stderr') else str(inner_e)}"
            )
            return False
    except Exception as e:
        logging.error(f"Unexpected error in audio validation: {str(e)}")
        return False


def recognize_from_audio(input_file, language="tr"):
    try:
        if not input_file or not os.path.exists(input_file):
            raise Exception(f"Audio file not found: {input_file}")

        logging.info(f"Performing speech recognition on {input_file}...")
        recognizer = sr.Recognizer()

        with sr.AudioFile(input_file) as source:
            audio = recognizer.record(source)
            user_input = recognizer.recognize_google(audio, language=language)

        logging.info(f"Recognition successful: '{user_input}'")
        return user_input
    except Exception as ex:
        e = str(ex)
        if e == "":
            e = "No speech detected in the audio file."
        logging.error(f"Speech recognition error: {e}")
        raise Exception(f"Speech recognition failed: {e}")


async def process_audio_file_common(file, language="tr", is_async=False):
    temp_files = []
    wav_file = None

    try:
        unique_id = str(uuid.uuid4())

        if is_async:
            file_content = await file.read()
        else:
            file_content = file.file.read()

        if not file_content:
            raise HTTPException(status_code=400, detail="Empty file received")

        logging.info(f"Received file: {file.filename}, size: {len(file_content)} bytes")

        temp_dir = gettempdir()
        raw_file = os.path.join(temp_dir, f"temp_raw_{unique_id}.webm")
        temp_files.append(raw_file)

        with open(raw_file, "wb") as f:
            f.write(file_content)

        wav_file = validate_and_convert_audio(raw_file)
        if not wav_file:
            raise HTTPException(
                status_code=400, detail="Invalid or corrupted audio file"
            )

        temp_files.append(wav_file)

        try:
            import speech_recognition as sr

            recognizer = sr.Recognizer()
            with sr.AudioFile(wav_file) as source:
                audio = recognizer.record(source)
                user_input = recognizer.recognize_google(audio, language=language)
            logging.info(f"Recognition successful: '{user_input}'")
            return user_input
        except Exception as e:
            msg = str(e) or "No speech detected in the audio file."
            logging.error(f"Speech recognition error: {msg}")
            raise HTTPException(
                status_code=400, detail=f"Speech recognition failed: {msg}"
            )

    except Exception as e:
        logging.error(f"Audio processing error: {str(e)}")
        raise HTTPException(
            status_code=400, detail=f"Audio processing failed: {str(e)}"
        ) from e

    finally:
        for path in temp_files:
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                    logging.debug(f"Removed temporary file: {path}")
                except Exception as e:
                    logging.warning(f"Failed to remove temporary file {path}: {str(e)}")
