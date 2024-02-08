/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const Aggregator = require('./base-aggregator')

class TraceAggregator extends Aggregator {
  constructor(opts, collector, harvester) {
    super(opts, collector, harvester)
  }
}

module.exports = TraceAggregator
