"""Umwandlung von Whisper-Segmenten in SRT-Untertiteldateien."""


def format_srt_timestamp(seconds: float) -> str:
    if seconds < 0:
        seconds = 0
    total_ms = round(seconds * 1000)
    hours, rem_ms = divmod(total_ms, 3_600_000)
    minutes, rem_ms = divmod(rem_ms, 60_000)
    secs, millis = divmod(rem_ms, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def segments_to_srt(segments: list[dict]) -> str:
    blocks = []
    for i, seg in enumerate(segments, start=1):
        start = format_srt_timestamp(seg["start"])
        end = format_srt_timestamp(seg["end"])
        text = seg["text"].strip()
        blocks.append(f"{i}\n{start} --> {end}\n{text}\n")
    return "\n".join(blocks) + ("\n" if blocks else "")


def write_srt(segments: list[dict], out_path: str) -> None:
    content = segments_to_srt(segments)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(content)
