'use strict';

const { http, stream, logger, misc } = require("naughty-util");
const { randomUUID } = require("node:crypto");
const { createServer } = require("node:http");
const { EventEmitter } = require("node:events");
const tls = require('node:tls');

const clientError = () => {
  const options = {
    port: 3000,
    host: 'localhost'
  };
  const socket = tls.connect(options, () => {
    socket.write('GET /endpoint?term=one two HTTP/1.1\r\n' +
      'Host: localhost\r\n' +
      '\r\n');
  });
};

const routing = {
  'get:/': () => ({ ok: true }),
  'post:/user': (data) => ({ ...data, id: randomUUID() }),
};

const errorCode = http.CODES.badRequest;
const target = createServer(async (req, res) => {
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

target.listen(3000);

const counter = (fn, context) => {
  let i = 0;
  return (...params) => {
    return fn.call(context, i++, ...params);
  };
};

class Http extends EventEmitter {
  constructor() {
    super();
  }

  watch(server) {
    server.prependListener('dropRequest', counter(this.#dropRequest, this));
    server.prependListener('request', counter(this.#request, this));
    server.prependListener('error', counter(this.#error, this));
    server.prependListener('clientError', counter(this.#clientError, this));
  }

  #error(i, error) {
    this.emit('error', {
      data: error,
      time: Date.now(),
      i,
    });
  }

  #clientError(i, error) {
    this.emit('clientError', {
      data: {
        bytesParsed: error.bytesParsed,
        code: error.code,
        reason: error.reason,
      },
      time: Date.now(),
      i,
    });
  }

  #dropRequest(i, req) {
    this.emit('dropRequest', {
      data: {
        url: req.url,
        method: req.method,
        ip: req.socket.remoteAddress,
      },
      time: Date.now(),
      i,
    });
  }

  #request(i, req, res) {
    const end = misc.timestamp();
    res.on('finish', () => {
      this.emit('request', {
        data: {
          url: req.url,
          method: req.method,
          lapsed: end(),
          code: res.statusCode,
          ip: req.socket.remoteAddress,
        },
        time: Date.now(),
        i,
      });
    });
  }
}

const proxy = new Http();
proxy.watch(target);
proxy.on('clientError', logger.error.bind(null, 'clientError: '));
proxy.on('request', logger.log.bind(null, 'request: '));