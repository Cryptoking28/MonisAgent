/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

var monisagent = require('monisagent')

var transactionName = 'myCustomTransaction'

// The return value of the handle is passed back from `startBackgroundTransaction`.
var result = monisagent.startBackgroundTransaction(transactionName, function handle() {
  return 42
})

console.log(result) // Prints "42"
