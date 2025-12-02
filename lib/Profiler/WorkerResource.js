
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

module.exports = class WorkerResource {
  constructor() {
    throw new Error('Class isn\'t implemented yet');
  }
};