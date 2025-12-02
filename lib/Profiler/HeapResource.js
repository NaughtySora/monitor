'use strict';

const { async } = require("naughty-util");

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

module.exports = HeapResource;