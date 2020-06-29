/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

var monisagent = require('monisagent')

var transactionName = 'myCustomTransaction'

// The second parameter to `startBackgroundTransaction` may be a group to
// organize related background transactions on APM. More on this can be found
// on our documentation website:
// https://docs.monisagent.com/docs/apm/applications-menu/monitoring/transactions-page#txn-type-dropdown
var groupName = 'myTransactionGroup'

monisagent.startBackgroundTransaction(transactionName, groupName, function handle() {
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
