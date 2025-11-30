'use strict';

class Counter {
  #value = 0;
  #name;

  constructor(name) {
    this.#name = name;
  }

  set(value) {
    value |= 0;
    this.#value = value;
  }

  get() {
    return this.#value;
  }

  increment(value = 1) {
    this.#value += value;
  }

  decrement(value = 1) {
    this.#value -= value;
  }

  reset() {
    this.#value = 0;
  }

  toString() {
    return this.#value.toString();
  }

  get name() {
    return this.#name;
  }
}

module.exports = Counter;