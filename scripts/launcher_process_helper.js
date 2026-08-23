const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const [testScript, stdoutFile, stderrFile] = process.argv.slice(2);
if (!testScript || !stdoutFile || !stderrFile) process.exit(2);

const stdout = fs.openSync(stdoutFile, 'w');
const stderr = fs.openSync(stderrFile, 'w');
let result;
try {
  result = spawnSync('powershell.exe', [
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', testScript, '-InvokeOnly'
  ], {
    cwd: path.resolve(path.dirname(testScript), '..'),
    env: process.env,
    stdio: ['ignore', stdout, stderr],
    windowsHide: true
  });
} finally {
  fs.closeSync(stdout);
  fs.closeSync(stderr);
}

if (result.error) {
  fs.appendFileSync(stderrFile, `${result.error.stack || result.error.message}\n`, 'utf8');
  process.exit(1);
}
process.exit(Number.isInteger(result.status) ? result.status : 1);
