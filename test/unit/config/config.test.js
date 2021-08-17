/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const tap = require('tap')
const sinon = require('sinon')

const Config = require('../../../lib/config')

tap.test('should handle a directly passed minimal configuration', (t) => {
  let config
  t.doesNotThrow(function testInitialize() {
    config = Config.initialize({})
  })
  t.equal(config.agent_enabled, true)

  t.end()
})

tap.test('when loading invalid configuration file', (t) => {
  t.autoend()

  let realpathSyncStub
  const fsUnwrapped = require('../../../lib/util/unwrapped-core').fs

  t.beforeEach(() => {
    realpathSyncStub = sinon.stub(fsUnwrapped, 'realpathSync').callsFake(() => {
      return 'BadPath'
    })
  })

  t.afterEach(() => {
    realpathSyncStub.restore()
  })

  t.test(
    'should continue agent startup with config.monisagent_home property removed',
    (t) => {
      const Cornfig = require('../../../lib/config')
      let configuration

      t.doesNotThrow(function envTest() {
        configuration = Cornfig.initialize()
      })

      t.notOk(configuration.monisagent_home)

      t.end()
    }
  )
})

tap.test('when loading options via constructor', (t) => {
  t.autoend()

  t.test('should properly pick up on expected_messages', (t) => {
    const options = {
      expected_messages: {
        Error: ['oh no']
      }
    }

    const config = new Config({
      error_collector: options
    })

    t.same(config.error_collector.expected_messages, options.expected_messages)
    t.end()
  })

  t.test('should properly pick up on ignore_messages', (t) => {
    const options = {
      ignore_messages: {
        Error: ['oh no']
      }
    }

    const config = new Config({
      error_collector: options
    })

    t.same(config.error_collector.ignore_messages, options.ignore_messages)
    t.end()
  })

  t.test('should trim should trim spaces from license key', (t) => {
    const config = new Config({ license_key: ' license '})
    t.equal(config.license_key, 'license')

    t.end()
  })

  t.test('should have log aliases', (t) => {
    const config = new Config({'logging': {'level': 'verbose'}})
    t.equal(config.logging.level, 'trace')

    t.end()
  })
})

