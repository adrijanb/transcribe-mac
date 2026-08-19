#!/usr/bin/env python3
"""CLI-Entry-Point: transkribiert eine einzelne Audio-/Videodatei zu SRT.

Gibt pro Verarbeitungsschritt eine JSON-Zeile auf stdout aus (newline-delimited
JSON), damit ein aufrufender Prozess (z.B. Electron) live mitlesen kann.
"""

import argparse
import json
import os
import shutil
import sys
import tempfile

import media_utils
import srt_utils

MODEL_REPO = "mlx-community/whisper-large-v3-turbo"


def emit(event: dict) -> None:
    print(json.dumps(event), flush=True)


def emit_status(stage: str) -> None:
    emit({"type": "status", "stage": stage})


def emit_error(stage: str, code: str, message: str) -> None:
    emit({"type": "error", "stage": stage, "code": code, "message": message})


def resolve_output_path(input_path: str, output_dir: str | None) -> str:
    base = os.path.splitext(os.path.basename(input_path))[0]
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
        return os.path.join(output_dir, f"{base}.srt")
    return os.path.join(os.path.dirname(os.path.abspath(input_path)), f"{base}.srt")


def run(input_path: str, output_dir: str | None, language: str) -> int:
    emit_status("detecting_media")

    if not os.path.isfile(input_path):
        emit_error("detecting_media", "INPUT_NOT_FOUND", f"Datei nicht gefunden: {input_path}")
        return 1

    if shutil.which("ffmpeg") is None:
        emit_error("detecting_media", "FFMPEG_NOT_FOUND", "ffmpeg wurde nicht im PATH gefunden. Installiere es mit: brew install ffmpeg")
        return 1

    is_video = media_utils.is_video_file(input_path)

    audio_path = input_path
    tmp_wav_path = None

    try:
        if is_video:
            emit_status("extracting_audio")
            tmp_fd, tmp_wav_path = tempfile.mkstemp(suffix=".wav")
            os.close(tmp_fd)
            try:
                media_utils.extract_audio_to_wav(input_path, tmp_wav_path)
            except media_utils.ExtractionError as e:
                emit_error("extracting_audio", "EXTRACTION_FAILED", f"{e}: {e.stderr.strip()[-500:]}")
                return 1
            audio_path = tmp_wav_path

        emit_status("loading_model")
        try:
            import mlx_whisper
        except ImportError as e:
            emit_error("loading_model", "UNKNOWN_ERROR", f"mlx_whisper konnte nicht importiert werden: {e}")
            return 1

        emit_status("transcribing")
        decode_language = None if language == "auto" else language
        try:
            result = mlx_whisper.transcribe(
                audio_path,
                path_or_hf_repo=MODEL_REPO,
                language=decode_language,
            )
        except Exception as e:
            message = str(e)
            lower = message.lower()
            if "huggingface" in lower or "connection" in lower or "resolve" in lower:
                emit_error("transcribing", "MODEL_DOWNLOAD_FAILED", f"Modell-Download fehlgeschlagen: {message}")
            elif "ffmpeg" in lower or "load audio" in lower:
                emit_error("transcribing", "UNSUPPORTED_OR_CORRUPT_MEDIA", f"Datei konnte nicht dekodiert werden: {message}")
            else:
                emit_error("transcribing", "TRANSCRIBE_FAILED", f"Transkription fehlgeschlagen: {message}")
            return 1

        emit_status("writing_srt")
        out_path = resolve_output_path(input_path, output_dir)
        try:
            srt_utils.write_srt(result["segments"], out_path)
        except OSError as e:
            emit_error("writing_srt", "OUTPUT_WRITE_FAILED", f"SRT konnte nicht geschrieben werden: {e}")
            return 1

        emit({
            "type": "result",
            "srt_path": out_path,
            "language": result.get("language"),
            "segment_count": len(result["segments"]),
        })
        return 0

    except Exception as e:  # noqa: BLE001 - letzte Sicherheitsnetz-Ebene
        emit_error("unknown", "UNKNOWN_ERROR", str(e))
        return 1
    finally:
        if tmp_wav_path and os.path.exists(tmp_wav_path):
            os.remove(tmp_wav_path)


def main() -> None:
    parser = argparse.ArgumentParser(description="Transkribiert eine Audio-/Videodatei zu SRT")
    parser.add_argument("--input", required=True, help="Pfad zur Eingabedatei")
    parser.add_argument("--output-dir", default=None, help="Zielordner fuer die SRT-Datei (Default: neben der Quelldatei)")
    parser.add_argument("--language", default="auto", help="Sprachcode (z.B. 'de', 'en') oder 'auto'")
    args = parser.parse_args()

    exit_code = run(args.input, args.output_dir, args.language)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
