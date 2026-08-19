const path = require('node:path');
const { randomUUID } = require('node:crypto');
const pythonRunner = require('./pythonRunner');

/**
 * Haelt den Queue-State als single source of truth und verarbeitet Dateien
 * strikt sequentiell (immer nur ein Python-Prozess gleichzeitig).
 */
class TranscriptionQueue {
  constructor(onUpdate) {
    this.items = [];
    this.onUpdate = onUpdate; // callback(serializedState)
    this.isRunning = false;
    this.stopRequested = false;
    this.currentRunner = null;
  }

  addFiles(filePaths) {
    for (const filePath of filePaths) {
      this.items.push({
        id: randomUUID(),
        filePath,
        fileName: path.basename(filePath),
        status: 'queued',
        srtPath: null,
        errorMessage: null,
        errorCode: null,
      });
    }
    this._notify();
  }

  removeFile(id) {
    this.items = this.items.filter((item) => !(item.id === id && item.status === 'queued'));
    this._notify();
  }

  async start({ outputDir, language }) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.stopRequested = false;
    this._notify();

    while (!this.stopRequested) {
      const next = this.items.find((item) => item.status === 'queued');
      if (!next) break;
      await this._processItem(next, { outputDir, language });
    }

    this.isRunning = false;
    this._notify();
  }

  stop() {
    this.stopRequested = true;
    if (this.currentRunner) this.currentRunner.cancel();
  }

  _processItem(item, { outputDir, language }) {
    return new Promise((resolve) => {
      item.status = 'processing';
      item.statusStage = 'starting';
      this._notify();

      const emitter = pythonRunner.runTranscription({
        inputPath: item.filePath,
        outputDir: outputDir || null,
        language: language || 'auto',
      });
      this.currentRunner = emitter;

      emitter.on('status', (event) => {
        item.statusStage = event.stage;
        this._notify();
      });

      emitter.on('result', (event) => {
        item.status = 'done';
        item.srtPath = event.srt_path;
        this._notify();
      });

      emitter.on('error', (event) => {
        item.status = 'error';
        item.errorCode = event.code;
        item.errorMessage = event.message;
        this._notify();
      });

      emitter.on('done', () => {
        this.currentRunner = null;
        resolve();
      });
    });
  }

  getState() {
    return {
      isRunning: this.isRunning,
      items: this.items.map((item) => ({ ...item })),
    };
  }

  _notify() {
    if (this.onUpdate) this.onUpdate(this.getState());
  }
}

module.exports = { TranscriptionQueue };
