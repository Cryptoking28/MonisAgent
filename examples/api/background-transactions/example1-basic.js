/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

var monisagent = require('monisagent')

var transactionName = 'myCustomTransaction'

// `startBackgroundTransaction()` takes a name, group, and a handler function to
// execute. The group is optional. The last parameter is the function performing
// the work inside the transaction. Once the transaction starts, there are
// three ways to end it:
//
// 1) Call `transaction.end()`. The `transaction` can be received by calling
//    `monisagent.getTransaction()` first thing in the handler function. Then,
//    when you call `transaction.end()` timing will stop.
// 2) Return a promise. The transaction will end when the promise resolves or
//    rejects.
// 3) Do neither. If no promise is returned, and `getTransaction()` isn't
//    called, the transaction will end immediately after the handle returns.

// Here is an example for the first case.
monisagent.startBackgroundTransaction(transactionName, function handle() {
  var transaction = monisagent.getTransaction()
  doSomeWork(function cb() {
    transaction.end()
  })
})

// Function to simulate async work.
function doSomeWork(callback) {
  setTimeout(function work() {
    callback()
  }, 500)
}
