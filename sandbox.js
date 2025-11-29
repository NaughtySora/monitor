'use strict';

const { Session } = require('inspector');
const { logger } = require('naughty-util');
const { Worker, parentPort, isMainThread } = require('worker_threads');

(async () => {
  if (isMainThread) {
    const worker = new Worker(__filename);
    worker.on('error', (err) => {
      logger.error(err);
      process.exit(1);
    });
    worker.on('exit', logger.log.bind(null, '[worker]: exited: '));
    worker.on('message', logger.log.bind(null, '[worker]: message: '));
    worker.on('online', logger.log.bind(null, '[worker]: online: '));
  } else {
    const noop = () => { };
    parentPort.once('message', noop);
    const errBack = (err, data) => {
      if (err) logger.error(err);
      if (JSON.stringify(data) !== '{}') logger.log(data);
    };
    const session = new Session();
    let sessionId;
    let id = 1;
    session.connectToMainThread();
    const sendMessage = (method, params) => {
      session.post('NodeWorker.sendMessageToWorker', {
        sessionId,
        message: JSON.stringify({
          id: id++,
          method,
          params,
        })
      }, errBack);
    };
    session.on("NodeWorker.attachedToWorker", async (data) => {
      logger.log("[session]:attached: ", data);
      sessionId = data.params.sessionId;
      sendMessage('Debugger.enable');
      sendMessage('NodeRuntime.notifyWhenWaitingForDisconnect', { enabled: true });
      sendMessage('Runtime.runIfWaitingForDebugger');
    });
    session.on("NodeWorker.detachedFromWorker", (data) => {
      logger.log('[session]:detached: ', data);
    });
    session.on("NodeWorker.receivedMessageFromWorker", (data) => {
      logger.log('[session]:message: ', data);
    });
    session.post('NodeWorker.enable', { waitForDebuggerOnStart: false }, errBack);
    // setTimeout(() => {
    //   session.post('NodeWorker.detach', { sessionId }, errBack);
    //   parentPort.off('message', noop);
    //   session.post("NodeWorker.disable", errBack);
    // }, 1000);
  }
})()