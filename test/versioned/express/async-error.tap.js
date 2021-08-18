/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

var path = require('path')
var test = require('tap').test
var fork = require('child_process').fork

/*
 *
 * CONSTANTS
 *
 */
var COMPLETION = 27

test('Express async throw', function (t) {
  var erk = fork(path.join(__dirname, 'erk.js'))
  var timer

  erk.on('error', function (error) {
    t.fail(error)
    t.end()
  })

  erk.on('exit', function (code) {
    clearTimeout(timer)
    t.notEqual(code, COMPLETION, "request didn't complete")
    t.end()
  })

  // wait for the child vm to boot
  erk.on('message', function (message) {
    if (message === 'ready') {
      timer = setTimeout(function () {
        t.fail('hung waiting for exit')
        erk.kill()
      }, 1000)
      timer.unref()
      erk.send(COMPLETION)
    }
  })
})
