/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const tap = require('tap')
const configurator = require('../../../lib/config')
const Agent = require('../../../lib/agent')
const { getTestSecret } = require('../../helpers/secrets')

const license = getTestSecret('TEST_LICENSE')
tap.test('Collector API should connect to staging-collector.monisagent.com', (t) => {
  const config = configurator.initialize({
    app_name: 'node.js Tests',
    license_key: license,
    host: 'staging-collector.monisagent.com',
    port: 443,
    ssl: true,
    utilization: {
      detect_aws: false,
      detect_pcf: false,
      detect_gcp: false,
      detect_docker: false
    },
    logging: {
      level: 'trace'
    }
  })
  const agent = new Agent(config)
  const api = agent.collector

  api.connect(function (error, response) {
    t.error(error, 'connected without error')

    const returned = response && response.payload
    t.ok(returned, 'got boot configuration')
    t.ok(returned.agent_run_id, 'got run ID')
    t.ok(agent.config.run_id, 'run ID set in configuration')

    api.shutdown(function (error) {
      t.error(error, 'should have shut down without issue')
      t.notOk(agent.config.run_id, 'run ID should have been cleared by shutdown')

      agent.stop((err) => {
        t.error(err, 'should not fail to stop')
        t.end()
      })
    })
  })
})
