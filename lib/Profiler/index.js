'use strict';

const { Session, } = require("node:inspector/promises");
const { EventEmitter } = require("node:events");
const HeapResource = require("./HeapResource.js");
const CPUResource = require("./CPUResource.js");
const TracingResource = require("./TracingResource.js");
const WorkerResource = require("./WorkerResource.js");

class Profiler extends EventEmitter {
  #session = null;
  #resources = new Map();

  constructor() {
    super();
  }

  connect() {
    if (this.#session) return;
    try {
      this.#session = new Session();
      this.#session.connect();
      this.emit('connect');
    } catch (e) {
      this.emit('error', e);
    }
  }

  async post(...args) {
    return await this.#session.post(...args);
  }

  notify(...args) {
    this.emit(...args);
  }

  async disconnect() {
    await this[Symbol.asyncIterator]();
  }

  async subscribe(...args) {
    this.#session.once(...args);
  }

  async cpu({ ms = 1000 } = {}) {
    const resource = new CPUResource(this, ms);
    this.#resources.set('cpu', resource);
    await resource.start();
  }

  async mem({ ms = 1000 } = {}) {
    const resource = new HeapResource(this, ms);
    this.#resources.set('mem', resource);
    await resource.start();
  }

  async tracing({ ms = 1000, categories } = {}) {
    const resource = new TracingResource(this, ms, categories);
    this.#resources.set('tracing', resource);
    await resource.start();
  }

  async worker({ ms = 1000 } = {}) {
    const resource = new WorkerResource(this, ms);
    this.#resources.set('worker', resource);
    await resource.start();
  }

  async [Symbol.asyncIterator]() {
    if (!this.#session) return;
    try {
      const promises = [];
      for (const resource of this.#resources.values()) {
        promises.push(resource.stop());
      }
      await Promise.all(promises);
      this.#session.disconnect();
      this.#session = null;
      this.emit('disconnect');
    } catch (e) {
      this.emit('error', e);
    }
  }

  async stop(key) {
    if (!this.#resources.has(key)) return;
    const resource = this.#resources.get(key);
    await resource.stop();
    this.#resources.delete(key);
  }
}

module.exports = { Profiler };