'use strict';

const { http, stream, logger } = require("naughty-util");
const { randomUUID } = require("node:crypto");
const { createServer } = require("node:http");
const { EventEmitter } = require("node:events");
const Counter = require("../Counter");

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

target.listen(3000, logger.info.bind(null, 'target server running 3000'));

class Http extends EventEmitter {
  #options = null;
  #errors;
  constructor(options) {
    super();
    this.#options = options;
    this.errors = new Map([
      ['client', new Counter('clientErrors')],
      ['server', new Counter('serverErrors')],
    ]);
  }

  track(server) {
    server.prependOnListener('clientError', this.#clientError);
    server.prependOnListener('dropRequest', this.#dropRequest);
    server.prependOnListener('request', this.#request);
    server.prependOnListener('error', this.#error);

    server.prependOnceListener('listening', this.#listening);
    server.prependOnceListener('close', this.#close); // if not other events needs to throw error to replicate default behavior
  }

  #close() {
    //? report server closed
  }

  #clientError() {
    //? client error,
  }

  #dropRequest() {
    //? max requests limit per socket is breached and requests start dropping 
  }

  #request(req, res) {
    // track request
  }

  #error() {

  }

  #listening() {

  }
}


const proxy = new Http();
proxy.track(target);