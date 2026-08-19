"""Audio/Video-Erkennung und ffmpeg-basierte Audioextraktion."""

import os
import subprocess

VIDEO_EXTENSIONS = {".mp4", ".mov", ".m4v", ".mkv", ".avi", ".webm", ".wmv", ".flv"}
AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg", ".wma", ".aiff", ".aif"}


class ExtractionError(Exception):
    def __init__(self, message: str, stderr: str = ""):
        super().__init__(message)
        self.stderr = stderr


def _ext(path: str) -> str:
    return os.path.splitext(path)[1].lower()


def is_video_file(path: str) -> bool:
    return _ext(path) in VIDEO_EXTENSIONS


def is_audio_file(path: str) -> bool:
    return _ext(path) in AUDIO_EXTENSIONS


def extract_audio_to_wav(input_path: str, out_wav_path: str) -> None:
    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-vn",
        "-ac", "1",
        "-ar", "16000",
        "-acodec", "pcm_s16le",
        out_wav_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise ExtractionError(
            f"ffmpeg-Audioextraktion fehlgeschlagen (Exit {result.returncode})",
            stderr=result.stderr,
        )
