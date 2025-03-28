/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'
const test = require('node:test')
const assert = require('node:assert')
const configurator = require('../../../lib/config')
const Agent = require('../../../lib/agent')
const CollectorAPI = require('../../../lib/collector/api')
const { getTestSecret } = require('../../helpers/secrets')

const license = getTestSecret('TEST_LICENSE')
test('Collector API should send metrics to staging-collector.monisagent.com', (t, end) => {
  const config = configurator.initialize({
    app_name: 'node.js Tests',
    license_key: license,
    host: 'staging-collector.monisagent.com',
    port: 443,
    ssl: true,
    utilization: {
      detect_aws: false,
      detect_azure: false,
      detect_pcf: false,
      detect_gcp: false,
      detect_docker: false
    },
    logging: {
      level: 'trace'
    }
  })
  const agent = new Agent(config)
  const api = new CollectorAPI(agent)

  api.connect(function (error) {
    assert.ok(!error, 'connected without error')

    agent.metrics.measureMilliseconds('TEST/discard', null, 101)

    const metrics = agent.metrics._metrics

    const metricJson = metrics.toJSON()
    assert.ok(metricJson.length >= 2, 'Should have at least two metrics.')

    const payload = [agent.config.run_id, metrics.started / 1000, Date.now() / 1000, metrics]

    api.send('metric_data', payload, function (error, command) {
      assert.ok(!error, 'sent metrics without error')
      assert.ok(command, 'got a response')

      assert.deepEqual(command, { retainData: false })
      end()
    })
  })
})
