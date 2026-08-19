const fs = require('node:fs');
const path = require('node:path');

const PYTHON_DIR = path.join(__dirname, '..', 'python');
const VENV_PYTHON = path.join(PYTHON_DIR, 'venv', 'bin', 'python3');
const TRANSCRIBE_SCRIPT = path.join(PYTHON_DIR, 'transcribe.py');

function getPythonPath() {
  return VENV_PYTHON;
}

function getScriptPath() {
  return TRANSCRIBE_SCRIPT;
}

function getPythonDir() {
  return PYTHON_DIR;
}

function isVenvReady() {
  return fs.existsSync(VENV_PYTHON);
}

module.exports = { getPythonPath, getScriptPath, getPythonDir, isVenvReady };
