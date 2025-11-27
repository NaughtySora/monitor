'use strict';

const { Profiler } = require("../lib/Profiler/");

const main = async () => {
  const profiler = new Profiler();
  
  profiler.on('tracing:data', (data) => {
    console.dir(data, { depth: Infinity });
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
    .on('tracing:error', (e) => {
      console.error('tracing:error', e);
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

  // await profiler.tracing(
  //   {
  //     ms: 2000,
  //     categories: [
  //       'v8',
  //       'node',
  //       'node.async_hooks',
  //       'node.perf',
  //       'node.timers',
  //       'node.worker'
  //     ]
  //   }
  // );
  // await profiler.mem();
  // await profiler.cpu();

  // await async.pause(3000);
  // await profiler.stop('cpu');
  // await async.pause(3000);
  // await profiler.stop('mem');
  // await async.pause(3000);
  // await profiler.disconnect();
  // await profiler.stop('tracing');
};

main();


// const worker = new Worker(`
//   const { parentPort } = require('worker_threads');
//   parentPort.postMessage('hello from worker');
// `, { eval: true });

// worker.on('message', (msg) => console.log("Worker message:", msg));
// worker.on('exit', () => console.log('Worker exited'));