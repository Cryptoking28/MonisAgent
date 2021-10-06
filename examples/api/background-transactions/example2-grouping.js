/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const monisagent = require('monisagent')

const transactionName = 'myCustomTransaction'

// The second parameter to `startBackgroundTransaction` may be a group to
// organize related background transactions on APM. More on this can be found
// on our documentation website:
// https://docs.monisagent.com/docs/apm/applications-menu/monitoring/transactions-page#txn-type-dropdown
const groupName = 'myTransactionGroup'

monisagent.startBackgroundTransaction(transactionName, groupName, function handle() {
  const transaction = monisagent.getTransaction()
  doSomeWork(function cb() {
    transaction.end()
  })
})

/**
 * Function to simulate async work.
 *
 * @param callback
 */
function doSomeWork(callback) {
  setTimeout(function work() {
    callback()
  }, 500)
}
