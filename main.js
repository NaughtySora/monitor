'use strict';

// ! Infrastructure Metrics - first attempt
// CPU
// RAM
// Disk I/O
// Network I/O
// Container metrics (Docker/Kubernetes) ?

const perf = require("node:perf_hooks");
const v8 = require("node:v8");
const reporter = require("node:test/reporters");
const util = require("node:util");
const diagnostics_ = require("node:diagnostics_channel");
const { Session, } = require("node:inspector/promises");
const Module = require("node:module");
const os = require("node:os");
const trace = require("node:trace_events");
const threads = require("node:worker_threads");
const { async } = require("naughty-util");
const { EventEmitter } = require("node:events");

// process

// options for TracingResource
// [
//   'v8',
//   'node',
//   'node.async_hooks',
//   'node.perf',
//   'node.timers',
//   'node.worker'
// ]

// s.post("NodeWorker.sendMessageToWorker");

/**
 * head profiler has options 
 * default 
 * {
    samplingInterval: 32768,
    stackDepth: 128,
    includeObjectsCollectedByMajorGC: false,
    includeObjectsCollectedByMinorGC: false,
  }
 * seems nodejs supports only samplingInterval 
 */

class CPUResource {
  #session = null;
  #timer = null;
  #interval = 0;

  constructor(session, ms) {
    this.#session = session;
    this.#interval = ms;
  }

  #watch() {
    this.#timer = setTimeout(async () => {
      try {
        await this.#session.post('Profiler.start');
        await async.pause(this.#interval);
        if (!this.#session || !this.#timer) return;
        const data = await this.#session.post('Profiler.stop');
        this.#session.notify('cpu:data', data);
      } catch (e) {
        this.#session.notify('cpu:error', e);
      }
      const timer = this.#timer;
      if (timer) timer.refresh();
    }, 0);
  }

  async start() {
    try {
      await this.#session.post('Profiler.enable');
      this.#watch();
      this.#session.notify('cpu:start');
    } catch (e) {
      this.#session.notify('cpu:error', e);
    }
  }

  async stop() {
    try {
      clearTimeout(this.#timer);
      this.#timer = null;
      await this.#session.post('Profiler.disable');
      this.#session.notify('cpu:stop');
    } catch (e) {
      this.#session.notify('cpu:error', e);
    }
    this.#session = null;
  }
}

class TracingResource {
  #session = null;
  #options = [];

  constructor(session, options) {
    this.#session = session;
    this.#options = options;
  }

  #watch() {
    this.#session.subscribe('NodeTracing.dataCollected', (data) => {
      this.#session.notify('tracing:data', data);
    });
  }

  async start() {
    try {
      await this.#session.post('NodeTracing.start', {
        traceConfig: { includedCategories: this.#options, }
      });
      this.#watch();
      this.#session.notify('tracing:start');
    } catch (e) {
      this.#session.notify('tracing:error', e);
    }
  }

  async stop() {
    try {
      await this.#session.post('NodeTracing.stop');
      this.#options.length = 0;
      this.#session.notify('tracing:stop');
    } catch (e) {
      this.#session.notify('tracing:error', e);
    }
    this.#session = null;
  }
}

class HeapResource {
  #session = null;
  #timer = null;
  #options = {
    samplingInterval: 32768,
    stackDepth: 128,
    includeObjectsCollectedByMajorGC: false,
    includeObjectsCollectedByMinorGC: false,
  };
  #interval = 0;

  constructor(session, ms, options) {
    this.#session = session;
    this.#interval = ms;
    if (!!options && typeof options === 'object') {
      this.#options = Object.assign(this.#options, options);
    }
  }

  #watch() {
    this.#timer = setTimeout(async () => {
      try {
        await async.pause(this.#interval);
        if (!this.#session || !this.#timer) return;
        const data = await this.#session.post('HeapProfiler.getSamplingProfile');
        this.#session.notify('mem:data', data);
      } catch (e) {
        this.#session.notify('mem:error', e);
      }
      const timer = this.#timer;
      if (timer) timer.refresh();
    }, 0);
  }

  async start() {
    try {
      await this.#session.post('HeapProfiler.enable');
      await this.#session.post('HeapProfiler.startSampling');
      this.#watch();
      this.#session.notify('mem:start');
    } catch (e) {
      this.#session.notify('mem:error', e);
    }
  }

  async stop() {
    try {
      clearTimeout(this.#timer);
      this.#timer = null;
      await this.#session.post('HeapProfiler.disable');
      this.#options = null;
      this.#session.notify('mem:stop');
    } catch (e) {
      this.#session.notify('mem:error', e);
    }
    this.#session = null;
  }
}

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

  async notify(...args) {
    this.emit(...args);
  }

  async disconnect() {
    await this[Symbol.asyncIterator]();
  }

  async subscribe(...args) {
    this.#session.on(...args);
  }

  async cpu(ms = 1000) {
    const resource = new CPUResource(this, ms);
    this.#resources.set('cpu', resource);
    await resource.start();
  }

  async mem(ms = 1000) {
    const resource = new HeapResource(this, ms);
    this.#resources.set('mem', resource);
    await resource.start();
  }

  async tracing(options) {
    const resource = new TracingResource(this, options);
    this.#resources.set('tracing', resource);
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

const main = async () => {
  const profiler = new Profiler();

  profiler.on('tracing:data', (data) => {
    // console.dir(data, { depth: Infinity });
    console.log('tracing:data');
  })
    .on('cpu:data', (data) => {
      // console.dir(data, { depth: Infinity });
      console.log('cpu:data');
    })
    .on('mem:data', (data) => {
      // console.dir(data, { depth: Infinity });
      console.log('mem:data');
    })
    .on('error', (err) => {
      console.error('error', err);
    })
    .on('cpu:error', (err) => {
      console.error('error', err);
    })
    .on('mem:error', (err) => {
      console.error('error', err);
    })
    .on('mem:start', () => {
      console.error('mem:start');
    })
    .on('mem:stop', () => {
      console.error('mem:stop');
    })
    .on('cpu:start', () => {
      console.error('cpu:start');
    })
    .on('cpu:stop', () => {
      console.error('cpu:stop');
    })
    .on('tracing:error', () => {
      console.error('tracing:error');
    })
    .on('tracing:start', () => {
      console.error('tracing:start');
    })
    .on('tracing:stop', () => {
      console.error('tracing:stop');
    })
    .on('connect', () => {
      console.error('connect');
    })
    .on('disconnect', () => {
      console.error('disconnect');
    });
  profiler.connect();

  //! make tracing resource hold the event loop like others
  await profiler.tracing(['v8']);
  // await profiler.mem();
  // await profiler.cpu();

  // await async.pause(3000);
  // await profiler.stop('cpu');
  // await async.pause(3000);
  // await profiler.stop('mem');

  // await async.pause(3000);
  // await profiler.disconnect();
};

main();