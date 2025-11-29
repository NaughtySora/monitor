'use strict';

const { createServer } = require("node:http");
const { logger } = require("naughty-util");

// tcp proxy for tracking drop event, close, error, listening, connection events
// two separated purposes, track http server tcp layer drop event
// track tcp server itself

// Network I/O, make server proxy, tcp|http|udp ? 
const server = createServer();
//? report server closed
// server.on("close", logger.info.bind(null, 'close: '));

server.on("connect", logger.info.bind(null, 'connect: '));
//? append to start of the listeners queue, reporting client error, allowing http framework close the socket
// server.on('clientError', (err, socket) => {// });

//? get tcp socket before processing request, should not headers/body here
// server.on("connection", (socket) => {});

//? report when max requests limit per socket is breached and requests start dropping
server.on("dropRequest", logger.info.bind(null, 'dropRequest: '));

//? emits every request to http server, (req, res), append to start of the queue to report request data and allow client application to user server according to normal flow
server.on("request", (req, res) => {
  logger.log('url: ', req.url);
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.end("ok");
});

//? report when server upgrades its protocol
server.on("upgrade", logger.info.bind(null, 'upgrade: '));

//? server error
server.on("error", logger.info.bind(null, 'error: '));

//? server started
server.on("listening", logger.info.bind(null, 'listening: '));

server.listen(3000);

// CPU
// RAM
// Disk I/O


// const perf = require("node:perf_hooks");
// const v8 = require("node:v8");
// const reporter = require("node:test/reporters");
// const util = require("node:util");
// const diagnostics_ = require("node:diagnostics_channel");
// const { Session, } = require("node:inspector/promises");
// const Module = require("node:module");
// const os = require("node:os");
// const trace = require("node:trace_events");
// const threads = require("node:worker_threads");
// const { async } = require("naughty-util");
// const { EventEmitter } = require("node:events");
// process