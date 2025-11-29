'use strict';

const net = require("node:net");
const http = require("node:http");
const { logger, stream: { utf8, read } } = require("naughty-util");

const server = http.createServer((req, res) => {
  logger.log('http: ', req.url);
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ ok: true }));
});

// const tcp = net.createServer((socket) => {
//   socket.on("data", (buffer) => logger.log(buffer.toString()))
//   socket.end();
// });

const tcp = net.createServer({ pauseOnConnect: true });
tcp.listen(2500, () => {
  logger.info(`tcp server on port ${2500}`);
});