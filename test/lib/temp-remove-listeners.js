/*
 * Copyright 2024 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

/**
 * Temporarily removes all event listeners on an emitter for a specific event
 * and re-adds them subsequent to a test completing.
 *
 * @param {object} params
 * @param params.t
 * @param {TestContext} t A `node:test` test context.
 * @param {EventEmitter} emitter The emitter to manipulate.
 * @param {string} event The event name to target.
 * @param params.emitter
 * @param params.event
 */
module.exports = function tempRemoveListeners({ t, emitter, event }) {
  if (!emitter) {
    return
  }

  const listeners = emitter.listeners(event)
  emitter.removeAllListeners(event)

  // We probably shouldn't be adding a `t.after` in this helper. There can only
  // be one `t.after` handler per test, and putting in here obscures the fact
  // that it has been added.
  t.after(() => {
    for (const l of listeners) {
      emitter.on(event, l)
    }
  })
}
