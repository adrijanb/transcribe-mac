# transcribe-mac

Lokale macOS-App zum Batch-Transkribieren von Audio- und Videodateien mit Zeitstempeln (SRT), komplett offline mit GPU-Beschleunigung auf Apple Silicon via [mlx-whisper](https://github.com/ml-explore/mlx-examples/tree/main/whisper).

- **UI**: Electron (Node.js)
- **Transkription**: Python + `mlx-whisper`, festes Modell `mlx-community/whisper-large-v3-turbo`
- **Video-Handling**: ffmpeg extrahiert die Audiospur
- **Ausgabe**: SRT-Dateien mit Zeitstempeln
- **Verarbeitung**: sequentielle Warteschlange (eine Datei nach der anderen)

Nur für lokale Entwicklungsnutzung gedacht (kein signiertes/notarisiertes App-Bundle).

## Voraussetzungen

- macOS auf Apple Silicon (M1/M2/M3/...)
- [Node.js](https://nodejs.org/) (getestet mit v18)
- [Homebrew](https://brew.sh/) mit ffmpeg:
  ```bash
  brew install ffmpeg
  ```
- Python 3.11 oder 3.12 via Homebrew (empfohlen, da `mlx-whisper`/`mlx`-Wheels für sehr neue Python-Versionen ggf. noch fehlen):
  ```bash
  brew install python@3.12
  ```

## Setup

1. Node-Abhängigkeiten installieren:
   ```bash
   npm install
   ```
2. Python-Umgebung einrichten (erstellt `python/venv` und installiert `mlx-whisper`):
   ```bash
   bash python/setup_venv.sh
   ```
3. App starten:
   ```bash
   npm start
   ```

Beim ersten Transkriptionslauf wird das Whisper-Modell (~1.6 GB) automatisch von Hugging Face heruntergeladen und in `~/.cache/huggingface` gecacht — dafür ist einmalig eine Internetverbindung nötig. Danach läuft alles vollständig lokal.

## Nutzung

1. Audio- oder Videodateien in die App ziehen (oder per Klick auswählen).
2. Optional Sprache manuell vorgeben (Standard: Auto-Erkennung) und/oder einen Zielordner für die SRT-Dateien wählen.
3. "Start" klicken — die Dateien werden nacheinander verarbeitet.
4. Fertige SRT-Dateien lassen sich direkt aus der Warteschlange öffnen oder im Finder anzeigen.

## Transkriptionsskript manuell testen

Ohne die Electron-UI lässt sich die Kernlogik direkt über die CLI testen:

```bash
python/venv/bin/python python/transcribe.py --input /pfad/zur/datei.mp3 --language de
```

## Bekannte Einschränkungen

- Fortschritt pro Datei wird nicht als Prozentanzeige dargestellt (nur Status wie "Transkribiere…"), da `mlx-whisper` keinen granularen Fortschritt pro Segment liefert.
- ffmpeg ist für **jede** Datei erforderlich (auch reine Audiodateien), da `mlx-whisper` intern darüber dekodiert.
- Export aktuell nur als SRT (kein TXT/VTT/JSON).
