/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const tap = require('tap')
// TODO: convert to normal tap style.
// Below allows use of mocha DSL with tap runner.
tap.mochaGlobals()

const path = require('path')
const chai = require('chai')
const should = chai.should()
const expect = chai.expect
const fs = require('fs')
const sinon = require('sinon')
const Config = require('../../../lib/config')
const securityPolicies = require('../../lib/fixtures').securityPolicies

const VALID_HOST = 'infinite-tracing.test'
const VALID_PORT = '443'

tap.test('should handle a directly passed minimal configuration', (t) => {
  let config
  t.notThrow(function testInitialize() {
    config = Config.initialize({})
  })
  t.equal(config.agent_enabled, true)

  t.end()
})

describe('the agent configuration', function() {
  describe('with both high_security and security_policies_token defined', function() {
    it('blows up', function() {
      expect(function testInitialize() {
        Config.initialize({
          high_security: true,
          security_policies_token: 'fffff'
        })
      }).throws()
    })
  })

  describe('with a non-boolean truthy HSM setting', () => {
    it('should enable high security mode', () => {
      const applyHSM = Config.prototype._applyHighSecurity

      let hsmApplied = false
      Config.prototype._applyHighSecurity = () => {
        hsmApplied = true
      }
      const config = Config.initialize({
        high_security: 'true'
      })
      expect(!!config.high_security).to.be.true
      expect(hsmApplied).to.be.true

      Config.prototype._applyHighSecurity = applyHSM
    })
  })

  describe('when loading from a file', () => {
    describe('serverless mode', () => {
      it('should be false when config false', () => {
        const conf = Config.initialize({
          serverless_mode: {
            enabled: false
          },
        })
        expect(conf.serverless_mode.enabled).to.be.false
      })

      it('should be true when config true', () => {
        const conf = Config.initialize({
          serverless_mode: {
            enabled: true
          }
        })
        expect(conf.serverless_mode.enabled).to.be.true
      })
    })
  })

  describe('when distributed_tracing manually set in serverless_mode', () => {
    it('disables DT if missing required account_id', () => {
      const config = Config.initialize({
        distributed_tracing: {enabled: true},
        serverless_mode: {
          enabled: true
        },
        account_id: null
      })
      expect(config.distributed_tracing.enabled).to.be.false
    })

    it('disables DT when DT set to false', () => {
      const config = Config.initialize({
        distributed_tracing: {enabled: false},
        serverless_mode: {
          enabled: true
        },
      })
      expect(config.distributed_tracing.enabled).to.be.false
    })

    it('disables DT when DT set to false and account_id is set', () => {
      const config = Config.initialize({
        account_id: '1234',
        distributed_tracing: {enabled: false},
        serverless_mode: {
          enabled: true
        },
      })
      expect(config.distributed_tracing.enabled).to.be.false
    })

    it('works if all required env vars are defined', () => {
      const env = {
        NEW_RELIC_TRUSTED_ACCOUNT_KEY: 'defined',
        NEW_RELIC_ACCOUNT_ID: 'defined',
        NEW_RELIC_PRIMARY_APPLICATION_ID: 'defined',
        NEW_RELIC_SERVERLESS_MODE_ENABLED: true,
        NEW_RELIC_DISTRIBUTED_TRACING_ENABLED: true
      }
      expect(idempotentEnv.bind(idempotentEnv, env, () => {})).to.not.throw()
    })
  })

  describe('with serverless_mode disabled', () => {
    it('should clear serverless_mode dt config options', () => {
      const env = {
        NEW_RELIC_TRUSTED_ACCOUNT_KEY: 'defined',
        NEW_RELIC_ACCOUNT_ID: 'defined',
        NEW_RELIC_PRIMARY_APPLICATION_ID: 'defined',
        NEW_RELIC_DISTRIBUTED_TRACING_ENABLED: true
      }
      idempotentEnv(env, (tc) => {
        expect(tc.primary_application_id).to.equal(null)
        expect(tc.account_id).to.equal(null)
        expect(tc.trusted_account_key).to.equal(null)
      })
    })
  })

  describe('with serverless_mode enabled', () => {
    it('should explicitly disable cross_application_tracer', () => {
      const config = Config.initialize({
        cross_application_tracer: {enabled: true},
        serverless_mode: {
          enabled: true
        }
      })
      expect(config.cross_application_tracer.enabled).to.be.false
    })

    it('should explicitly disable infinite tracing', () => {
      const config = Config.initialize({
        serverless_mode: { enabled: true },
        infinite_tracing: { trace_observer: {
          host: VALID_HOST,
          port: VALID_PORT
        }}
      })

      expect(config.infinite_tracing.trace_observer.host).to.equal('')
    })

    it('should pick up trusted_account_key', () => {
      idempotentEnv({
        NEW_RELIC_SERVERLESS_MODE_ENABLED: true,
        NEW_RELIC_TRUSTED_ACCOUNT_KEY: '1234'
      }, (tc) => {
        expect(tc.trusted_account_key).to.equal('1234')
      })
    })

    it('should pick up primary_application_id', () => {
      idempotentEnv({
        NEW_RELIC_SERVERLESS_MODE_ENABLED: true,
        NEW_RELIC_PRIMARY_APPLICATION_ID: '5678'
      }, (tc) => {
        expect(tc.primary_application_id).to.equal('5678')
      })
    })

    it('should pick up account_id', () => {
      idempotentEnv({
        NEW_RELIC_SERVERLESS_MODE_ENABLED: true,
        NEW_RELIC_ACCOUNT_ID: '91011'
      }, (tc) => {
        expect(tc.account_id).to.equal('91011')
      })
    })

    it('should explicitly disable native_metrics when ' +
      'serverless mode disabled explicitly', () => {
      const config = Config.initialize({
        serverless_mode: {
          enabled: false
        },
        plugins: {
          native_metrics: {enabled: false}
        }
      })
      expect(config.plugins.native_metrics.enabled).to.be.false
    })

    it('should enable native_metrics when ' +
      'serverless mode disabled explicitly', () => {
      const config = Config.initialize({
        serverless_mode: {
          enabled: false
        }
      })
      expect(config.plugins.native_metrics.enabled).to.be.true
    })

    it('should disable native_metrics when ' +
    'serverless mode enabled explicitly', () => {
      const config = Config.initialize({
        serverless_mode: {
          enabled: true
        }
      })
      expect(config.plugins.native_metrics.enabled).to.be.false
    })

    describe('via configuration input', () => {
      it('should set DT config settings while in serverless_mode', () => {
        const config = Config.initialize({
          account_id: '1234',
          primary_application_id: '2345',
          serverless_mode: {enabled: true}
        })

        expect(config.account_id).to.equal('1234')
        expect(config.trusted_account_key).to.equal('1234')
      })

      it('should not set DT config settings while not in serverless_mode', () => {
        const config = Config.initialize({
          account_id: '1234',
          primary_application_id: '2345',
          trusted_account_key: '3456',
        })

        expect(config.account_id).to.be.null
        expect(config.primary_application_id).to.be.null
        expect(config.trusted_account_key).to.be.null
      })

      it('should enable native_metrics via config', () => {
        const config = Config.initialize({
          serverless_mode: {enabled: true},
          plugins: {
            native_metrics: {enabled: true}
          }
        })

        expect(config.plugins.native_metrics.enabled).to.be.true
      })

      it('should default logging to disabled', () => {
        const config = Config.initialize({
          serverless_mode: {enabled: true}
        })

        expect(config.logging.enabled).to.be.false
      })

      it('should allow logging to be enabled from configuration input', () => {
        const config = Config.initialize({
          serverless_mode: {enabled: true},
          logging: {enabled: true}
        })
        expect(config.logging.enabled).to.be.true
      })

      it('should allow logging to be enabled from env ', () => {
        const inputConfig = {
          serverless_mode: {enabled: true}
        }

        const envVariables = {
          NEW_RELIC_LOG_ENABLED: true
        }

        idempotentEnv(envVariables, inputConfig, (config) => {
          expect(config.logging.enabled).to.be.true
        })
      })
    })

    describe('via environment variables', () => {
      it('should default logging to disabled', () => {
        idempotentEnv({
          NEW_RELIC_SERVERLESS_MODE_ENABLED: true
        }, (config) => {
          expect(config.logging.enabled).to.be.false
        })
      })

      it('should allow logging to be enabled from env', () => {
        idempotentEnv({
          NEW_RELIC_SERVERLESS_MODE_ENABLED: true,
          NEW_RELIC_LOG_ENABLED: true
        }, (config) => {
          expect(config.logging.enabled).to.be.true
        })
      })

      it('should allow logging to be enabled from configuration ', () => {
        const envVariables = {
          NEW_RELIC_SERVERLESS_MODE_ENABLED: true
        }

        const inputConfig = {
          logging: {enabled: true}
        }

        idempotentEnv(envVariables, inputConfig, (config) => {
          expect(config.logging.enabled).to.be.true
        })
      })

      it('should enable native_metrics via env variable', () => {
        const envVariables = {
          NEW_RELIC_SERVERLESS_MODE_ENABLED: true,
          NEW_RELIC_NATIVE_METRICS_ENABLED: true
        }

        const inputConfig = {
          plugins: {
            native_metrics: {
              enabled: false
            }
          }
        }

        idempotentEnv(envVariables, inputConfig,
          (config) => {
            expect(config.plugins.native_metrics.enabled).to.be.true
          })
      })

      it('should default distributed to enabled when provided with account_id', () => {
        idempotentEnv({
          NEW_RELIC_SERVERLESS_MODE_ENABLED: true,
          NEW_RELIC_ACCOUNT_ID: '12345'
        }, (config) => {
          expect(config.distributed_tracing.enabled).to.be.true
        })
      })

      it('should allow distributed tracing to be enabled from env', () => {
        idempotentEnv({
          NEW_RELIC_SERVERLESS_MODE_ENABLED: true,
          NEW_RELIC_DISTRIBUTED_TRACING_ENABLED: true,
          NEW_RELIC_ACCOUNT_ID: '12345'
        }, (config) => {
          expect(config.distributed_tracing.enabled).to.be.true
        })
      })

      it('should allow distributed tracing to be enabled from configuration ', () => {
        const envVariables = {
          NEW_RELIC_SERVERLESS_MODE_ENABLED: true,
          NEW_RELIC_ACCOUNT_ID: '12345'
        }

        const inputConfig = {
          distributed_tracing: {enabled: true}
        }

        idempotentEnv(envVariables, inputConfig, (config) => {
          expect(config.distributed_tracing.enabled).to.be.true
        })
      })
    })
  })

  describe('with default properties', function() {
    var configuration

    before(function() {
      configuration = Config.initialize({})

      // ensure environment is clean
      delete configuration.monisagent_home
    })

    it('should have no application name', function() {
      expect(configuration.app_name).eql([])
    })

    it('should return no application name', function() {
      expect(configuration.applications()).eql([])
    })

    it('should have no application ID', function() {
      expect(configuration.application_id).eql(null)
    })

    it('should have no license key', function() {
      expect(configuration.license_key).equal('')
    })

    it('should connect to the collector at collector.monisagent.com', function() {
      expect(configuration.host).equal('collector.monisagent.com')
    })

    it('should connect to the collector on port 443', function() {
      expect(configuration.port).equal(443)
    })

    it('should have SSL enabled', function() {
      expect(configuration.ssl).equal(true)
    })

    it('should have no security_policies_token', function() {
      expect(configuration.security_policies_token).equal('')
    })

    it('should have no proxy host', function() {
      expect(configuration.proxy_host).equal('')
    })

    it('should have no proxy port', function() {
      expect(configuration.proxy_port).equal('')
    })

    it('should enable the agent', function() {
      expect(configuration.agent_enabled).equal(true)
    })

    it('should have an apdexT of 0.1', function() {
      expect(configuration.apdex_t).equal(0.1)
    })

    it('should have a null account_id', function() {
      expect(configuration.account_id).to.be.null
    })

    it('should have a null primary_application_id', function() {
      expect(configuration.primary_application_id).to.be.null
    })

    it('should have a null trusted_account_key', function() {
      expect(configuration.trusted_account_key).to.be.null
    })

    it('should have the default excluded request attributes', function() {
      expect(configuration.attributes.exclude).eql([])
    })

    it('should have the default attribute include setting', function() {
      expect(configuration.attributes.include_enabled).eql(true)
    })

    it('should have the default error message redaction setting ', function() {
      expect(configuration.strip_exception_messages.enabled).eql(false)
    })

    it('should enable transaction event attributes', function() {
      expect(configuration.transaction_events.attributes.enabled).equal(true)
    })

    it('should log at the info level', function() {
      expect(configuration.logging.level).equal('info')
    })

    it('should have a log filepath of process.cwd + monisagent_agent.log', function() {
      var logPath = path.join(process.cwd(), 'monisagent_agent.log')
      expect(configuration.logging.filepath).equal(logPath)
    })

    it('should enable the error collector', function() {
      expect(configuration.error_collector.enabled).equal(true)
    })

    it('should enable error collector attributes', function() {
      expect(configuration.error_collector.attributes.enabled).equal(true)
    })

    it('should ignore status code 404', function() {
      expect(configuration.error_collector.ignore_status_codes).eql([404])
    })

    it('should enable the transaction tracer', function() {
      expect(configuration.transaction_tracer.enabled).equal(true)
    })

    it('should enable transaction tracer attributes', function() {
      expect(configuration.transaction_tracer.attributes.enabled).equal(true)
    })

    it('should set the transaction tracer threshold to `apdex_f`', function() {
      expect(configuration.transaction_tracer.transaction_threshold).equal('apdex_f')
    })

    it('should collect one slow transaction trace per harvest cycle', function() {
      expect(configuration.transaction_tracer.top_n).equal(20)
    })

    it('should not record by default sql', function() {
      expect(configuration.transaction_tracer.record_sql).equal('off')
    })

    it('should have an explain threshold of 500ms', function() {
      expect(configuration.transaction_tracer.explain_threshold).equal(500)
    })

    it('should not capture slow queries', function() {
      expect(configuration.slow_sql.enabled).equal(false)
    })

    it('should capture a maximum of 10 slow-queries per harvest', function() {
      expect(configuration.slow_sql.max_samples).equal(10)
    })

    it('should have no naming rules', function() {
      expect(configuration.rules.name.length).equal(0)
    })

    it('should have one default ignoring rules', function() {
      expect(configuration.rules.ignore.length).equal(1)
    })

    it('should enforce URL backstop', function() {
      expect(configuration.enforce_backstop).equal(true)
    })

    it('should allow passed-in config to override errors ignored', function() {
      configuration = Config.initialize({
        error_collector : {
          ignore_status_codes : []
        }
      })

      expect(configuration.error_collector.ignore_status_codes).eql([])
    })

    it('should enable cross application tracer', function() {
      expect(configuration.cross_application_tracer.enabled).to.be.true
    })

    it('should enable message tracer segment parameters', function() {
      expect(configuration.message_tracer.segment_parameters.enabled).to.be.true
    })

    it('should not enable browser monitoring attributes', function() {
      expect(configuration.browser_monitoring.attributes.enabled).to.be.false
    })

    it('should enable browser monitoring attributes', function() {
      expect(configuration.browser_monitoring.attributes.enabled).equal(false)
    })

    it('should set max_payload_size_in_bytes', function() {
      expect(configuration.max_payload_size_in_bytes).to.equal(1000000)
    })

    it('should not enable serverless_mode', () => {
      expect(configuration.serverless_mode.enabled).to.be.false
    })
  })

  describe('when overriding the config file location via NR_HOME', function() {
    var origHome = null
    var startDir = null
    var DESTDIR = path.join(__dirname, 'xXxNRHOMETESTxXx')
    var NOPLACEDIR = path.join(__dirname, 'NOHEREHERECHAMP')
    var CONFIGPATH = path.join(DESTDIR, 'monisagent.js')


    beforeEach(function(done) {
      if (process.env.NEW_RELIC_HOME) {
        origHome = process.env.NEW_RELIC_HOME
      }

      startDir = process.cwd()

      fs.mkdir(DESTDIR, function(error) {
        if (error) return done(error)

        fs.mkdir(NOPLACEDIR, function(error) {
          if (error) return done(error)

          process.chdir(NOPLACEDIR)
          process.env.NEW_RELIC_HOME = DESTDIR

          var sampleConfig = fs.createReadStream(
            path.join(__dirname, '../../../lib/config/default.js')
          )
          var sandboxedConfig = fs.createWriteStream(CONFIGPATH)
          sampleConfig.pipe(sandboxedConfig)

          sandboxedConfig.on('close', function() { return done() })
        })
      })
    })

    afterEach(function(done) {
      if (origHome) {
        process.env.NEW_RELIC_HOME = origHome
      } else {
        delete process.env.NEW_RELIC_HOME
      }
      origHome = null

      fs.unlink(CONFIGPATH, function(error) {
        if (error) return done(error)

        fs.rmdir(DESTDIR, function(error) {
          if (error) return done(error)

          process.chdir(startDir)

          fs.rmdir(NOPLACEDIR, done)
        })
      })
    })

    it('should load the configuration', function() {
      expect(function() { Config.initialize() }).not.throws()
    })

    it('should export the home directory on the resulting object', function() {
      var configuration = Config.initialize()
      expect(configuration.monisagent_home).equal(DESTDIR)
    })

    it('should ignore the configuration file completely when so directed', function() {
      process.env.NEW_RELIC_NO_CONFIG_FILE = 'true'
      process.env.NEW_RELIC_HOME = '/xxxnoexist/nofile'

      var configuration
      expect(function envTest() {
        configuration = Config.initialize()
      }).not.throws()

      should.not.exist(configuration.monisagent_home)
      expect(configuration.error_collector &&
             configuration.error_collector.enabled).equal(true)

      delete process.env.NEW_RELIC_NO_CONFIG_FILE
      delete process.env.NEW_RELIC_HOME
    })
  })

  describe('Selecting config file path', () => {
    let origHome
    let originalWorkingDirectory
    const DESTDIR = path.join(__dirname, 'test_NEW_RELIC_CONFIG_FILENAME')
    const NOPLACEDIR = path.join(__dirname, 'test_NEW_RELIC_CONFIG_FILENAME_dummy')
    const MAIN_MODULE_DIR = path.join(__dirname, 'test_NEW_RELIC_CONFIG_FILENAME_MAIN_MODULE')
    let CONFIG_PATH
    let processMainModuleStub

    beforeEach(() => {
      if (process.env.NEW_RELIC_HOME) {
        origHome = process.env.NEW_RELIC_HOME
      }

      process.env.NEW_RELIC_HOME = DESTDIR

      originalWorkingDirectory = process.cwd()

      processMainModuleStub = sinon.stub(process, 'mainModule').value({
        filename: `${MAIN_MODULE_DIR}/index.js`
      })

      fs.mkdirSync(DESTDIR)
      fs.mkdirSync(NOPLACEDIR)
      fs.mkdirSync(MAIN_MODULE_DIR)

      process.chdir(NOPLACEDIR)
    })

    afterEach(() => {
      if (origHome) {
        process.env.NEW_RELIC_HOME = origHome
      } else {
        delete process.env.NEW_RELIC_HOME
      }
      origHome = null

      if (CONFIG_PATH) {
        fs.unlinkSync(CONFIG_PATH)
        CONFIG_PATH = undefined
      }

      processMainModuleStub.resetBehavior()

      fs.rmdirSync(DESTDIR)
      fs.rmdirSync(NOPLACEDIR)
      fs.rmdirSync(MAIN_MODULE_DIR)

      process.chdir(originalWorkingDirectory)
    })

    const createSampleConfig = (dir, filename) => {
      CONFIG_PATH = path.join(dir, filename)

      const config = {
        app_name: filename
      }

      fs.writeFileSync(CONFIG_PATH, `exports.config = ${JSON.stringify(config)}`)
    }

    it('should load the default monisagent.js config file', function() {
      const filename = "monisagent.js"
      createSampleConfig(DESTDIR, filename)

      const configuration = Config.initialize()
      expect(configuration.app_name).equal(filename)
    })

    it('should load the default monisagent.cjs config file', function() {
      const filename = "monisagent.cjs"
      createSampleConfig(DESTDIR, filename)

      const configuration = Config.initialize()
      expect(configuration.app_name).equal(filename)
    })

    it('should load config when overriding the default with NEW_RELIC_CONFIG_FILENAME', function() {
      const filename =  'some-file-name.js'
      process.env.NEW_RELIC_CONFIG_FILENAME = filename
      createSampleConfig(DESTDIR, filename)

      const configuration = Config.initialize()
      expect(configuration.app_name).equal(filename)
    })

    it('should load config from the main module\'s filepath', function() {
      const filename = 'monisagent.js'
      createSampleConfig(MAIN_MODULE_DIR, filename)

      const configuration = Config.initialize()
      expect(configuration.app_name).equal(filename)
    })
  })

  describe('when loading invalid configuration file', function() {
    let realpathSyncStub
    const fsUnwrapped = require('../../../lib/util/unwrapped-core').fs

    beforeEach(function() {
      realpathSyncStub = sinon.stub(fsUnwrapped, 'realpathSync').callsFake(() => {
        return 'BadPath'
      })
    })

    afterEach(function() {
      realpathSyncStub.restore()
    })

    it('should continue agent startup with config.monisagent_home property removed',
      function() {
        const Cornfig = require('../../../lib/config')
        let configuration
        expect(function envTest() {
          configuration = Cornfig.initialize()
        }).not.throws()

        should.not.exist(configuration.monisagent_home)
      })
  })

  describe('when loading options via constructor', function() {
    it('should properly pick up on expected_messages', function() {
      const options = {
        expected_messages: {
          Error: ['oh no']
        }
      }
      var config = new Config({
        error_collector: options
      })
      expect(config.error_collector.expected_messages).eql(options.expected_messages)
    })

    it('should properly pick up on ignore_messages', function() {
      const options = {
        ignore_messages: {
          Error: ['oh no']
        }
      }
      var config = new Config({
        error_collector: options
      })
      expect(config.error_collector.ignore_messages).eql(options.ignore_messages)
    })

    it('should trim should trim spaces from license key', () => {
      const config = new Config({ license_key: ' license '})
      expect(config.license_key).equals('license')
    })
  })

  describe('when setting log level via config constructor', function() {
    it('should have log aliases', function() {
      var config = new Config({'logging': {'level': 'verbose'}})
      expect(config.logging.level).equal('trace')
    })
  })

  describe('when receiving server-side configuration', function() {
    var config

    beforeEach(function() {
      config = new Config()
    })

    it('should set the agent run ID', function() {
      config.onConnect({'agent_run_id': 1234})
      expect(config.run_id).equal(1234)
    })

    it('should set the account ID', function() {
      config.onConnect({'account_id': 76543})
      expect(config).to.have.property('account_id', 76543)
    })

    it('should set the application ID', function() {
      config.onConnect({'application_id': 76543})
      expect(config).to.have.property('application_id', 76543)
    })

    it('should always respect collect_traces', function() {
      expect(config.collect_traces).equal(true)
      config.onConnect({'collect_traces': false})
      expect(config.collect_traces).equal(false)
    })

    it('should disable the transaction tracer when told to', function() {
      expect(config.transaction_tracer.enabled).equal(true)
      config.onConnect({'transaction_tracer.enabled': false})
      expect(config.transaction_tracer.enabled).equal(false)
    })

    it('should always respect collect_errors', function() {
      expect(config.collect_errors).equal(true)
      config.onConnect({'collect_errors': false})
      expect(config.collect_errors).equal(false)
    })

    it('should always respect collect_span_events', () => {
      expect(config.collect_span_events).equal(true)
      expect(config.span_events.enabled).equal(true)
      config.onConnect({collect_span_events: false})
      expect(config.span_events.enabled).equal(false)
    })

    it('should disable the error tracer when told to', function() {
      expect(config.error_collector.enabled).equal(true)
      config.onConnect({'error_collector.enabled': false})
      expect(config.error_collector.enabled).equal(false)
    })

    it('should set apdex_t', function() {
      expect(config.apdex_t).equal(0.1)
      config.on('apdex_t', function(value) { expect(value).equal(0.05) })
      config.onConnect({'apdex_t': 0.05})
      expect(config.apdex_t).equal(0.05)
    })

    it('should map transaction_tracer.transaction_threshold', function() {
      expect(config.transaction_tracer.transaction_threshold).equal('apdex_f')
      config.onConnect({'transaction_tracer.transaction_threshold': 0.75})
      expect(config.transaction_tracer.transaction_threshold).equal(0.75)
    })

    it('should map URL rules to the URL normalizer', function(done) {
      config.on('url_rules', function(rules) {
        expect(rules).eql([{name : 'sample_rule'}])
        done()
      })

      config.onConnect({'url_rules': [{name : 'sample_rule'}]})
    })

    it('should map metric naming rules to the metric name normalizer', function(done) {
      config.on('metric_name_rules', function(rules) {
        expect(rules).eql([{name : 'sample_rule'}])
        done()
      })

      config.onConnect({'metric_name_rules': [{name : 'sample_rule'}]})
    })

    it('should map txn naming rules to the txn name normalizer', (done) => {
      config.on('transaction_name_rules', function(rules) {
        expect(rules).eql([{name : 'sample_rule'}])
        done()
      })

      config.onConnect({'transaction_name_rules': [{name : 'sample_rule'}]})
    })

    it('should log the product level', function() {
      expect(config.product_level).equal(0)
      config.onConnect({'product_level': 30})
      expect(config.product_level).equal(30)
    })

    it('should reject high_security', function() {
      config.onConnect({'high_security': true})
      expect(config.high_security).equal(false)
    })

    it('should configure cross application tracing', function() {
      expect(config.cross_application_tracer.enabled).to.be.true
      config.onConnect({'cross_application_tracer.enabled': false})
      expect(config.cross_application_tracer.enabled).to.be.false
    })

    describe('when handling embedded agent_config', function() {
      it('should not blow up when agent_config is passed in', function() {
        expect(function() {
          config.onConnect({'agent_config': {}})
        }).not.throws()
      })

      it('should ignore status codes set on the server', function() {
        config.onConnect({'agent_config': {
          'error_collector.ignore_status_codes': [401, 409, 415]
        }})
        expect(config.error_collector.ignore_status_codes).eql([404, 401, 409, 415])
      })

      it('should ignore status codes set on the server as strings', function() {
        config.onConnect({'agent_config': {
          'error_collector.ignore_status_codes': ['401', '409', '415']
        }})
        expect(config.error_collector.ignore_status_codes).eql([404, 401, 409, 415])
      })

      it('should ignore status codes set on the server when using a range', function() {
        config.onConnect({'agent_config': {
          'error_collector.ignore_status_codes': [401, '420-421', 415, 'abc']
        }})
        expect(config.error_collector.ignore_status_codes).eql([404, 401, 420, 421, 415])
      })

      it('should not add codes that parse to NaN', function() {
        config.onConnect({'agent_config': {
          'error_collector.ignore_status_codes': ['abc']
        }})
        expect(config.error_collector.ignore_status_codes).eql([404])
      })

      it('should not ignore status codes from server with invalid range', function() {
        config.onConnect({'agent_config': {
          'error_collector.ignore_status_codes': ['421-420']
        }})
        expect(config.error_collector.ignore_status_codes).eql([404])
      })

      it('should not ignore status codes from server if given out of range', function() {
        config.onConnect({'agent_config': {
          'error_collector.ignore_status_codes': ['1-1776']
        }})
        expect(config.error_collector.ignore_status_codes).eql([404])
      })

      it('should ignore negative status codes from server', function() {
        config.onConnect({'agent_config': {
          'error_collector.ignore_status_codes': [-7]
        }})
        expect(config.error_collector.ignore_status_codes).eql([404, -7])
      })
    })

    it('should load named transaction apdexes', function() {
      var apdexes = {'WebTransaction/Custom/UrlGenerator/en/betting/Football' : 7.0}
      expect(config.web_transactions_apdex).eql({})
      config.onConnect({'web_transactions_apdex': apdexes})
      expect(config.web_transactions_apdex).eql(apdexes)
    })

    it('should not configure record_sql', function() {
      expect(config.transaction_tracer.record_sql).equal('off')
      config.onConnect({'transaction_tracer.record_sql': 'raw'})
      expect(config.transaction_tracer.record_sql).equal('off')
    })

    it('should not configure explain_threshold', function() {
      expect(config.transaction_tracer.explain_threshold).equal(500)
      config.onConnect({'transaction_tracer.explain_threshold': 100})
      expect(config.transaction_tracer.explain_threshold).equal(500)
    })

    it('should not configure slow_sql.enabled', function() {
      expect(config.slow_sql.enabled).equal(false)
      config.onConnect({'transaction_tracer.enabled': true})
      expect(config.slow_sql.enabled).equal(false)
    })

    it('should not configure slow_sql.max_samples', function() {
      expect(config.slow_sql.max_samples).equal(10)
      config.onConnect({'transaction_tracer.max_samples': 5})
      expect(config.slow_sql.max_samples).equal(10)
    })

    it('should not blow up when sampling_rate is received', function() {
      expect(function() {
        config.onConnect({'sampling_rate': 0})
      }).not.throws()
    })

    it('should not blow up when cross_process_id is received', function() {
      expect(function() {
        config.onConnect({'cross_process_id': 'junk'})
      }).not.throws()
    })

    it('should not blow up with cross_application_tracer.enabled', () => {
      expect(function() {
        config.onConnect({'cross_application_tracer.enabled': true})
      }).not.throws()
    })

    it('should not blow up when encoding_key is received', function() {
      expect(function() {
        config.onConnect({'encoding_key': 'hamsnadwich'})
      }).not.throws()
    })

    it('should not blow up when trusted_account_ids is received', function() {
      expect(function() {
        config.onConnect({'trusted_account_ids': [1, 2, 3]})
      }).to.not.throw()
    })

    it('should not blow up when trusted_account_key is received', function() {
      expect(function() {
        config.onConnect({'trusted_account_key': 123})
      }).to.not.throw()
    })

    it('should not blow up when high_security is received', function() {
      expect(function() {
        config.onConnect({'high_security': true})
      }).not.throws()
    })

    it('should not blow up when ssl is received', function() {
      expect(function() {
        config.onConnect({'ssl': true})
      }).not.throws()
    })

    it('should not disable ssl', function() {
      expect(function() {
        config.onConnect({'ssl': false})
      }).not.throws()
      expect(config.ssl).to.be.true
    })

    it('should not blow up when transaction_tracer.record_sql is received', function() {
      expect(function() {
        config.onConnect({'transaction_tracer.record_sql': true})
      }).not.throws()
    })

    it('should not blow up when slow_sql.enabled is received', function() {
      expect(function() {
        config.onConnect({'slow_sql.enabled': true})
      }).not.throws()
    })

    it('should not blow up when rum.load_episodes_file is received', function() {
      expect(function() {
        config.onConnect({'rum.load_episodes_file': true})
      }).not.throws()
    })

    it('should not blow up when beacon is received', function() {
      expect(function() {
        config.onConnect({'beacon': 'beacon-0.monisagent.com'})
      }).not.throws()
    })

    it('should not blow up when beacon is received', function() {
      expect(function() {
        config.onConnect({'error_beacon': null})
      }).not.throws()
    })

    it('should not blow up when js_agent_file is received', function() {
      expect(function() {
        config.onConnect({'js_agent_file': 'jxc4afffef.js'})
      }).not.throws()
    })

    it('should not blow up when js_agent_loader_file is received', function() {
      expect(function() {
        config.onConnect({'js_agent_loader_file': 'nr-js-bootstrap.js'})
      }).not.throws()
    })

    it('should not blow up when episodes_file is received', function() {
      expect(function() {
        config.onConnect({'episodes_file': 'js-agent.monisagent.com/nr-100.js'})
      }).not.throws()
    })

    it('should not blow up when episodes_url is received', function() {
      expect(function() {
        config.onConnect({'episodes_url': 'https://js-agent.monisagent.com/nr-100.js'})
      }).not.throws()
    })

    it('should not blow up when browser_key is received', function() {
      expect(function() {
        config.onConnect({'browser_key': 'beefchunx'})
      }).not.throws()
    })

    it('should not blow up when collect_analytics_events is received', () => {
      config.transaction_events.enabled = true
      expect(function() {
        config.onConnect({'collect_analytics_events': false})
      }).not.throws()
      expect(config.transaction_events.enabled).equals(false)
    })

    it('should not blow up when transaction_events.enabled is received', function() {
      expect(function() {
        config.onConnect({'transaction_events.enabled': false})
      }).not.throws()
      expect(config.transaction_events.enabled).equals(false)
    })

    it('should override default max_payload_size_in_bytes', function() {
      expect(function() {
        config.onConnect({max_payload_size_in_bytes: 100})
      }).not.throws()
      expect(config.max_payload_size_in_bytes).equals(100)
    })

    it('should not accept serverless_mode', () => {
      expect(() => {
        config.onConnect({'serverless_mode.enabled': true})
      }).not.throws()
      expect(config.serverless_mode.enabled).to.be.false
    })

    describe('when event_harvest_config is set', function() {
      it('should emit event_harvest_config when harvest interval is changed', (done) => {
        const expectedHarvestConfig = {
          report_period_ms: 5000,
          harvest_limits: {
            analytic_event_data: 833,
            custom_event_data: 833,
            error_event_data: 8
          }
        }

        config.once('event_harvest_config', function(harvestconfig) {
          expect(harvestconfig).deep.equal(expectedHarvestConfig)

          done()
        })

        config.onConnect({'event_harvest_config': expectedHarvestConfig})
      })

      it('should update event_harvest_config when a sub-value changed', (done) => {
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
          expect(harvestconfig).deep.equal(expectedHarvestConfig)

          done()
        })

        config.onConnect({'event_harvest_config': expectedHarvestConfig})
      })
    })

    describe('when apdex_t is set', function() {
      it('should emit `apdex_t` when apdex_t changes', function(done) {
        config.once('apdex_t', function(apdexT) {
          expect(apdexT).equal(0.75)

          done()
        })

        config.onConnect({'apdex_t': 0.75})
      })

      it('should update its apdex_t only when it has changed', function() {
        expect(config.apdex_t).equal(0.1)

        config.once('apdex_t', function() {
          throw new Error('should never get here')
        })

        config.onConnect({'apdex_t': 0.1})
      })
    })
  })

  describe('#_getMostSecure', function() {
    var config

    beforeEach(function(done) {
      config = new Config()
      config.security_policies_token = 'TEST-TEST-TEST-TEST'
      done()
    })

    it('returns the new value if the current one is undefined', function() {
      var val = config._getMostSecure('record_sql', undefined, 'off')
      expect(val).to.equal('off')
    })

    it('returns the most strict if it does not know either value', function() {
      var val = config._getMostSecure('record_sql', undefined, 'dunno')
      expect(val).to.equal('off')
    })

    it('should work as a pass through for unknown config options', function() {
      var val = config._getMostSecure('unknown.option', undefined, 'dunno')
      expect(val).to.equal('dunno')
    })
  })

  describe('#applyLasp', function() {
    let config = null
    let policies = null
    let agent = null

    beforeEach(function(done) {
      agent = {
        _resetErrors: sinon.spy(),
        _resetCustomEvents: sinon.spy(),
        _resetQueries: sinon.spy(),
        traces: {
          clear: sinon.spy()
        }
      }
      agent.config = config = new Config()
      config.security_policies_token = 'TEST-TEST-TEST-TEST'
      policies = securityPolicies()
      done()
    })

    it('returns null if LASP is not enabled', () => {
      config.security_policies_token = ''

      const res = config.applyLasp(agent, {})
      expect(res.payload).to.be.null
    })

    it('returns fatal response if required policy is not implemented or unknown', () => {
      policies.job_arguments = { enabled: true, required: true }
      policies.test = { enabled: true, required: true }

      const response = config.applyLasp(agent, policies)
      expect(response.shouldShutdownRun()).to.be.true
    })

    it('takes the most secure from local', () => {
      config.transaction_tracer.record_sql = 'off'
      config.attributes.include_enabled = false
      config.strip_exception_messages.enabled = true
      config.api.custom_events_enabled = false
      config.api.custom_attributes_enabled = false

      Object.keys(policies).forEach(function enablePolicy(key) {
        policies[key].enabled = true
      })

      const response = config.applyLasp(agent, policies)
      const payload = response.payload

      expect(config.transaction_tracer.record_sql).to.equal('off')
      expect(agent._resetQueries.callCount).to.equal(0)
      expect(config.attributes.include_enabled).to.equal(false)
      expect(agent.traces.clear.callCount).to.equal(0)
      expect(config.strip_exception_messages.enabled).to.equal(true)
      expect(agent._resetErrors.callCount).to.equal(0)
      expect(config.api.custom_events_enabled).to.equal(false)
      expect(agent._resetCustomEvents.callCount).to.equal(0)
      expect(config.api.custom_attributes_enabled).to.equal(false)
      Object.keys(payload).forEach(function checkPolicy(key) {
        expect(payload[key].enabled).to.be.false
      })
    })

    it('takes the most secure from lasp', () => {
      config.transaction_tracer.record_sql = 'obfuscated'
      config.attributes.include_enabled = true
      config.strip_exception_messages.enabled = false
      config.api.custom_events_enabled = true
      config.api.custom_attributes_enabled = true

      Object.keys(policies).forEach(function enablePolicy(key) {
        policies[key].enabled = false
      })

      const response = config.applyLasp(agent, policies)
      const payload = response.payload

      expect(config.transaction_tracer.record_sql).to.equal('off')
      expect(agent._resetQueries.callCount).to.equal(1)
      expect(config.attributes.include_enabled).to.equal(false)
      expect(config.attributes.exclude).to.deep.equal(['request.parameters.*'])
      expect(config.strip_exception_messages.enabled).to.equal(true)
      expect(agent._resetErrors.callCount).to.equal(1)
      expect(config.api.custom_events_enabled).to.equal(false)
      expect(agent._resetCustomEvents.callCount).to.equal(1)
      expect(config.api.custom_attributes_enabled).to.equal(false)
      expect(agent.traces.clear.callCount).to.equal(1)
      Object.keys(payload).forEach(function checkPolicy(key) {
        expect(payload[key].enabled).to.be.false
      })
    })

    it('allow permissive settings', () => {
      config.transaction_tracer.record_sql = 'obfuscated'
      config.attributes.include_enabled = true
      config.strip_exception_messages.enabled = false
      config.api.custom_events_enabled = true
      config.api.custom_attributes_enabled = true

      Object.keys(policies).forEach(function enablePolicy(key) {
        policies[key].enabled = true
      })

      const response = config.applyLasp(agent, policies)
      const payload = response.payload

      expect(config.transaction_tracer.record_sql).to.equal('obfuscated')
      expect(config.attributes.include_enabled).to.equal(true)
      expect(config.strip_exception_messages.enabled).to.equal(false)
      expect(config.api.custom_events_enabled).to.equal(true)
      expect(config.api.custom_attributes_enabled).to.equal(true)
      Object.keys(payload).forEach(function checkPolicy(key) {
        expect(payload[key].enabled).to.be.true
      })
    })

    it('returns fatal response if expected policy is not received', () => {
      delete policies.record_sql

      const response = config.applyLasp(agent, policies)
      expect(response.shouldShutdownRun()).to.be.true
    })

    it('should return known policies', () => {
      const response = config.applyLasp(agent, policies)
      expect(response.payload).to.deep.equal({
        record_sql: { enabled: false, required: false },
        attributes_include: { enabled: false, required: false },
        allow_raw_exception_messages: { enabled: false, required: false },
        custom_events: { enabled: false, required: false },
        custom_parameters: { enabled: false, required: false }
      })
    })
  })

  describe('#publicSettings', function() {
    let configuration

    beforeEach(function() {
      configuration = Config.initialize({})

      // ensure environment is clean
      delete configuration.monisagent_home
    })

    afterEach(() => {
      configuration = null
    })

    it('should be able to create a flat JSONifiable version', function() {
      const pub = configuration.publicSettings()

      // The object returned from Config.publicSettings
      // should not have any values of type object
      for (let key in pub) {
        if (pub[key] !== null) {
          expect(typeof pub[key]).not.equal('object')
        }
      }
    })

    it('should not return serialized attributeFilter object from publicSettings', () => {
      var pub = configuration.publicSettings()

      var result = Object.keys(pub).some((key) => {
        return key.includes('attributeFilter')
      })
      expect (result).to.be.false
    })

    it('should not return serialized mergeServerConfig props from publicSettings', () => {
      const pub = configuration.publicSettings()
      const result = Object.keys(pub).some((key) => {
        return key.includes('mergeServerConfig')
      })
      expect(result).to.be.false
    })

    it('should obfuscate certificates in publicSettings', () => {
      configuration = Config.initialize({
        certificates: ['some-pub-cert-1', 'some-pub-cert-2']
      })

      const publicSettings = configuration.publicSettings()

      expect(publicSettings['certificates.0']).to.equal('****')
      expect(publicSettings['certificates.1']).to.equal('****')
    })
  })
})

function idempotentEnv(envConfig, initialConfig, callback) {
  let saved = {}

  // Allow idempotentEnv to be called w/o initialConfig
  if (typeof initialConfig === 'function') {
    callback = initialConfig
    initialConfig = {}
  }

  Object.keys(envConfig).forEach((key) => {
    // process.env is not a normal object
    if (Object.hasOwnProperty.call(process.env, key)) {
      saved[key] = process.env[key]
    }

    process.env[key] = envConfig[key]
  })
  try {
    const tc = Config.initialize(initialConfig)
    callback(tc)
  } finally {
    Object.keys(envConfig).forEach((finalKey) => {
      if (saved[finalKey]) {
        process.env[finalKey] = saved[finalKey]
      } else {
        delete process.env[finalKey]
      }
    })
  }
}
