'use strict';

const { Profiler } = require("../lib/Profiler/");
const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { async } = require("naughty-util");
const { Worker } = require("node:worker_threads");

const subscriptions = key => [
  'connect', 'disconnect', 'error', `${key}:data`,
  `${key}:error`, `${key}:stop`, `${key}:start`,
];

describe('Profiler', async () => {
  let profiler = new Profiler();

  beforeEach(() => {
    profiler = new Profiler();
  });

  await it.skip('cpu', async () => {
    const key = 'cpu';
    const events = subscriptions(key);
    for (const event of events) {
      profiler.on(event, (data) => {
        const logs = [event];
        if (data) logs.push(data);
        console.log(...logs);
      });
    }
    profiler.connect();
    await profiler.cpu({ ms: 2000 });
    await async.pause(3000);
    await profiler.stop(key);
  });

  await it.skip('mem', async () => {
    const key = 'mem';
    const events = subscriptions(key);
    for (const event of events) {
      profiler.on(event, (data) => {
        const logs = [event];
        if (data) logs.push(data);
        console.log(...logs);
      });
    }
    profiler.connect();
    await profiler.mem({ ms: 2000 });
    await async.pause(3000);
    await profiler.stop(key);
  });

  await it.skip('tracing', async () => {
    const key = 'tracing';
    const events = subscriptions(key);
    for (const event of events) {
      profiler.on(event, (data) => {
        const logs = [event];
        if (data) logs.push(data);
        console.log(...logs);
      });
    }
    profiler.connect();
    await profiler.tracing({
      ms: 2000,
      categories: [
        "node",
        "node.async_hooks",
        "node.perf",
        "node.timers",
        "node.worker",
        "v8"
      ],
    });
    await async.pause(3000);
    await profiler.stop(key);
  });

  await it('worker', async () => {
    const key = 'worker';
    const events = subscriptions(key);
    for (const event of events) {
      profiler.on(event, (data) => {
        const logs = [event];
        if (data) logs.push(data);
        console.log(...logs);
      });
    }
    const worker = new Worker(`
      const { parentPort } = require('worker_threads');
      parentPort.postMessage('hello from worker');
      parentPort.on('message', (message) => {
        console.log('message from main', message);
      });
    `, { eval: true });

    worker.on('message', (msg) => console.log("Worker message:", msg));
    worker.on('exit', () => console.log('Worker exited'));

    profiler.connect();
    await profiler.worker({ ms: 2000, });
    await async.pause(3000);
    await profiler.stop(key);
  });

  await afterEach(async () => {
    await profiler.disconnect();
  })
});
