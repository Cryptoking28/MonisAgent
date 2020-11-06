/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const monisagent = require('monisagent')

// Give the agent some time to start up.
setTimeout(runTest, 2000)

function runTest() {
  monisagent.startWebTransaction('Custom web transaction', function() {
    // Call monisagent.getTransaction to retrieve a handle on the current transaction.
    let transactionHandle = monisagent.getTransaction()

    // Generate the payload right before creating the linked transaction.
    let headers = {}
    transactionHandle.insertDistributedTraceHeaders(headers)

    monisagent.startBackgroundTransaction('Background task', function executeTransaction() {
      let backgroundHandle = monisagent.getTransaction()
      // Link the nested transaction by accepting the payload with the background transaction's handle
      backgroundHandle.acceptDistributedTraceHeaders(headers)
      // End the transactions
      backgroundHandle.end(transactionHandle.end)
    })
  })
}
