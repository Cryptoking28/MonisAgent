/*
 * Copyright 2023 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

function registerInstrumentation(agent) {
  const hooks = require('../../nr-hooks')
  hooks.forEach(agent.registerInstrumentation)
}

module.exports = {
  registerInstrumentation
}
