'use strict';

var path   = require('path')
  , chai   = require('chai')
  , should = chai.should()
  , expect = chai.expect
  , fs     = require('fs')
  , logger = require(path.join(__dirname, '..',
                               'lib', 'logger')).child({component : 'TEST'})
  , Config = require(path.join(__dirname, '..', 'lib', 'config'))
  ;

function idempotentEnv(name, value, callback) {
  var is, saved;

  // process.env is not a normal object
  if (Object.hasOwnProperty.call(process.env, name)) {
    is = true;
    saved = process.env[name];
  }

  process.env[name] = value;
  try {
    var tc = Config.initialize(logger);
    callback(tc);
  }
  catch (error) {
    throw error;
  }
  finally {
    if (is) {
      process.env[name] = saved;
    }
    else {
      delete process.env[name];
    }
  }
}

describe("the agent configuration", function () {
  it("should handle a directly passed minimal configuration", function () {
    var c;
    expect(function testInitialize() {
      c = Config.initialize(logger, {config : {}});
    }).not.throws();
    expect(c.agent_enabled).equal(true);
  });

  describe("when overriding configuration values via environment variables", function () {
    it("should pick up the application name", function () {
      idempotentEnv('NEW_RELIC_APP_NAME', 'feeling testy,and schizophrenic',
                    function (tc) {
        should.exist(tc.app_name);
        expect(tc.app_name).eql(['feeling testy', 'and schizophrenic']);
      });
    });

    it("should pick up the license key", function () {
      idempotentEnv('NEW_RELIC_LICENSE_KEY', 'hambulance', function (tc) {
        should.exist(tc.license_key);
        expect(tc.license_key).equal('hambulance');
      });
    });

    it("should pick up the collector host", function () {
      idempotentEnv('NEW_RELIC_HOST', 'localhost', function (tc) {
        should.exist(tc.host);
        expect(tc.host).equal('localhost');
      });
    });

    it("should pick up the collector port", function () {
      idempotentEnv('NEW_RELIC_PORT', 7777, function (tc) {
        should.exist(tc.port);
        expect(tc.port).equal('7777');
      });
    });

    it("should pick up the proxy host", function () {
      idempotentEnv('NEW_RELIC_PROXY_HOST', 'proxyhost', function (tc) {
        should.exist(tc.proxy_host);
        expect(tc.proxy_host).equal('proxyhost');
      });
    });

    it("should pick up the proxy port", function () {
      idempotentEnv('NEW_RELIC_PROXY_PORT', 7777, function (tc) {
        should.exist(tc.proxy_port);
        expect(tc.proxy_port).equal('7777');
      });
    });

    it("should pick up the log level", function () {
      idempotentEnv('NEW_RELIC_LOG_LEVEL', 'XXNOEXIST', function (tc) {
        should.exist(tc.logging.level);
        expect(tc.logging.level).equal('XXNOEXIST');
      });
    });

    it("should pick up the log filepath", function () {
      idempotentEnv('NEW_RELIC_LOG', '/highway/to/the/danger/zone', function (tc) {
        should.exist(tc.logging.filepath);
        expect(tc.logging.filepath).equal('/highway/to/the/danger/zone');
      });
    });

    it("should pick up whether the agent is enabled", function () {
      idempotentEnv('NEW_RELIC_ENABLED', 0, function (tc) {
        should.exist(tc.agent_enabled);
        expect(tc.agent_enabled).equal(false);
      });
    });

    it("should pick up whether the apdexT is set", function () {
      idempotentEnv('NEW_RELIC_APDEX', 0.666, function (tc) {
        should.exist(tc.apdex_t);
        expect(tc.apdex_t).equal('0.666');
      });
    });

    it("should pick up whether the error collector is enabled", function () {
      idempotentEnv('NEW_RELIC_ERROR_COLLECTOR_ENABLED', 'NO', function (tc) {
        should.exist(tc.error_collector.enabled);
        expect(tc.error_collector.enabled).equal(false);
      });
    });

    it("should pick up which status codes are ignored", function () {
      idempotentEnv('NEW_RELIC_ERROR_COLLECTOR_IGNORE_ERROR_CODES',
                    '401,404,502', function (tc) {
        should.exist(tc.error_collector.ignore_status_codes);
        expect(tc.error_collector.ignore_status_codes).eql(['401', '404', '502']);
      });
    });

    it("should pick up whether the transaction tracer is enabled", function () {
      idempotentEnv('NEW_RELIC_TRACER_ENABLED', false, function (tc) {
        should.exist(tc.transaction_tracer.enabled);
        expect(tc.transaction_tracer.enabled).equal(false);
      });
    });

    it("should pick up the transaction trace threshold", function () {
      idempotentEnv('NEW_RELIC_TRACER_THRESHOLD', 0.02, function (tc) {
        should.exist(tc.transaction_tracer.trace_threshold);
        expect(tc.transaction_tracer.trace_threshold).equal('0.02');
      });
    });

    it("should pick up the transaction trace Top N scale", function () {
      idempotentEnv('NEW_RELIC_TRACER_TOP_N', 20, function (tc) {
        should.exist(tc.transaction_tracer.trace_threshold);
        expect(tc.transaction_tracer.top_n).equal('20');
      });
    });

    it("should pick up whether internal metrics are enabled", function () {
      idempotentEnv('NEW_RELIC_DEBUG_METRICS', true, function (tc) {
        should.exist(tc.debug.internal_metrics);
        expect(tc.debug.internal_metrics).equal(true);
      });
    });

    it("should pick up whether tracing of the transaction tracer is enabled",
       function () {
      idempotentEnv('NEW_RELIC_DEBUG_TRACER', 'yup', function (tc) {
        should.exist(tc.debug.tracer_tracing);
        expect(tc.debug.tracer_tracing).equal(true);
      });
    });

    it("should pick up renaming rules", function () {
      idempotentEnv(
        'NEW_RELIC_NAMING_RULES',
        '{"name":"u","pattern":"^t"},{"name":"t","pattern":"^u"}',
        function (tc) {
          should.exist(tc.rules.name);
          expect(tc.rules.name).eql([
            {name : 'u', pattern : '^t'},
            {name : 't', pattern : '^u'},
          ]);
        }
      );
    });

    it("should pick up ignoring rules", function () {
      idempotentEnv(
        'NEW_RELIC_IGNORING_RULES',
        '^/test,^/no_match,^/socket\\.io/,^/api/.*/index$',
        function (tc) {
          should.exist(tc.rules.ignore);
          expect(tc.rules.ignore).eql([
            '^/test',
            '^/no_match',
            '^/socket\\.io/',
            '^/api/.*/index$'
          ]);
        }
      );
    });

    it("should pick up whether URL backstop has been turned off",
       function () {
      idempotentEnv('NEW_RELIC_ENFORCE_BACKSTOP', 'f', function (tc) {
        should.exist(tc.enforce_backstop);
        expect(tc.enforce_backstop).equal(false);
      });
    });
  });

  describe("with default properties", function () {
    var configuration;

    before(function () {
      configuration = Config.initialize(logger, {config : {}});

      // ensure environment is clean
      delete configuration.monisagent_home;
    });

    it("should have an app name of ['MyApplication']", function () {
      expect(configuration.app_name).eql(['MyApplication']);
    });

    it("should connect to the collector at collector.monisagent.com", function () {
      expect(configuration.host).equal('collector.monisagent.com');
    });

    it("should connect to the collector on port 80", function () {
      expect(configuration.port).equal(80);
    });

    it("should have no proxy host", function () {
      expect(configuration.proxy_host).equal('');
    });

    it("should have no proxy port", function () {
      expect(configuration.proxy_port).equal('');
    });

    it("should log at the info level", function () {
      expect(configuration.logging.level).equal('info');
    });

    it("should have a log filepath of process.cwd + monisagent_agent.log", function () {
      var logPath = path.join(process.cwd(), 'monisagent_agent.log');
      expect(configuration.logging.filepath).equal(logPath);
    });

    it("should enable the agent", function () {
      expect(configuration.agent_enabled).equal(true);
    });

    it("should have an apdexT of 0.5", function () {
      expect(configuration.apdex_t).equal(0.5);
    });

    it("should enable the error collector", function () {
      expect(configuration.error_collector.enabled).equal(true);
    });

    it("should ignore status code 404", function () {
      expect(configuration.error_collector.ignore_status_codes).eql([404]);
    });

    it("should enable the transaction tracer", function () {
      expect(configuration.transaction_tracer.enabled).equal(true);
    });

    it("should set the transaction tracer threshold to 'apdex_f'", function () {
      expect(configuration.transaction_tracer.trace_threshold).equal('apdex_f');
    });

    it("should collect one slow transaction trace per harvest cycle", function () {
      expect(configuration.transaction_tracer.top_n).equal(1);
    });

    it("should have no naming rules", function () {
      expect(configuration.rules.name.length).equal(0);
    });

    it("should have no ignoring rules", function () {
      expect(configuration.rules.ignore.length).equal(0);
    });

    it("should enforce URL backstop", function () {
      expect(configuration.enforce_backstop).equal(true);
    });
  });

  describe("when overriding the config file location via NR_HOME", function () {
    var origHome
      , startDir
      , DESTDIR = path.join(__dirname, 'xXxNRHOMETESTxXx')
      , NOPLACEDIR = path.join(__dirname, 'NOHEREHERECHAMP')
      , CONFIGPATH = path.join(DESTDIR, 'monisagent.js')
      ;

    beforeEach(function (done) {
      if (process.env.NEW_RELIC_HOME) {
        origHome = process.env.NEW_RELIC_HOME;
      }

      startDir = process.cwd();

      fs.mkdir(DESTDIR, function (error) {
        if (error) return done(error);

        fs.mkdir(NOPLACEDIR, function (error) {
          if (error) return done(error);

          process.chdir(NOPLACEDIR);
          process.env.NEW_RELIC_HOME = DESTDIR;

          var sampleConfig = fs.createReadStream(path.join(__dirname, '..',
                                                           'lib', 'config.default.js'));
          var sandboxedConfig = fs.createWriteStream(CONFIGPATH);
          sampleConfig.pipe(sandboxedConfig);

          sandboxedConfig.on('close', function () { return done(); });
        });
      });
    });

    afterEach(function (done) {
      if (origHome) {
        process.env.NEW_RELIC_HOME = origHome;
      }
      else {
        delete process.env.NEW_RELIC_HOME;
      }
      origHome = null;

      fs.unlink(CONFIGPATH, function (error) {
        if (error) return done(error);

        fs.rmdir(DESTDIR, function (error) {
          if (error) return done(error);

          process.chdir(startDir);

          fs.rmdir(NOPLACEDIR, done);
        });
      });
    });

    it("should load the configuration", function () {
      expect(function () { Config.initialize(logger); }).not.throws();
    });

    it("should export the home directory on the resulting object", function () {
      var configuration = Config.initialize(logger);
      expect(configuration.monisagent_home).equal(DESTDIR);
    });

    it("should ignore the configuration file completely when so directed", function () {
      process.env.NEW_RELIC_NO_CONFIG_FILE = 'true';
      process.env.NEW_RELIC_HOME = '/xxxnoexist/nofile';

      var configuration;
      expect(function envTest() {
        configuration = Config.initialize(logger);
      }).not.throws();

      should.not.exist(configuration.monisagent_home);
      expect(configuration.error_collector &&
             configuration.error_collector.enabled).equal(true);
    });
  });

  describe("when handling a response from the collector", function () {
    var config;

    beforeEach(function () {
      config = new Config();
    });

    it("should set a run ID when one is received", function () {
      config.onConnect({'agent_run_id' : 1234});
      expect(config.run_id).equal(1234);
    });

    it("should emit an event when harvest interval is changed");
    it("should disable the transaction tracer when the server says to (collect_traces)");
    it("should disable the transaction tracer when the server says to (transaction_tracer.enabled)");
    it("should disable the error tracer when the server says to (collect_errors)");
    it("should disable the error tracer when the server says to (error_collector.enabled)");
    it("should map transaction_tracer.transaction_threshold correctly");
    it("should map the product level to a human-readable string");
    it("should map URL rules to the URL normalizer");
    it("should map metric rules to the metric name normalizer");
    it("should map transaction rules to the transaction name normalizer");
    it("should configure param capture (capture_params)");

    it("shouldn't blow up when cross_process_id is received");
    it("shouldn't blow up when cross_application_tracing is received");
    it("shouldn't blow up when encoding_key is received");
    it("shouldn't blow up when trusted_account_ids is received");
    it("shouldn't blow up when high_security is received");
    it("shouldn't blow up when ssl is received");
    it("shouldn't blow up when transaction_tracer.record_sql is received");
    it("shouldn't blow up when slow_sql.enabled is received");
    it("shouldn't blow up when rum.load_episodes_file is received");

    describe("when apdexT comes in", function () {
      it("should update its apdexT only when it's changed");
      it("should emit an apdexT event when apdex_t changes");
    });
  });
});
