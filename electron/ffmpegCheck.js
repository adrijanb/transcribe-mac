const { spawnSync } = require('node:child_process');

function isFfmpegAvailable() {
  const result = spawnSync('which', ['ffmpeg']);
  return result.status === 0;
}

module.exports = { isFfmpegAvailable };
