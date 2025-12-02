'use strict';

const { http, stream, } = require("naughty-util");
const { randomUUID } = require("node:crypto");
const { createServer } = require("node:http");
const { ResourceManager } = require("../lib/ResourceManager");
const tls = require('node:tls');
const { describe, beforeEach, afterEach } = require("node:test");

const clientError = () => {
  const options = {
    port: 3000,
    host: 'localhost',
  };
  const socket = tls.connect(options, () => {
    socket.write('GET /endpoint?term=one two HTTP/1.1\r\n' +
      'Host: localhost\r\n' +
      '\r\n');
  });
};

const server = () => {
  const routing = {
    'get:/': () => ({ ok: true }),
    'post:/user': (data) => ({ ...data, id: randomUUID() }),
  };
  const errorCode = http.CODES.badRequest;
  const server = createServer(async (req, res) => {
    const method = req.method.toLowerCase();
    const callback = routing[`${method}:${req.url}`];
    if (!callback) {
      res.writeHead(errorCode, { 'content-type': 'application/json' });
      res.end({
        code: errorCode,
        message: http.CODES[errorCode],
        error: http.CODES[errorCode],
      });
    } else {
      const body = await stream.utf8(req);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(callback(body)));
    }
  });
  server.listen(3000);
  return {
    server,
    async stop() {
      return new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }
};

describe('ResourceMonitor', async () => {
  let manager = null;
  let http = null;

  beforeEach(() => {
    http = server();
    manager = new ResourceManager();
  });

  await afterEach(async () => {
    await http.unwatch();
    manager.destroy();
  });

  it('http', () => {
    // manager.http(http.server);
  });
});