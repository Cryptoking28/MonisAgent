/*
 * Copyright 2023 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const monisagent = require('../../../index.js')

function greeter(name) {
  return `Hello ${name}`
}

if (monisagent.agent) {
  /* eslint-disable no-console */
  console.log(greeter(monisagent.agent.config.app_name))
  /* eslint-enable no-console */
}
