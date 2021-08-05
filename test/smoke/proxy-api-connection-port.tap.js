/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const tap = require('tap')
const join = require('path').join
const https = require('https')
const proxySetup = require('@monisagent/proxy')
const read = require('fs').readFileSync
const configurator = require('../../lib/config')
const Agent = require('../../lib/agent')
const CollectorAPI = require('../../lib/collector/api')
const { getTestSecret } = require('../helpers/secrets')
const { SSL_HOST } = require('../lib/agent_helper')

let port = 0
const SSL_CONFIG = {
  key: read(join(__dirname, '../lib/test-key.key')),
  cert: read(join(__dirname, '../lib/self-signed-test-certificate.crt'))
}
const license = getTestSecret('TEST_LICENSE')

tap.test('setting proxy_port should use the proxy agent', (t) => {
  const server = proxySetup(https.createServer(SSL_CONFIG))

  server.listen(0, () => {
    port = server.address().port
    const config = configurator.initialize({
      app_name: 'node.js Tests',
      license_key: license,
      host: 'staging-collector.monisagent.com',
      port: 443,
      proxy_host: SSL_HOST,
      proxy_port: port,
      ssl: true,
      utilization: {
        detect_aws: false,
        detect_pcf: false,
        detect_azure: false,
        detect_gcp: false,
        detect_docker: false
      },
      logging: {
        level: 'trace'
      },
      certificates: [read(join(__dirname, '..', 'lib', 'ca-certificate.crt'), 'utf8')]
    })
    const agent = new Agent(config)
    const api = new CollectorAPI(agent)

    api.connect((error, response) => {
      t.notOk(error, 'connected without error')

      const returned = response && response.payload
      t.ok(returned, 'got boot configuration')
      t.ok(returned.agent_run_id, 'got run ID')
      t.ok(agent.config.run_id, 'run ID set in configuration')

      api.shutdown((error) => {
        t.notOk(error, 'should have shut down without issue')
        t.notOk(agent.config.run_id, 'run ID should have been cleared by shutdown')

        server.close()
        t.end()
      })
    })
  })
})
