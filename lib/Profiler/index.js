'use strict';

const { Session, } = require("node:inspector/promises");
const { async } = require("naughty-util");
const { EventEmitter } = require("node:events");

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
  #timer = null;
  #session = null;
  #options = [];
  #interval = 0;

  constructor(session, ms, options) {
    this.#session = session;
    this.#options = options;
    this.#interval = ms;
  }

  #watch() {
    const options = {
      traceConfig: { includedCategories: this.#options, },
    };
    this.#timer = setTimeout(async () => {
      try {
        this.#session.subscribe('NodeTracing.dataCollected', async data => {
          this.#session.notify('tracing:data', data);
          const timer = this.#timer;
          if (timer) timer.refresh();
        });
        await this.#session.post('NodeTracing.start', options);
        await async.pause(this.#interval);
        if (!this.#session || !this.#timer) return;
        await this.#session.post('NodeTracing.stop');
      } catch (e) {
        this.#session.notify('tracing:error', e);
      }
    }, 0);
  }

  async start() {
    try {
      this.#watch();
      this.#session.notify('tracing:start');
    } catch (e) {
      this.#session.notify('tracing:error', e);
    }
  }

  async stop() {
    try {
      clearTimeout(this.#timer);
      this.#timer = null;
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

// class WorkerResource {
//   #session = null;
//   #timer = null;
//   #interval = 0;

//   constructor(session, ms) {
//     this.#session = session;
//     this.#interval = ms;
//   }

//   #watch() {
//     this.#timer = setTimeout(async () => {
//       try {
//         await async.pause(this.#interval);
//         if (!this.#session || !this.#timer) return;
//         // this.#session.subscribe("NodeWorker.detachedFromWorker", console.log);
//         // this.#session.subscribe("NodeWorker.attachedToWorker", console.log);
//         // this.#session.subscribe("NodeWorker.receivedMessageFromWorker", console.log);
//         // await this.#session.post.post("NodeWorker.sendMessageToWorker", { message: "", sessionId: "" });
//         this.#session.notify('worker:data', data);
//       } catch (e) {
//         this.#session.notify('worker:error', e);
//       }
//       const timer = this.#timer;
//       if (timer) timer.refresh();
//     }, 0);
//   }

//   async start() {
//     try {
//       await this.#session.post("NodeWorker.enable");
//       this.#watch();
//       this.#session.notify('worker:start');
//     } catch (e) {
//       this.#session.notify('worker:error', e);
//     }
//   }

//   async stop() {
//     try {
//       clearTimeout(this.#timer);
//       this.#timer = null;
//       await this.#session.post('NodeWorker.disable');
//       this.#session.notify('worker:stop');
//     } catch (e) {
//       this.#session.notify('worker:error', e);
//     }
//     this.#session = null;
//   }
// }

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

  // async worker({ ms = 1000 } = {}) {
  //   const resource = new WorkerResource(this, ms);
  //   this.#resources.set('worker', resource);
  //   await resource.start();
  // }

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