// TODO: extract to own test file
tap.test('when receiving server-side configuration', (t) => {
  t.autoend()

  let config

  t.beforeEach(() => {
    config = new Config()
  })

  t.test('should set the agent run ID', (t) => {
    config.onConnect({'agent_run_id': 1234})
    t.equal(config.run_id, 1234)

    t.end()
  })

  t.test('should set the account ID', (t) => {
    config.onConnect({'account_id': 76543})
    t.equal(config.account_id, 76543)

    t.end()
  })

  t.test('should set the application ID', (t) => {
    config.onConnect({'application_id': 76543})
    t.equal(config.application_id, 76543)

    t.end()
  })

  t.test('should always respect collect_traces', (t) => {
    t.equal(config.collect_traces, true)

    config.onConnect({'collect_traces': false})
    t.equal(config.collect_traces, false)

    t.end()
  })

  t.test('should disable the transaction tracer when told to', (t) => {
    t.equal(config.transaction_tracer.enabled, true)

    config.onConnect({'transaction_tracer.enabled': false})
    t.equal(config.transaction_tracer.enabled, false)

    t.end()
  })

  t.test('should always respect collect_errors', (t) => {
    t.equal(config.collect_errors, true)

    config.onConnect({'collect_errors': false})
    t.equal(config.collect_errors, false)

    t.end()
  })

  t.test('should always respect collect_span_events', (t) => {
    t.equal(config.collect_span_events, true)
    t.equal(config.span_events.enabled, true)

    config.onConnect({collect_span_events: false})
    t.equal(config.span_events.enabled, false)

    t.end()
  })

  t.test('should disable the error tracer when told to', (t) => {
    t.equal(config.error_collector.enabled, true)

    config.onConnect({'error_collector.enabled': false})
    t.equal(config.error_collector.enabled, false)

    t.end()
  })

  t.test('should set apdex_t', (t) => {
    t.equal(config.apdex_t, 0.1)

    config.on('apdex_t', (value) => {
      t.equal(value, 0.05)
      t.equal(config.apdex_t, 0.05)

      t.end()
    })

    config.onConnect({'apdex_t': 0.05})
  })

  t.test('should map transaction_tracer.transaction_threshold', (t) => {
    t.equal(config.transaction_tracer.transaction_threshold, 'apdex_f')

    config.onConnect({'transaction_tracer.transaction_threshold': 0.75})
    t.equal(config.transaction_tracer.transaction_threshold, 0.75)

    t.end()
  })

  t.test('should map URL rules to the URL normalizer', (t) => {
    config.on('url_rules', function(rules) {
      t.same(rules, [{name : 'sample_rule'}])
      t.end()
    })

    config.onConnect({'url_rules': [{name : 'sample_rule'}]})
  })

  t.test('should map metric naming rules to the metric name normalizer', (t) => {
    config.on('metric_name_rules', function(rules) {
      t.same(rules, [{name : 'sample_rule'}])
      t.end()
    })

    config.onConnect({'metric_name_rules': [{name : 'sample_rule'}]})
  })

  t.test('should map txn naming rules to the txn name normalizer', (t) => {
    config.on('transaction_name_rules', function(rules) {
      t.same(rules, [{name : 'sample_rule'}])
      t.end()
    })

    config.onConnect({'transaction_name_rules': [{name : 'sample_rule'}]})
  })

  t.test('should log the product level', (t) => {
    t.equal(config.product_level, 0)
    config.onConnect({'product_level': 30})

    t.equal(config.product_level, 30)
    t.end()
  })

  t.test('should reject high_security', (t) => {
    config.onConnect({'high_security': true})
    t.equal(config.high_security, false)

    t.end()
  })

  t.test('should configure cross application tracing', (t) => {
    t.equal(config.cross_application_tracer.enabled, true)

    config.onConnect({'cross_application_tracer.enabled': false})
    t.equal(config.cross_application_tracer.enabled, false)

    t.end()
  })

  t.test('should load named transaction apdexes', (t) => {
    const apdexes = {'WebTransaction/Custom/UrlGenerator/en/betting/Football' : 7.0}
    t.same(config.web_transactions_apdex, {})

    config.onConnect({'web_transactions_apdex': apdexes})
    t.same(config.web_transactions_apdex, apdexes)

    t.end()
  })

  t.test('should not configure record_sql', (t) => {
    t.equal(config.transaction_tracer.record_sql, 'off')

    config.onConnect({'transaction_tracer.record_sql': 'raw'})
    t.equal(config.transaction_tracer.record_sql, 'off')

    t.end()
  })

  t.test('should not configure explain_threshold', (t) => {
    t.equal(config.transaction_tracer.explain_threshold, 500)
    config.onConnect({'transaction_tracer.explain_threshold': 100})
    t.equal(config.transaction_tracer.explain_threshold, 500)

    t.end()
  })

  t.test('should not configure slow_sql.enabled', (t) => {
    t.equal(config.slow_sql.enabled, false)

    config.onConnect({'transaction_tracer.enabled': true})
    t.equal(config.slow_sql.enabled, false)

    t.end()
  })

  t.test('should not configure slow_sql.max_samples', (t) => {
    t.equal(config.slow_sql.max_samples, 10)

    config.onConnect({'transaction_tracer.max_samples': 5})
    t.equal(config.slow_sql.max_samples, 10)

    t.end()
  })

  t.test('should not blow up when sampling_rate is received', (t) => {
    t.doesNotThrow(() => {
      config.onConnect({'sampling_rate': 0})
    })

    t.end()
  })

  t.test('should not blow up when cross_process_id is received', (t) => {
    t.doesNotThrow(() => {
      config.onConnect({'cross_process_id': 'junk'})
    })

    t.end()
  })

  t.test('should not blow up with cross_application_tracer.enabled', (t) => {
    t.doesNotThrow(() => {
      config.onConnect({'cross_application_tracer.enabled': true})
    })

    t.end()
  })

  t.test('should not blow up when encoding_key is received', (t) => {
    t.doesNotThrow(() => {
      config.onConnect({'encoding_key': 'hamsnadwich'})
    })

    t.end()
  })

  t.test('should not blow up when trusted_account_ids is received', (t) => {
    t.doesNotThrow(() => {
      config.onConnect({'trusted_account_ids': [1, 2, 3]})
    })

    t.end()
  })

  t.test('should not blow up when trusted_account_key is received', (t) => {
    t.doesNotThrow(() => {
      config.onConnect({'trusted_account_key': 123})
    })

    t.end()
  })

  t.test('should not blow up when high_security is received', (t) => {
    t.doesNotThrow(() => {
      config.onConnect({'high_security': true})
    })

    t.end()
  })

  t.test('should not blow up when ssl is received', (t) => {
    t.doesNotThrow(() => {
      config.onConnect({'ssl': true})
    })

    t.end()
  })

  t.test('should not disable ssl', (t) => {
    t.doesNotThrow(() => {
      config.onConnect({'ssl': false})
    })
    t.equal(config.ssl, true)

    t.end()
  })

  t.test('should not blow up when transaction_tracer.record_sql is received', (t) => {
    t.doesNotThrow(() => {
      config.onConnect({'transaction_tracer.record_sql': true})
    })

    t.end()
  })

  t.test('should not blow up when slow_sql.enabled is received', (t) => {
    t.doesNotThrow(() => {
      config.onConnect({'slow_sql.enabled': true})
    })

    t.end()
  })

  t.test('should not blow up when rum.load_episodes_file is received', (t) => {
    t.doesNotThrow(() => {
      config.onConnect({'rum.load_episodes_file': true})
    })

    t.end()
  })

  t.test('should not blow up when beacon is received', (t) => {
    t.doesNotThrow(() => {
      config.onConnect({'beacon': 'beacon-0.monisagent.com'})
    })

    t.end()
  })

  t.test('should not blow up when beacon is received', (t) => {
    t.doesNotThrow(() => {
      config.onConnect({'error_beacon': null})
    })

    t.end()
  })

  t.test('should not blow up when js_agent_file is received', (t) => {
    t.doesNotThrow(() => {
      config.onConnect({'js_agent_file': 'jxc4afffef.js'})
    })

    t.end()
  })

  t.test('should not blow up when js_agent_loader_file is received', (t) => {
    t.doesNotThrow(() => {
      config.onConnect({'js_agent_loader_file': 'nr-js-bootstrap.js'})
    })

    t.end()
  })

  t.test('should not blow up when episodes_file is received', (t) => {
    t.doesNotThrow(() => {
      config.onConnect({'episodes_file': 'js-agent.monisagent.com/nr-100.js'})
    })

    t.end()
  })

  t.test('should not blow up when episodes_url is received', (t) => {
    t.doesNotThrow(() => {
      config.onConnect({'episodes_url': 'https://js-agent.monisagent.com/nr-100.js'})
    })

    t.end()
  })

  t.test('should not blow up when browser_key is received', (t) => {
    t.doesNotThrow(() => {
      config.onConnect({'browser_key': 'beefchunx'})
    })

    t.end()
  })

  t.test('should not blow up when collect_analytics_events is received', (t) => {
    config.transaction_events.enabled = true
    t.doesNotThrow(() => {
      config.onConnect({'collect_analytics_events': false})
    })
    t.equal(config.transaction_events.enabled, false)

    t.end()
  })

  t.test('should not blow up when transaction_events.enabled is received', (t) => {
    t.doesNotThrow(() => {
      config.onConnect({'transaction_events.enabled': false})
    })
    t.equal(config.transaction_events.enabled, false)

    t.end()
  })

  t.test('should override default max_payload_size_in_bytes', (t) => {
    t.doesNotThrow(() => {
      config.onConnect({max_payload_size_in_bytes: 100})
    })
    t.equal(config.max_payload_size_in_bytes, 100)

    t.end()
  })

  t.test('should not accept serverless_mode', (t) => {
    t.doesNotThrow(() => {
      config.onConnect({'serverless_mode.enabled': true})
    })
    t.equal(config.serverless_mode.enabled, false)

    t.end()
  })

  t.test('when handling embedded agent_config', (t) => {
    t.autoend()

    t.test('should not blow up when agent_config is passed in', (t) => {
      t.doesNotThrow(() => {
        config.onConnect({'agent_config': {}})
      })

      t.end()
    })

    t.test('should ignore status codes set on the server', (t) => {
      config.onConnect({'agent_config': {
        'error_collector.ignore_status_codes': [401, 409, 415]
      }})
      t.same(config.error_collector.ignore_status_codes, [404, 401, 409, 415])

      t.end()
    })

    t.test('should ignore status codes set on the server as strings', (t) => {
      config.onConnect({'agent_config': {
        'error_collector.ignore_status_codes': ['401', '409', '415']
      }})
      t.same(config.error_collector.ignore_status_codes, [404, 401, 409, 415])

      t.end()
    })

    t.test('should ignore status codes set on the server when using a range', (t) => {
      config.onConnect({'agent_config': {
        'error_collector.ignore_status_codes': [401, '420-421', 415, 'abc']
      }})
      t.same(config.error_collector.ignore_status_codes, [404, 401, 420, 421, 415])

      t.end()
    })

    t.test('should not add codes that parse to NaN', (t) => {
      config.onConnect({'agent_config': {
        'error_collector.ignore_status_codes': ['abc']
      }})
      t.same(config.error_collector.ignore_status_codes, [404])

      t.end()
    })

    t.test('should not ignore status codes from server with invalid range', (t) => {
      config.onConnect({'agent_config': {
        'error_collector.ignore_status_codes': ['421-420']
      }})
      t.same(config.error_collector.ignore_status_codes, [404])

      t.end()
    })

    t.test('should not ignore status codes from server if given out of range', (t) => {
      config.onConnect({'agent_config': {
        'error_collector.ignore_status_codes': ['1-1776']
      }})
      t.same(config.error_collector.ignore_status_codes, [404])

      t.end()
    })

    t.test('should ignore negative status codes from server', (t) => {
      config.onConnect({'agent_config': {
        'error_collector.ignore_status_codes': [-7]
      }})
      t.same(config.error_collector.ignore_status_codes, [404, -7])

      t.end()
    })
  })

  t.test('when event_harvest_config is set', (t) => {
    t.autoend()

    t.test('should emit event_harvest_config when harvest interval is changed', (t) => {
      const expectedHarvestConfig = {
        report_period_ms: 5000,
        harvest_limits: {
          analytic_event_data: 833,
          custom_event_data: 833,
          error_event_data: 8
        }
      }

      config.once('event_harvest_config', function(harvestconfig) {
        t.same(harvestconfig, expectedHarvestConfig)

        t.end()
      })

      config.onConnect({'event_harvest_config': expectedHarvestConfig})
    })

    t.test('should update event_harvest_config when a sub-value changed', (t) => {
      const originalHarvestConfig = {
        report_period_ms: 60000,
        harvest_limits: {
          analytic_event_data: 10000,
          custom_event_data: 10000,
          error_event_data: 100
        }
      }

      config.event_harvest_config = originalHarvestConfig

      const expectedHarvestConfig = {
        report_period_ms: 5000,
        harvest_limits: {
          analytic_event_data: 833,
          custom_event_data: 833,
          error_event_data: 8
        }
      }

      config.once('event_harvest_config', function(harvestconfig) {
        t.same(harvestconfig, expectedHarvestConfig)

        t.end()
      })

      config.onConnect({'event_harvest_config': expectedHarvestConfig})
    })
  })

  t.test('when apdex_t is set', (t) => {
    t.autoend()

    t.test('should emit `apdex_t` when apdex_t changes', (t) => {
      config.once('apdex_t', function(apdexT) {
        t.equal(apdexT, 0.75)

        t.end()
      })

      config.onConnect({'apdex_t': 0.75})
    })

    t.test('should update its apdex_t only when it has changed', (t) => {
      t.equal(config.apdex_t, 0.1)

      config.once('apdex_t', function() {
        throw new Error('should never get here')
      })

      config.onConnect({'apdex_t': 0.1})

      t.end()
    })
  })
})

