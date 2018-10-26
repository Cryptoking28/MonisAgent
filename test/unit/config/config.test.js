'use strict'

var path = require('path')
var chai = require('chai')
var should = chai.should()
var expect = chai.expect
var fs = require('fs')
var sinon = require('sinon')
var Config = require('../../../lib/config')
var securityPolicies = require('../../lib/fixtures').securityPolicies

function idempotentEnv(name, value, callback) {
  let saved = {}
  let envObj = null

  if (typeof name === 'object') {
    envObj = name
    callback = callback || value
  } else {
    envObj = {[name]: value}
  }

  Object.keys(envObj).forEach((key) => {
    // process.env is not a normal object
    if (Object.hasOwnProperty.call(process.env, key)) {
      saved[key] = process.env[key]
    }

    process.env[key] = envObj[key]
  })
  try {
    var tc = Config.initialize({})
    callback(tc)
  } finally {
    Object.keys(envObj).forEach((finalKey) => {
      if (saved[finalKey]) {
        process.env[finalKey] = saved[finalKey]
      } else {
        delete process.env[finalKey]
      }
    })
  }
}

describe('the agent configuration', function() {
  it('should handle a directly passed minimal configuration', function() {
    var c
    expect(function testInitialize() {
      c = Config.initialize({})
    }).not.throws()
    expect(c.agent_enabled).equal(true)
  })

  describe('when overriding configuration values via environment variables', function() {
    it('should pick up the application name', function() {
      idempotentEnv('NEW_RELIC_APP_NAME', 'feeling testy,and schizophrenic',
                    function(tc) {
        should.exist(tc.app_name)
        expect(tc.app_name).eql(['feeling testy', 'and schizophrenic'])
      })
    })

    it('should trim spaces from multiple application names ', function() {
      idempotentEnv(
        'NEW_RELIC_APP_NAME',
        'zero,one, two,  three,   four',
        function(tc) {
          should.exist(tc.app_name)
          expect(tc.app_name).eql(['zero', 'one', 'two', 'three', 'four'])
        }
      )
    })

    it('should pick up the license key', function() {
      idempotentEnv('NEW_RELIC_LICENSE_KEY', 'hambulance', function(tc) {
        should.exist(tc.license_key)
        expect(tc.license_key).to.equal('hambulance')
        expect(tc.host).to.equal('collector.monisagent.com')
      })
    })

    it('should pick up the collector host', function() {
      idempotentEnv('NEW_RELIC_HOST', 'localhost', function(tc) {
        should.exist(tc.host)
        expect(tc.host).equal('localhost')
      })
    })

    it('should parse the region off the license key', function() {
      idempotentEnv('NEW_RELIC_LICENSE_KEY', 'eu01xxhambulance', function(tc) {
        should.exist(tc.host)
        expect(tc.host).equal('collector.eu01.nr-data.net')
      })
    })

    it('should pick up the security policies token', function() {
      idempotentEnv( 'NEW_RELIC_SECURITY_POLICIES_TOKEN', 'super secure', function(tc) {
        should.exist(tc.security_policies_token)
        expect(tc.security_policies_token).equal('super secure')
      })
    })

    it('should take an explicit host over the license key parsed host', function() {
      idempotentEnv('NEW_RELIC_LICENSE_KEY', 'eu01xxhambulance', function() {
        idempotentEnv('NEW_RELIC_HOST', 'localhost', function(tc) {
          should.exist(tc.host)
          expect(tc.host).equal('localhost')
        })
      })
    })

    it('should pick up on feature flags set via environment variables', function() {
      const ffNamePrefix = 'NEW_RELIC_FEATURE_FLAG_'
      idempotentEnv(ffNamePrefix + 'AWAIT_SUPPORT', 'false', function(tc) {
        expect(tc.feature_flag.await_support).equal(false)
      })
    })

    it('should pick up the collector port', function() {
      idempotentEnv('NEW_RELIC_PORT', 7777, function(tc) {
        should.exist(tc.port)
        expect(tc.port).equal('7777')
      })
    })

    it('should pick up exception message omission settings', function() {
      idempotentEnv('NEW_RELIC_STRIP_EXCEPTION_MESSAGES_ENABLED', 'please', function(tc) {
        should.exist(tc.strip_exception_messages.enabled)
        expect(tc.strip_exception_messages.enabled).equal(true)
      })
    })

    it('should pick up the proxy host', function() {
      idempotentEnv('NEW_RELIC_PROXY_HOST', 'proxyhost', function(tc) {
        should.exist(tc.proxy_host)
        expect(tc.proxy_host).equal('proxyhost')
      })
    })

    it('should pick up on the DT env var', function() {
      idempotentEnv('NEW_RELIC_DISTRIBUTED_TRACING_ENABLED', 'true', function(tc) {
        expect(tc.distributed_tracing.enabled).equal(true)
      })
    })

    it('should pick up on the spans env var', function() {
      idempotentEnv('NEW_RELIC_SPAN_EVENTS_ENABLED', 'true', function(tc) {
        expect(tc.span_events.enabled).equal(true)
      })
    })

    it('should pick up the billing hostname', function() {
      idempotentEnv('NEW_RELIC_UTILIZATION_LOGICAL_PROCESSORS', 123, function(tc) {
        should.exist(tc.utilization.logical_processors)
        expect(tc.utilization.logical_processors).equal('123')
      })
    })

    it('should pick up the total ram of the system', function() {
      var env = 'NEW_RELIC_UTILIZATION_BILLING_HOSTNAME'
      idempotentEnv(env, 'a test string', function(tc) {
        should.exist(tc.utilization.billing_hostname)
        expect(tc.utilization.billing_hostname).equal('a test string')
      })
    })

    it('should pick up the number of logical processors of the system', function() {
      idempotentEnv('NEW_RELIC_UTILIZATION_TOTAL_RAM_MIB', 123, function(tc) {
        should.exist(tc.utilization.total_ram_mib)
        expect(tc.utilization.total_ram_mib).equal('123')
      })
    })

    it('should pick up the proxy port', function() {
      idempotentEnv('NEW_RELIC_PROXY_PORT', 7777, function(tc) {
        should.exist(tc.proxy_port)
        expect(tc.proxy_port).equal('7777')
      })
    })

    it('should pick up instance reporting', function() {
      var env = 'NEW_RELIC_DATASTORE_INSTANCE_REPORTING_ENABLED'
      idempotentEnv(env, false, function(tc) {
        should.exist(tc.datastore_tracer.instance_reporting.enabled)
        expect(tc.datastore_tracer.instance_reporting.enabled).equal(false)
      })
    })

    it('should pick up instance database name reporting', function() {
      var env = 'NEW_RELIC_DATASTORE_DATABASE_NAME_REPORTING_ENABLED'
      idempotentEnv(env, false, function(tc) {
        should.exist(tc.datastore_tracer.database_name_reporting.enabled)
        expect(tc.datastore_tracer.database_name_reporting.enabled).equal(false)
      })
    })

    it('should pick up the log level', function() {
      idempotentEnv('NEW_RELIC_LOG_LEVEL', 'XXNOEXIST', function(tc) {
        should.exist(tc.logging.level)
        expect(tc.logging.level).equal('XXNOEXIST')
      })
    })

    it('should have log level aliases', function() {
      var logAliases = {
        'verbose': 'trace',
        'debugging': 'debug',
        'warning': 'warn',
        'err': 'error'
      }
      for (var key in logAliases) { // eslint-disable-line guard-for-in
        idempotentEnv('NEW_RELIC_LOG_LEVEL', key, function(tc) {
          should.exist(tc.logging.level)
            expect(tc.logging.level).equal(logAliases[key])
        })
      }
    })

    it('should pick up the log filepath', function() {
      idempotentEnv('NEW_RELIC_LOG', '/highway/to/the/danger/zone', function(tc) {
        should.exist(tc.logging.filepath)
        expect(tc.logging.filepath).equal('/highway/to/the/danger/zone')
      })
    })

    it('should pick up whether server-side config is enabled', function() {
      idempotentEnv('NEW_RELIC_IGNORE_SERVER_CONFIGURATION', 'yeah', function(tc) {
        should.exist(tc.ignore_server_configuration)
        expect(tc.ignore_server_configuration).equal(true)
      })
    })

    it('should pick up whether the agent is enabled', function() {
      idempotentEnv('NEW_RELIC_ENABLED', 0, function(tc) {
        should.exist(tc.agent_enabled)
        expect(tc.agent_enabled).equal(false)
      })
    })

    it("should pick up whether to capture request parameters", function() {
      idempotentEnv('NEW_RELIC_CAPTURE_PARAMS', 'yes', function(tc) {
        should.exist(tc.capture_params)
        expect(tc.capture_params).equal(true)
      })
    })

    it('should pick up whether to capture attributes', function() {
      idempotentEnv('NEW_RELIC_ATTRIBUTES_ENABLED', 'yes', function(tc) {
        should.exist(tc.attributes.enabled)
        expect(tc.attributes.enabled).equal(true)
      })
    })

    it('should pick up whether to add attribute include rules', function() {
      idempotentEnv('NEW_RELIC_ATTRIBUTES_INCLUDE_ENABLED', 'yes', function(tc) {
        should.exist(tc.attributes.include_enabled)
        expect(tc.attributes.include_enabled).equal(true)
      })
    })

    it('should pick up ignored request parameters', function() {
      idempotentEnv('NEW_RELIC_IGNORED_PARAMS', 'one,two,three', function(tc) {
        should.exist(tc.ignored_params)
        expect(tc.ignored_params).eql(['one', 'two', 'three'])
      })
    })

    it('should pick up excluded attributes', function() {
      idempotentEnv('NEW_RELIC_ATTRIBUTES_EXCLUDE', 'one,two,three', function(tc) {
        should.exist(tc.attributes.exclude)
        expect(tc.attributes.exclude).eql(['one', 'two', 'three'])
      })
    })

    it('should pick up whether the error collector is enabled', function() {
      idempotentEnv('NEW_RELIC_ERROR_COLLECTOR_ENABLED', 'NO', function(tc) {
        should.exist(tc.error_collector.enabled)
        expect(tc.error_collector.enabled).equal(false)
      })
    })

    it('should pick up whether error collector attributes are enabled', function() {
      idempotentEnv('NEW_RELIC_ERROR_COLLECTOR_ATTRIBUTES_ENABLED', 'NO', function(tc) {
        should.exist(tc.error_collector.attributes.enabled)
        expect(tc.error_collector.attributes.enabled).equal(false)
      })
    })

    it('should pick up which status codes are ignored', function() {
      idempotentEnv(
        'NEW_RELIC_ERROR_COLLECTOR_IGNORE_ERROR_CODES',
        '401,404,502',
        function(tc) {
          should.exist(tc.error_collector.ignore_status_codes)
          expect(tc.error_collector.ignore_status_codes).eql([401, 404, 502])
      })
    })

    it('should pick up which status codes are ignored when using a range', function() {
      idempotentEnv(
        'NEW_RELIC_ERROR_COLLECTOR_IGNORE_ERROR_CODES',
        '401, 420-421, 502',
        function(tc) {
          should.exist(tc.error_collector.ignore_status_codes)
          expect(tc.error_collector.ignore_status_codes).eql([401, 420, 421, 502])
      })
    })

    it('should not add codes given with invalid range', function() {
      idempotentEnv(
        'NEW_RELIC_ERROR_COLLECTOR_IGNORE_ERROR_CODES',
        '421-420',
        function(tc) {
          should.exist(tc.error_collector.ignore_status_codes)
          expect(tc.error_collector.ignore_status_codes).eql([])
      })
    })

    it('should not add codes if given out of range', function() {
      idempotentEnv(
        'NEW_RELIC_ERROR_COLLECTOR_IGNORE_ERROR_CODES',
        '1 - 1776',
        function(tc) {
          should.exist(tc.error_collector.ignore_status_codes)
          expect(tc.error_collector.ignore_status_codes).eql([])
      })
    })

    it('should allow negative status codes ', function() {
      idempotentEnv(
        'NEW_RELIC_ERROR_COLLECTOR_IGNORE_ERROR_CODES',
        '-7',
        function(tc) {
          should.exist(tc.error_collector.ignore_status_codes)
          expect(tc.error_collector.ignore_status_codes).eql([-7])
      })
    })

    it('should not add codes that parse to NaN ', function() {
      idempotentEnv(
        'NEW_RELIC_ERROR_COLLECTOR_IGNORE_ERROR_CODES',
        'abc',
        function(tc) {
          should.exist(tc.error_collector.ignore_status_codes)
          expect(tc.error_collector.ignore_status_codes).eql([])
      })
    })

    it('should pick up whether the transaction tracer is enabled', function() {
      idempotentEnv('NEW_RELIC_TRACER_ENABLED', false, function(tc) {
        should.exist(tc.transaction_tracer.enabled)
        expect(tc.transaction_tracer.enabled).equal(false)
      })
    })

    it('should pick up whether transaction tracer attributes are enabled', function() {
      var key = 'NEW_RELIC_TRANSACTION_TRACER_ATTRIBUTES_ENABLED'
      idempotentEnv(key, false, function(tc) {
        should.exist(tc.transaction_tracer.attributes.enabled)
        expect(tc.transaction_tracer.attributes.enabled).equal(false)
      })
    })

    it('should pick up the transaction trace threshold', function() {
      idempotentEnv('NEW_RELIC_TRACER_THRESHOLD', 0.02, function(tc) {
        should.exist(tc.transaction_tracer.transaction_threshold)
        expect(tc.transaction_tracer.transaction_threshold).equal(0.02)
      })
    })

    it('should pick up the transaction trace Top N scale', function() {
      idempotentEnv('NEW_RELIC_TRACER_TOP_N', 5, function(tc) {
        should.exist(tc.transaction_tracer.top_n)
        expect(tc.transaction_tracer.top_n).equal('5')
      })
    })

    it('should pick up renaming rules', function() {
      idempotentEnv(
        'NEW_RELIC_NAMING_RULES',
        '{"name":"u","pattern":"^t"},{"name":"t","pattern":"^u"}',
        function(tc) {
          should.exist(tc.rules.name)
          expect(tc.rules.name).eql([
            {name: 'u', pattern: '^t'},
            {name: 't', pattern: '^u'},
          ])
        }
      )
    })

    it('should pick up ignoring rules', function() {
      idempotentEnv(
        'NEW_RELIC_IGNORING_RULES',
        '^/test,^/no_match,^/socket\\.io/,^/api/.*/index$',
        function(tc) {
          should.exist(tc.rules.ignore)
          expect(tc.rules.ignore).eql([
            '^/test',
            '^/no_match',
            '^/socket\\.io/',
            '^/api/.*/index$'
          ])
        }
      )
    })

    it('should pick up whether URL backstop has been turned off',
       function() {
      idempotentEnv('NEW_RELIC_ENFORCE_BACKSTOP', 'f', function(tc) {
        should.exist(tc.enforce_backstop)
        expect(tc.enforce_backstop).equal(false)
      })
    })

    it('should pick app name from APP_POOL_ID', function() {
      idempotentEnv('APP_POOL_ID', 'Simple Azure app', function(tc) {
        should.exist(tc.app_name)
        expect(tc.applications()).eql(['Simple Azure app'])
      })
    })

    it('should pick up labels', function() {
      idempotentEnv('NEW_RELIC_LABELS', 'key:value;a:b;', function(tc) {
        should.exist(tc.labels)
        expect(tc.labels).equal('key:value;a:b;')
      })
    })

    it('should pickup record_sql', function() {
      idempotentEnv('NEW_RELIC_RECORD_SQL', 'raw', function(tc) {
        should.exist(tc.transaction_tracer.record_sql)
        expect(tc.transaction_tracer.record_sql).equal('raw')
      })
    })

    it('should pickup explain_threshold', function() {
      idempotentEnv('NEW_RELIC_EXPLAIN_THRESHOLD', '100', function(tc) {
        should.exist(tc.transaction_tracer.explain_threshold)
        expect(tc.transaction_tracer.explain_threshold).equal(100)
      })
    })

    it('should pickup slow_sql.enabled', function() {
      idempotentEnv('NEW_RELIC_SLOW_SQL_ENABLED', 'true', function(tc) {
        should.exist(tc.labels)
        expect(tc.slow_sql.enabled).equal(true)
      })
    })

    it('should pickup slow_sql.max_samples', function() {
      idempotentEnv('NEW_RELIC_MAX_SQL_SAMPLES', '100', function(tc) {
        should.exist(tc.slow_sql.max_samples)
        expect(tc.slow_sql.max_samples).equal(100)
      })
    })

    it('should pick up logging.enabled', function() {
      idempotentEnv('NEW_RELIC_LOG_ENABLED', 'false', function(tc) {
        should.exist(tc.logging.enabled)
        expect(tc.logging.enabled).equal(false)
      })
    })

    it('should pick up message tracer segment reporting', function() {
      var env = 'NEW_RELIC_MESSAGE_TRACER_SEGMENT_PARAMETERS_ENABLED'
      idempotentEnv(env, false, function(tc) {
        should.exist(tc.message_tracer.segment_parameters.enabled)
        expect(tc.message_tracer.segment_parameters.enabled).equal(false)
      })
    })

    it('should pick up disabled utilization detection', function() {
      idempotentEnv('NEW_RELIC_UTILIZATION_DETECT_AWS', false, function(tc) {
        expect(tc.utilization.detect_aws).to.be.false
      })
    })

    it('should reject disabling ssl', function() {
      idempotentEnv('NEW_RELIC_USE_SSL', false, function(tc) {
        expect(tc.ssl).to.be.true
      })
    })

    it('should pick up serverless_mode', () => {
      idempotentEnv({
        NEW_RELIC_SERVERLESS_MODE: true,
        NEW_RELIC_FEATURE_FLAG_SERVERLESS_MODE: true
      }, (tc) => {
        expect(tc.serverless_mode).to.be.true
      })
    })

    it('should set serverless_mode from lambda-specific env var if not set by user',
      () => {
        idempotentEnv({
          AWS_LAMBDA_FUNCTION_NAME: 'someFunc',
          NEW_RELIC_FEATURE_FLAG_SERVERLESS_MODE: true
        }, (tc) => {
          expect(tc.serverless_mode).to.be.true
        })
      }
    )
  })

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

  describe('with both distributed_tracing and serverless_mode defined', () => {
    it('blows up if missing DT config environment variables', () => {
      expect(() => {
        Config.initialize({
          distributed_tracing: {enabled: true},
          serverless_mode: true,
          feature_flag: {
            serverless_mode: true
          }
        })
      }).throws()
    })

    it('works if all required env vars are defined', () => {
      const env = {
        NEW_RELIC_TRUSTED_ACCOUNT_KEY: 'defined',
        NEW_RELIC_ACCOUNT_ID: 'defined',
        NEW_RELIC_APPLICATION_ID: 'defined',
        NEW_RELIC_FEATURE_FLAG_SERVERLESS_MODE: true,
        NEW_RELIC_SERVERLESS_MODE: true,
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
        NEW_RELIC_APPLICATION_ID: 'defined',
        NEW_RELIC_FEATURE_FLAG_SERVERLESS_MODE: true,
        NEW_RELIC_DISTRIBUTED_TRACING_ENABLED: true
      }
      idempotentEnv(env, (tc) => {
        expect(tc.application_id).to.equal(null)
        expect(tc.account_id).to.equal(null)
        expect(tc.trusted_account_key).to.equal(null)
      })
    })
  })

  describe('with serverless_mode enabled', () => {
    it('should pick up trusted_account_key', () => {
      idempotentEnv({
        NEW_RELIC_SERVERLESS_MODE: true,
        NEW_RELIC_FEATURE_FLAG_SERVERLESS_MODE: true,
        NEW_RELIC_TRUSTED_ACCOUNT_KEY: '1234'
      }, (tc) => {
        console.log(process.env)
        expect(tc.trusted_account_key).to.equal('1234')
      })
    })

    it('should pick up application_id', () => {
      idempotentEnv({
        NEW_RELIC_SERVERLESS_MODE: true,
        NEW_RELIC_FEATURE_FLAG_SERVERLESS_MODE: true,
        NEW_RELIC_APPLICATION_ID: '5678'
      }, (tc) => {
        console.log(tc)
        expect(tc.application_id).to.equal('5678')
      })
    })

    it('should pick up account_id', () => {
      idempotentEnv({
        NEW_RELIC_SERVERLESS_MODE: true,
        NEW_RELIC_FEATURE_FLAG_SERVERLESS_MODE: true,
        NEW_RELIC_ACCOUNT_ID: '91011'
      }, (tc) => {
        expect(tc.account_id).to.equal('91011')
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

    it('should be able to create a flat JSONifiable version', function() {
      var pub = configuration.publicSettings()

      // The object returned from Config.publicSettings
      // should not have any values of type object
      for (var key in pub) {
        if (pub[key] !== null) {
          expect(typeof pub[key]).not.equal('object')
        }
      }
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

    it('should not ignore server-side configuration', function() {
      expect(configuration.ignore_server_configuration).equal(false)
    })

    it('should enable the agent', function() {
      expect(configuration.agent_enabled).equal(true)
    })

    it('should have an apdexT of 0.1', function() {
      expect(configuration.apdex_t).equal(0.1)
    })

    it('should not capture request parameters', function() {
      expect(configuration.capture_params).equal(false)
    })

    it('should have no ignored request parameters', function() {
      expect(configuration.ignored_params).eql([])
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
      expect(configuration.serverless_mode).to.be.false
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

    it('should map transaction naming rules to the transaction name normalizer',
       function(done) {
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

    it('should reject capture_params', function() {
      expect(config.capture_params).equal(false)
      config.onConnect({'capture_params': true})
      expect(config.capture_params).equal(false)
    })

    it('should configure ignored params', function() {
      expect(config.ignored_params).eql([])
      config.onConnect({'ignored_params': ['a', 'b']})
      expect(config.ignored_params).eql(['a', 'b'])
    })

    it('should configure ignored params without stomping local config', function() {
      config.ignored_params = ['b', 'c']
      config.onConnect({'ignored_params': ['a', 'b']})
      expect(config.ignored_params).eql(['b', 'c', 'a'])
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

    it('should not blow up when cross_application_tracing is received', function() {
      expect(function() {
        config.onConnect({'cross_application_tracing': true})
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

    it('should not blow up when collect_analytics_events is received',
    function() {
      config.transaction_events.enabled = true
      expect(function() {
        config.onConnect({'collect_analytics_events': false})
      }).not.throws()
      expect(config.transaction_events.enabled).equals(false)
    })

    it('should not blow up when transaction_events.max_samples_stored is received',
    function() {
      expect(function() {
        config.onConnect({'transaction_events.max_samples_stored': 10})
      }).not.throws()
      expect(config.transaction_events.max_samples_stored).equals(10)
    })

    it('should not blow up when transaction_events.max_samples_per_minute is received',
    function() {
      expect(function() {
        config.onConnect({'transaction_events.max_samples_per_minute': 1})
      }).not.throws()
      expect(config.transaction_events.max_samples_per_minute).equals(1)
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
        config.onConnect({serverless_mode: true})
      }).not.throws()
      expect(config.serverless_mode).to.be.false
    })

    describe('when data_report_period is set', function() {
      it('should emit data_report_period when harvest interval is changed',
         function(done) {
        config.once('data_report_period', function(harvestInterval) {
          expect(harvestInterval).equal(45)

          done()
        })

        config.onConnect({'data_report_period': 45})
      })

      it('should update data_report_period only when it is changed', function() {
        expect(config.data_report_period).equal(60)

        config.once('data_report_period', function() {
          throw new Error('should never get here')
        })

        config.onConnect({'data_report_period': 60})
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

  describe('when receiving server-side configuration while it is disabled', function() {
    var config

    beforeEach(function() {
      config = new Config()
      config.ignore_server_configuration = true
    })

    it('should still set rum properties', function() {
      config.onConnect({
        js_agent_loader      : 'LOADER',
        js_agent_file        : 'FILE',
        js_agent_loader_file : 'LOADER_FILE',
        beacon               : 'BEACON',
        error_beacon         : 'ERR_BEACON',
        browser_key          : 'KEY'
      })
      var bm = config.browser_monitoring

      expect(bm.js_agent_loader)      .equal ('LOADER')
      expect(bm.js_agent_file)        .equal ('FILE')
      expect(bm.js_agent_loader_file) .equal ('LOADER_FILE')
      expect(bm.beacon)               .equal ('BEACON')
      expect(bm.error_beacon)         .equal ('ERR_BEACON')
      expect(bm.browser_key)          .equal ('KEY')
    })

    it('should still set agent_run_id', function() {
      config.onConnect({'agent_run_id': 1234})
      expect(config.run_id).equal(1234)
    })

    it('should always respect collect_traces', function() {
      expect(config.collect_traces).equal(true)
      config.onConnect({'collect_traces': false})
      expect(config.collect_traces).equal(false)
    })

    it('should always respect collect_errors', function() {
      expect(config.collect_errors).equal(true)
      config.onConnect({'collect_errors': false})
      expect(config.collect_errors).equal(false)
    })

    it('should still log product_level', function() {
      expect(config.product_level).equal(0)
      config.onConnect({'product_level': 30})
      expect(config.product_level).equal(30)
    })

    it('should still pass url_rules to the URL normalizer', function(done) {
      config.on('url_rules', function(rules) {
        expect(rules).eql([{name : 'sample_rule'}])
        done()
      })

      config.onConnect({'url_rules': [{name : 'sample_rule'}]})
    })

    it('should still pass metric_name_rules to the metric name normalizer',
       function(done) {
      config.on('metric_name_rules', function(rules) {
        expect(rules).eql([{name : 'sample_rule'}])
        done()
      })

      config.onConnect({'metric_name_rules': [{name : 'sample_rule'}]})
    })

    it('should still pass transaction_name_rules to the transaction name normalizer',
       function(done) {
      config.on('transaction_name_rules', function(rules) {
        expect(rules).eql([{name : 'sample_rule'}])
        done()
      })

      config.onConnect({'transaction_name_rules': [{name : 'sample_rule'}]})
    })

    it('should not configure apdex_t', function() {
      expect(config.apdex_t).equal(0.1)
      config.on('apdex_t', function() { throw new Error('should not happen') })
      config.onConnect({'apdex_t': 0.05})
      expect(config.apdex_t).equal(0.1)
    })

    it('should not configure named transaction apdexes', function() {
      var apdexes = {'WebTransaction/Custom/UrlGenerator/en/betting/Football' : 7.0}
      expect(config.web_transactions_apdex).eql({})
      config.onConnect({'web_transactions_apdex': apdexes})
      expect(config.web_transactions_apdex).eql({})
    })

    it('should not configure data_report_period', function() {
      expect(config.data_report_period).equal(60)
      config.onConnect({'data_report_period': 45})
      expect(config.data_report_period).equal(60)
    })

    it('should not configure transaction_tracer.enabled', function() {
      expect(config.transaction_tracer.enabled).equal(true)
      config.onConnect({'transaction_tracer.enabled': false})
      expect(config.transaction_tracer.enabled).equal(true)
    })

    it('should not configure transaction_tracer.attributes.enabled', function() {
      expect(config.transaction_tracer.attributes.enabled).equal(true)
      config.onConnect({'transaction_tracer.attributes.enabled': false})
      expect(config.transaction_tracer.attributes.enabled).equal(true)
    })

    it('should not configure error_collector.enabled', function() {
      expect(config.error_collector.enabled).equal(true)
      config.onConnect({'error_collector.enabled': false})
      expect(config.error_collector.enabled).equal(true)
    })

    it('should not configure error_collector.attributes.enabled', function() {
      expect(config.error_collector.attributes.enabled).equal(true)
      config.onConnect({'error_collector.attributes.enabled': false})
      expect(config.error_collector.attributes.enabled).equal(true)
    })

    it('should not configure transaction_tracer.transaction_threshold', function() {
      expect(config.transaction_tracer.transaction_threshold).equal('apdex_f')
      config.onConnect({'transaction_tracer.transaction_threshold': 0.75})
      expect(config.transaction_tracer.transaction_threshold).equal('apdex_f')
    })

    it('should not configure capture_params', function() {
      expect(config.capture_params).equal(false)
      config.onConnect({'capture_params': true})
      expect(config.capture_params).equal(false)
    })

    it('should not configure attributes.enabled', function() {
      expect(config.attributes.enabled).to.be.true
      config.onConnect({'attributes.enabled': false})
      expect(config.attributes.enabled).to.be.true
    })

    it('should not configure ignored_params', function() {
      expect(config.ignored_params).eql([])
      config.onConnect({'ignored_params': ['a', 'b']})
      expect(config.ignored_params).eql([])
    })

    it('should not configure attributes.exclude', function() {
      expect(config.attributes.exclude).eql([])
      config.onConnect({'attributes.exclude': ['a', 'b']})
      expect(config.attributes.exclude).eql([])
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

    it('should ignore sampling_rate', function() {
      expect(function() {
        config.onConnect({'sampling_rate': 0})
      }).not.throws()
    })

    it('should ignore ssl', function() {
      expect(config.ssl).eql(true)
      expect(function() {
        config.onConnect({'ssl': false})
      }).not.throws()
      expect(config.ssl).eql(true)
    })

    it('should ignore cross_process_id', function() {
      expect(function() {
        config.onConnect({'cross_process_id': 'junk'})
      }).not.throws()
    })

    it('should ignore cross_application_tracing', function() {
      expect(function() {
        config.onConnect({'cross_application_tracing': true})
      }).not.throws()
    })

    it('should ignore encoding_key', function() {
      expect(function() {
        config.onConnect({'encoding_key': true})
      }).not.throws()
    })

    it('should ignore trusted_account_ids', function() {
      expect(config).to.have.property('trusted_account_ids', null)
      expect(function() {
        config.onConnect({'trusted_account_ids': [1, 2, 3]})
      }).to.not.throw()
      expect(config).to.have.property('trusted_account_ids').deep.equal([1, 2, 3])
    })

    it('should ignore trusted_account_key', function() {
      expect(config).to.have.property('trusted_account_key', null)
      expect(function() {
        config.onConnect({'trusted_account_key': 123})
      }).to.not.throw()
      expect(config).to.have.property('trusted_account_key', 123)
    })

    it('should ignore transaction_tracer.record_sql', function() {
      expect(function() {
        config.onConnect({'transaction_tracer.record_sql': true})
      }).not.throws()
    })

    it('should ignore slow_sql.enabled', function() {
      expect(function() {
        config.onConnect({'slow_sql.enabled': true})
      }).not.throws()
    })

    it('should ignore rum.load_episodes_file', function() {
      expect(function() {
        config.onConnect({'rum.load_episodes_file': true})
      }).not.throws()
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
    var config
    var policies
    var agent

    beforeEach(function(done) {
      agent = {
        _resetErrors: sinon.spy(),
        _resetCustomEvents: sinon.spy(),
        _resetQueries: sinon.spy(),
        traces: {
          reset: sinon.spy()
        }
      }
      agent.config = config = new Config()
      config.security_policies_token = 'TEST-TEST-TEST-TEST'
      policies = securityPolicies()
      done()
    })

    it('returns null if LASP is not enabled', function(done) {
      config.security_policies_token = ''

      var cb = function(err, res) {
        expect(err).to.be.null
        expect(res).to.be.null
        done()
      }

      config.applyLasp(agent, {}, cb)
    })

    it('returns error if required policy is not implemented or unknown', function(done) {
      var cb = function(err) {
        expect(err.message).to.contain('received one or more required security policies')
        done()
      }

      policies.job_arguments = { enabled: true, required: true }
      policies.test = { enabled: true, required: true }

      config.applyLasp(agent, policies, cb)
    })

    it('takes the most secure from local', function(done) {
      var cb = function(err, res) {
        expect(config.transaction_tracer.record_sql).to.equal('off')
        expect(agent._resetQueries.callCount).to.equal(0)
        expect(config.attributes.include_enabled).to.equal(false)
        expect(agent.traces.reset.callCount).to.equal(0)
        expect(config.strip_exception_messages.enabled).to.equal(true)
        expect(agent._resetErrors.callCount).to.equal(0)
        expect(config.api.custom_events_enabled).to.equal(false)
        expect(agent._resetCustomEvents.callCount).to.equal(0)
        expect(config.api.custom_attributes_enabled).to.equal(false)
        Object.keys(res).forEach(function checkPolicy(key) {
          expect(res[key].enabled).to.be.false
        })
        done()
      }

      config.transaction_tracer.record_sql = 'off'
      config.attributes.include_enabled = false
      config.strip_exception_messages.enabled = true
      config.api.custom_events_enabled = false
      config.api.custom_attributes_enabled = false

      Object.keys(policies).forEach(function enablePolicy(key) {
        policies[key].enabled = true
      })

      config.applyLasp(agent, policies, cb)
    })

    it('takes the most secure from lasp', function(done) {
      var cb = function(err, res) {
        expect(config.transaction_tracer.record_sql).to.equal('off')
        expect(agent._resetQueries.callCount).to.equal(1)
        expect(config.attributes.include_enabled).to.equal(false)
        expect(config.strip_exception_messages.enabled).to.equal(true)
        expect(agent._resetErrors.callCount).to.equal(1)
        expect(config.api.custom_events_enabled).to.equal(false)
        expect(agent._resetCustomEvents.callCount).to.equal(1)
        expect(config.api.custom_attributes_enabled).to.equal(false)
        expect(agent.traces.reset.callCount).to.equal(1)
        Object.keys(res).forEach(function checkPolicy(key) {
          expect(res[key].enabled).to.be.false
        })
        done()
      }

      config.transaction_tracer.record_sql = 'obfuscated'
      config.attributes.include_enabled = true
      config.strip_exception_messages.enabled = false
      config.api.custom_events_enabled = true
      config.api.custom_attributes_enabled = true

      Object.keys(policies).forEach(function enablePolicy(key) {
        policies[key].enabled = false
      })

      config.applyLasp(agent, policies, cb)
    })

    it('allow permissive settings', function(done) {
      var cb = function(err, res) {
        expect(config.transaction_tracer.record_sql).to.equal('obfuscated')
        expect(config.attributes.include_enabled).to.equal(true)
        expect(config.strip_exception_messages.enabled).to.equal(false)
        expect(config.api.custom_events_enabled).to.equal(true)
        expect(config.api.custom_attributes_enabled).to.equal(true)
        Object.keys(res).forEach(function checkPolicy(key) {
          expect(res[key].enabled).to.be.true
        })
        done()
      }

      config.transaction_tracer.record_sql = 'obfuscated'
      config.attributes.include_enabled = true
      config.strip_exception_messages.enabled = false
      config.api.custom_events_enabled = true
      config.api.custom_attributes_enabled = true

      Object.keys(policies).forEach(function enablePolicy(key) {
        policies[key].enabled = true
      })

      config.applyLasp(agent, policies, cb)
    })

    it('returns error if expected policy is not sent from server', function(done) {
      var cb = function(err) {
        expect(err.message).to.contain('did not receive one or more security policies')
        done()
      }

      delete policies.record_sql

      config.applyLasp(agent, policies, cb)
    })

    it('should return known policies', function(done) {
      var cb = function(err, res) {
        expect(err).to.be.null
        expect(res).to.deep.equal({
          record_sql: { enabled: false, required: false },
          attributes_include: { enabled: false, required: false },
          allow_raw_exception_messages: { enabled: false, required: false },
          custom_events: { enabled: false, required: false },
          custom_parameters: { enabled: false, required: false }
        })
        done()
      }

      config.applyLasp(agent, policies, cb)
    })
  })
})
