const { spawn } = require('node:child_process');
const readline = require('node:readline');
const { EventEmitter } = require('node:events');
const pythonEnv = require('./pythonEnv');

/**
 * Startet transcribe.py fuer eine einzelne Datei und liefert einen EventEmitter,
 * der 'status', 'result' und 'error' Events (geparst aus den JSON-Zeilen auf
 * stdout) sowie ein abschliessendes 'done' Event (mit exitCode) emittiert.
 */
function runTranscription({ inputPath, outputDir, language }) {
  const emitter = new EventEmitter();

  const args = [pythonEnv.getScriptPath(), '--input', inputPath, '--language', language || 'auto'];
  if (outputDir) {
    args.push('--output-dir', outputDir);
  }

  const child = spawn(pythonEnv.getPythonPath(), args, {
    cwd: pythonEnv.getPythonDir(),
  });

  let sawStructuredError = false;
  let stderrBuffer = '';

  const rl = readline.createInterface({ input: child.stdout });
  rl.on('line', (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let event;
    try {
      event = JSON.parse(trimmed);
    } catch {
      return; // ignoriere nicht-JSON-Zeilen defensiv
    }
    if (event.type === 'error') sawStructuredError = true;
    emitter.emit(event.type, event);
  });

  child.stderr.on('data', (chunk) => {
    stderrBuffer += chunk.toString();
  });

  child.on('close', (exitCode) => {
    if (exitCode !== 0 && !sawStructuredError) {
      emitter.emit('error', {
        type: 'error',
        stage: 'process',
        code: 'UNKNOWN_ERROR',
        message: stderrBuffer.trim() || `Python-Prozess beendet mit Exit-Code ${exitCode}`,
      });
    }
    emitter.emit('done', { exitCode });
  });

  child.on('error', (err) => {
    emitter.emit('error', {
      type: 'error',
      stage: 'process',
      code: 'UNKNOWN_ERROR',
      message: `Python-Prozess konnte nicht gestartet werden: ${err.message}`,
    });
    emitter.emit('done', { exitCode: -1 });
  });

  emitter.cancel = () => child.kill();

  return emitter;
}

module.exports = { runTranscription };
