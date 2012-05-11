var path    = require('path')
  , fs      = require('fs')
  , events  = require('events')
  , util    = require('util')
  , stats   = require(path.join(__dirname, 'stats'))
  , service = require(path.join(__dirname, 'service'))
  , metric  = require(path.join(__dirname, 'metric'))
  , error   = require(path.join(__dirname, 'error'))
  , trace   = require(path.join(__dirname, 'trace'))
  , logger  = require(path.join(__dirname, 'logger'))
  , sampler = require(path.join(__dirname, 'sampler'))
  , shimmer     = require(path.join(__dirname, 'shimmer'))
  ;

function noop() {}

var agent;
var invocationOptions;

function Agent(options) {
  events.EventEmitter.call(this);

  // MonisAgentService
  var self = this
    , instrumentation = []
    , harvestIntervalId
    ;

  try {
    self.config = require('./config').initialize(logger);
  }
  catch (e) {
    logger.error(e);
    self.start = function () { return false; };
    self.stop = noop;
    return false;
  }

  logger.setLevel(self.config.log_level || 'info');

  self.options = options || {};
  self.environment = require('./environment');
  self.version = self.config.version;

  self.metricNormalizer = new metric.MetricNormalizer(logger);
  self.errorService = new error.ErrorService(logger, self.config);
  self.statsEngine = new stats.StatsEngine(logger);

  self.config.on('change', self.statsEngine.onConnect.bind(self.statsEngine));

  function connect() {
    setTimeout(function () { doConnect(); }, self.applicationPort ? 0 : 1000);
  }

  function doConnect() {
    if (self.connection) return;

    // Allow the connection to be mocked externally
    var connection = self.connection = self.options.connection || service.createMonisAgentService(self);

    // add listeners
    connection.on('connect',            self.config.onConnect.bind(self.config));
    connection.on('connect',            self.metricNormalizer.parseMetricRules.bind(self.metricNormalizer));
    connection.on('metricDataError',    self.statsEngine.mergeMetricData.bind(self.statsEngine));
    connection.on('metricDataResponse', self.statsEngine.parseMetricIds.bind(self.statsEngine));
    connection.on('errorDataError',     self.errorService.onSendError.bind(self.errorService));
    connection.on('connectError',       function (error) {
      setTimeout(function () {
        logger.error("An error occurred connecting to " + self.config.host + ":" + self.config.port + " - " + error);
        connect();
      }, 15 * 1000);
    });

    connection.connect();

    self.emit('connect');
  }

  // patch the module.load function so that we see modules loading and
  // have an opportunity to patch them with instrumentation
  function patchModule() {
    var module = require('module');
    var moduleLoadFunction = module._load;

    module._load = function (file) {
      var m = moduleLoadFunction.apply(self, arguments);
      moduleLoad(m, file);
      return m;
    };
  }

  // notice a module loading and patch it if there's a file in the instrumentation
  // directory with a name that matches the module name
  function moduleLoad(theModule, name) {
    if (path.extname(name) === '.js') return;

    name = path.basename(name);
    var instrumentationDir = path.join(__dirname,'instrumentation');
    var fileName = instrumentationDir + "/" + name + '.js';
    // we have to check this synchronously.  it's important that we patch immediately when modules load
    if (path.existsSync(fileName)) {
      // FIXME for some reason the logger doesn't work here.  console logging does.  wtf?
      loadInstrumentationFile(name, fileName, theModule);
    }
  }

  // we load all of the core instrumentation up front.  These are always available, they're
  // pretty much always used, and we might not see the modules load through our module patching.
  function loadInstrumentation() {
    var coreDir = path.join(__dirname,'core_instrumentation');
    var files = fs.readdirSync(coreDir);

    // load the core instrumentation files
    files.forEach(function (name) {
      if (path.extname(name) !== '.js') return;

      var fileName = coreDir + "/" + name;
      loadInstrumentationFile(name, fileName, require(path.basename(name, ".js")));
    });
  }

  function loadInstrumentationFile(shortName, fileName, theModule) {
    if (theModule.__NR_INITIALIZED) return true;

    var inst = require(fileName);
    var success = true;

    try {
      inst.initialize(self, trace, theModule);
    }
    catch(e) {
      logger.debug(e.message);
      success = false;
    }

    logger.debug("Module " + path.basename(shortName, ".js") + " : " + success);
    instrumentation.push(fileName);
    theModule.__NR_INITIALIZED = true;

    return success;
  }

  function harvest() {
    if (self.connection && self.connection.isConnected()) {
      self.errorService.onBeforeHarvest(self.statsEngine, self.connection);
      self.statsEngine.harvest(self.connection);
    }
  }

  self.start = function () {
    if (self.config.agent_enabled !== true) {
      logger.info('The Monis Agent node.js agent is disabled');
      return;
    }

    logger.info('Starting the Monis Agent node.js agent');

    harvestIntervalId = setInterval(harvest, 60 * 1000);

    patchModule();
    loadInstrumentation();
    connect();
    sampler.start(self.statsEngine);
  };

  self.stop = function () {
    logger.info('Stopping the Monis Agent node.js agent');
    if (harvestIntervalId) {
      clearInterval(harvestIntervalId);
    }
    sampler.stop();
  };
}
util.inherits(Agent, events.EventEmitter);

Agent.prototype.noticeAppPort = function (port) {
  this.applicationPort = port;
  logger.debug("Noticed application running on port " + port);
};

Agent.prototype.createTransaction = function () {
  return this.transaction = trace.createTransaction(this);
};

Agent.prototype.getTransaction = function () {
  if (this.transaction) {
    if (this.transaction.isFinished()) this.transaction = null;

    return this.transaction;
  }
  return null;
};

Agent.prototype.setTransaction = function (transaction) {
  if (!(transaction && transaction.isFinished())) {
    this.transaction = transaction;
  }
};

Agent.prototype.clearTransaction = function (transaction) {
  if (this.transaction === transaction) {
    this.transaction = null;
  }
};

Agent.prototype.incrementCounter = function (metricName) {
  this.statsEngine.unscopedStats.byName(metricName).incrementCallCount();
};

module.exports = function (options) {
  if (!options && !invocationOptions && agent) return agent;

  invocationOptions = options;

  agent = new Agent(options);
  shimmer.wrapAgent(agent);
  agent.start();

  return agent;
};
