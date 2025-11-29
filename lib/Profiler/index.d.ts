import { EventEmitter } from "node:events";
import { Session } from "node:inspector";

// options for TracingResource


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

interface Options {
  ms?: number;
}

type Categories = Set<>;

interface TrackingOptions extends Options {
  categories: ('v8' | 'node' | 'node.async_hooks' | 'node.perf' | 'node.timers' | 'node.worker')[];
}

type Post = InstanceType<typeof Session>["post"];

// type Key = "cpu" | "mem" | "tracing" | "worker";
type Key = "cpu" | "mem" | "tracing";
export class Profiler extends EventEmitter {
  connect(): void;
  post: Post;
  notify: EventEmitter["emit"];
  disconnect(): Promise<void>;
  subscribe(): EventEmitter["once"];
  cpu(options: Options): Promise<void>;
  mem(options: Options): Promise<void>;
  tracing(options: TrackingOptions): Promise<void>;
  // worker(options): Promise<void>;
  [Symbol.asyncDispose](): Promise<void>;
  stop(key: Key): Promise<void>;
}

const p = new Profiler();