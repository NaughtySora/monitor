'use strict';

const { async } = require("naughty-util");

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

module.exports = TracingResource;