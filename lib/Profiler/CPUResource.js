'use strict';

const { async } = require("naughty-util");

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

module.exports = CPUResource;