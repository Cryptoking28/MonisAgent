/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var monisagent = require('monisagent')
// Give the agent some time to start up.
setTimeout(runTest, 2000)

function runTest() {
  monisagent.startWebTransaction('Custom web transaction', function() {
    // Call monisagent.getTransaction to retrieve a handle on the current transaction.
    var transactionHandle = monisagent.getTransaction()

    // Generate the payload right before creating the linked transaction.
    var payload = transactionHandle.createDistributedTracePayload()
    var jsonPayload = payload.text()

    monisagent.startBackgroundTransaction('Background task', function executeTransaction() {
      var backgroundHandle = monisagent.getTransaction()
      // Link the nested transaction by accepting the payload with the background transaction's handle
      backgroundHandle.acceptDistributedTracePayload(jsonPayload)
      // End the transactions
      backgroundHandle.end(transactionHandle.end)
    })
  })
}
