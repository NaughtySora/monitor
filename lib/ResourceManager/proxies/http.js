"use strict";

const { logger } = require('naughty-util');
const http = require('node:http');
const net = require('node:net');
const { URL } = require('node:url');

const request = (options) => {
  const { 0: host, 1: port, } = options.path.split(":");
  const req = http.request(options);
  req.end();
  req.on('connect', (res, socket, head) => {
    socket.write(get(host, parseInt(port)));
    socket.on('data', (chunk) => {
      console.log(chunk.toString());
    });
  });
};

const httpRaw = (...lines) => lines.map(line => `${line}${CRLF}`).join("") + CRLF;
const CRLF = '\r\n';

const HTTP_CONNECTION = httpRaw(
  'HTTP/1.1 200 Connection Established',
  'Proxy-agent: Node.js-Proxy'
);

const get = (host, port,) => httpRaw(
  'GET / HTTP/1.1',
  `Host: ${host}:${port}`,
  'Connection: close',
);

const PROXY_OPTIONS = {
  port: 2000,
  host: '127.0.0.1',
  method: 'CONNECT',
  path: 'www.google.com:80',
};

/** 
 * @description http
 * proxy
 */
const proxy = http.createServer((req, res) => {
  res.end();
});

/** 
 * @description https connect tls handshake
 * proxy
 */
proxy.on('connect', (req, socket, head) => {
  const { port = 80, hostname } = new URL(`http://${req.url}`);
  console.log(port, hostname)
  const server = net.connect(port || 80, hostname, () => {
    socket.write(HTTP_CONNECTION);
    server.write(head);
    server.pipe(socket);
    socket.pipe(server);
  });
});

proxy.listen(
  PROXY_OPTIONS.port,
  PROXY_OPTIONS.host,
  logger.info.bind(null, `Proxy running... ${PROXY_OPTIONS.host}:${PROXY_OPTIONS.port}`)
);

proxy.on('listening', request.bind(null, PROXY_OPTIONS));