tap.test('#publicSettings', (t) => {
  t.autoend()

  let configuration

  t.beforeEach(() => {
    configuration = Config.initialize({})

    // ensure environment is clean
    delete configuration.monisagent_home
  })

  t.afterEach(() => {
    configuration = null
  })

  t.test('should be able to create a flat JSONifiable version', (t) => {
    const pub = configuration.publicSettings()

    // The object returned from Config.publicSettings
    // should not have any values of type object
    for (let key in pub) {
      if (pub[key] !== null) {
        t.not(typeof pub[key], 'object')
      }
    }

    t.end()
  })

  t.test('should not return serialized attributeFilter object from publicSettings', (t) => {
    const pub = configuration.publicSettings()

    const result = Object.keys(pub).some((key) => {
      return key.includes('attributeFilter')
    })

    t.notOk(result)

    t.end()
  })

  t.test('should not return serialized mergeServerConfig props from publicSettings', (t) => {
    const pub = configuration.publicSettings()
    const result = Object.keys(pub).some((key) => {
      return key.includes('mergeServerConfig')
    })

    t.notOk(result)

    t.end()
  })

  t.test('should obfuscate certificates in publicSettings', (t) => {
    configuration = Config.initialize({
      certificates: ['some-pub-cert-1', 'some-pub-cert-2']
    })

    const publicSettings = configuration.publicSettings()

    t.equal(publicSettings['certificates.0'], '****')
    t.equal(publicSettings['certificates.1'], '****')

    t.end()
  })
})
