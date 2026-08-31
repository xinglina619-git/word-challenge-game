const http = require('http');

const port = Number(process.env.PORT);
const mode = process.env.WORD_SPIRIT_FIXTURE_MODE || 'mismatch';

if (!Number.isInteger(port) || port <= 0) {
  process.exitCode = 2;
} else if (mode === 'silent') {
  setInterval(() => {}, 1000);
} else {
  const server = http.createServer((req, res) => {
    const body = mode === 'matching'
      ? { app: 'word-spirit-planet', version: '0.4.0', ok: true }
      : { app: 'other-service', version: '1.0.0', ok: true };
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify(body));
  });
  server.listen(port, '127.0.0.1');
}
