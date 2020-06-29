/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

var monisagent = require('monisagent')

// Segments can only be created inside of transactions. They could be automatically
// generated HTTP transactions or custom transactions.
monisagent.startBackgroundTransaction('bg-tx', function transHandler() {
  var tx = monisagent.getTransaction()

  // `startSegment()` takes a segment name, a boolean if a metric should be
  // created for this segment, the handler function, and an optional callback.
  // The handler is the function that will be wrapped with the new segment. When
  // a callback is provided, the segment timing will end when the callback is
  // called.

  monisagent.startSegment('myCustomSegment', false, someTask, function cb(err, output) {
    // Handle the error and output as appropriate.
    console.log(output)
    tx.end()
  })
})

function someTask(cb) {
  myAsyncTask(function firstCb(err, result) {
    if (err) {
      return cb(err)
    }

    myNextTask(result, function secondCb(err, output) {
      cb(err, output)
    })
  })
}
