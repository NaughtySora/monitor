'use strict';

const { HTTPMonitor } = require('./HTTPMonitor.js');

class ResourceManager {
  #resources = new Map();
  constructor() { }

  http(server) {
    const monitor = new HTTPMonitor();
    monitor.watch(server);
    this.#resources.set('http', monitor);
  }

  destroy() {
    for (const resource of this.#resources) {
      resource.unwatch();
    }
    this.#resources.clear();
  }
}

module.exports = { ResourceManager };