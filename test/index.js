'use strict';

const path = require("node:path");
const fs = require("node:fs");

for (const test of fs.readdirSync(__dirname)) {
  require(path.resolve(__dirname, test));
}