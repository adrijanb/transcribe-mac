const ERROR_MESSAGES = {
  FFMPEG_NOT_FOUND: 'ffmpeg wurde nicht gefunden (brew install ffmpeg)',
  INPUT_NOT_FOUND: 'Datei nicht mehr gefunden',
  UNSUPPORTED_OR_CORRUPT_MEDIA: 'Datei kann nicht gelesen werden (nicht unterstützt oder beschädigt)',
  EXTRACTION_FAILED: 'Audio-Extraktion aus Video fehlgeschlagen',
  MODEL_DOWNLOAD_FAILED: 'Modell-Download fehlgeschlagen (Internet erforderlich)',
  TRANSCRIBE_FAILED: 'Transkription fehlgeschlagen',
  OUTPUT_WRITE_FAILED: 'SRT-Datei konnte nicht geschrieben werden',
  UNKNOWN_ERROR: 'Unbekannter Fehler',
};

const STAGE_LABELS = {
  starting: 'Wird gestartet…',
  detecting_media: 'Prüfe Datei…',
  extracting_audio: 'Extrahiere Audio…',
  loading_model: 'Lade Modell…',
  transcribing: 'Transkribiere…',
  writing_srt: 'Schreibe SRT…',
};

let outputFolder = null;
let currentState = { isRunning: false, items: [] };

const envBanner = document.getElementById('env-banner');
const dropzone = document.getElementById('dropzone');
const languageSelect = document.getElementById('language-select');
const outputModeSource = document.getElementById('output-mode-source');
const outputModeCustom = document.getElementById('output-mode-custom');
const outputFolderPath = document.getElementById('output-folder-path');
const queueList = document.getElementById('queue-list');
const startButton = document.getElementById('start-button');
const stopButton = document.getElementById('stop-button');
const progressText = document.getElementById('progress-text');

function initLanguageSelect() {
  for (const lang of LANGUAGES) {
    const opt = document.createElement('option');
    opt.value = lang.code;
    opt.textContent = lang.label;
    languageSelect.appendChild(opt);
  }
}

async function refreshEnvStatus() {
  const status = await window.api.getEnvStatus();
  const problems = [];
  if (!status.ffmpegAvailable) problems.push('ffmpeg wurde nicht gefunden — installiere es mit "brew install ffmpeg".');
  if (!status.venvReady) problems.push('Python-Umgebung fehlt — führe "python/setup_venv.sh" aus.');

  if (problems.length > 0) {
    envBanner.textContent = problems.join(' ');
    envBanner.classList.remove('hidden');
  } else {
    envBanner.classList.add('hidden');
  }
  updateStartButtonState();
}

function updateStartButtonState() {
  const hasQueuedItems = currentState.items.some((item) => item.status === 'queued');
  const envHealthy = envBanner.classList.contains('hidden');
  startButton.disabled = currentState.isRunning || !hasQueuedItems || !envHealthy;
  stopButton.disabled = !currentState.isRunning;
}

function renderQueue() {
  queueList.innerHTML = '';
  for (const item of currentState.items) {
    const li = document.createElement('li');
    li.className = 'queue-item';

    const name = document.createElement('span');
    name.className = 'filename';
    name.textContent = item.fileName;
    li.appendChild(name);

    if (item.status === 'processing' && item.statusStage) {
      const stageLabel = document.createElement('span');
      stageLabel.className = 'error-message';
      stageLabel.textContent = STAGE_LABELS[item.statusStage] || item.statusStage;
      li.appendChild(stageLabel);
    }

    if (item.status === 'error' && item.errorCode) {
      const errLabel = document.createElement('span');
      errLabel.className = 'error-message';
      errLabel.title = item.errorMessage || '';
      errLabel.textContent = ERROR_MESSAGES[item.errorCode] || item.errorCode;
      li.appendChild(errLabel);
    }

    const badge = document.createElement('span');
    badge.className = `status-badge ${item.status}`;
    badge.textContent = { queued: 'Wartet', processing: 'Läuft', done: 'Fertig', error: 'Fehler' }[item.status] || item.status;
    li.appendChild(badge);

    if (item.status === 'queued') {
      const removeBtn = document.createElement('button');
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', () => window.api.removeFile(item.id));
      li.appendChild(removeBtn);
    }

    if (item.status === 'done' && item.srtPath) {
      const openBtn = document.createElement('button');
      openBtn.textContent = 'SRT öffnen';
      openBtn.addEventListener('click', () => window.api.openPath(item.srtPath));
      li.appendChild(openBtn);

      const showBtn = document.createElement('button');
      showBtn.textContent = 'Im Finder zeigen';
      showBtn.addEventListener('click', () => window.api.showInFolder(item.srtPath));
      li.appendChild(showBtn);
    }

    queueList.appendChild(li);
  }

  const total = currentState.items.length;
  const done = currentState.items.filter((i) => i.status === 'done' || i.status === 'error').length;
  progressText.textContent = currentState.isRunning ? `Verarbeite ${done + 1} von ${total}…` : (total > 0 ? `${done} von ${total} fertig` : '');

  updateStartButtonState();
}

window.api.onQueueUpdate((state) => {
  currentState = state;
  renderQueue();
});

async function addFilePaths(paths) {
  const filtered = paths.filter(Boolean);
  if (filtered.length === 0) return;
  await window.api.addFiles(filtered);
}

dropzone.addEventListener('click', async () => {
  const paths = await window.api.chooseInputFiles();
  await addFilePaths(paths);
});

dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', async (e) => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  const files = Array.from(e.dataTransfer.files);
  const paths = files.map((f) => window.api.getPathForFile(f));
  await addFilePaths(paths);
});

outputModeSource.addEventListener('change', () => {
  if (outputModeSource.checked) {
    outputFolder = null;
    outputFolderPath.textContent = '';
  }
});

outputModeCustom.addEventListener('change', async () => {
  if (outputModeCustom.checked) {
    const folder = await window.api.chooseOutputFolder();
    if (folder) {
      outputFolder = folder;
      outputFolderPath.textContent = folder;
    } else {
      outputModeSource.checked = true;
      outputFolder = null;
    }
  }
});

startButton.addEventListener('click', () => {
  window.api.startQueue({ outputDir: outputFolder, language: languageSelect.value });
});

stopButton.addEventListener('click', () => {
  window.api.stopQueue();
});

initLanguageSelect();
refreshEnvStatus();
