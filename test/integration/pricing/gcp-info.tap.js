/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

var tap = require('tap')


tap.test('pricing gcp info', function(t) {
  require('./vendor-info-tests')(t, 'gcp')
})
