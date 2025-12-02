'use strict';

const { misc } = require("naughty-util");
const { EventEmitter } = require("node:events");

class HTTPMonitor extends EventEmitter {
  #server = null;
  #listeners = null;
  constructor() { super(); }

  #counter(fn) {
    let i = 0;
    return (...params) => {
      return fn.call(this, i++, ...params);
    };
  }

  watch(server) {
    this.#server = server;
    const counter = this.#counter;
    const dropRequest = counter(this.#dropRequest);
    const request = counter(this.#request);
    const error = counter(this.#error);
    const clientError = counter(this.#clientError);
    server.prependListener('dropRequest', dropRequest);
    server.prependListener('request', request);
    server.prependListener('error', error);
    server.prependListener('clientError', clientError);
    this.#listeners = [dropRequest, request, error, clientError];
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

  unwatch() {
    if (!this.#listeners) return;
    this.#server = server;
    for (const listener of this.#listeners) {
      this.#server.removeListener(listener);
    }
    this.#listeners = null;
    this.#server = null;
  }
}

module.exports = { HTTPMonitor };