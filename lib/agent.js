'use strict';

var path                = require('path')
  , events              = require('events')
  , util                = require('util')
  , transaction         = require(path.join(__dirname, 'transaction', 'manager'))
  , logger              = require(path.join(__dirname, 'logger'))
  , sampler             = require(path.join(__dirname, 'sampler'))
  , CollectorConnection = require(path.join(__dirname, 'collector', 'connection'))
  , ErrorService        = require(path.join(__dirname, 'error'))
  , Metrics             = require(path.join(__dirname, 'metrics'))
  ;

function Agent(options) {
  events.EventEmitter.call(this);

  var self = this;

  try {
    this.config = require(path.join(__dirname, 'config')).initialize(logger);
  }
  catch (e) {
    logger.error(e);
    this.start = function notStarting() { return false; };
    this.stop = function notStopping() {};
  }

  logger.level = this.config.log_level || 'info';

  this.options     = options || {};
  this.environment = require(path.join(__dirname, 'environment'));
  this.version     = this.config.version;

  this.errors  = new ErrorService(this.config);
  this.metrics = new Metrics(this.config.apdex_t);
  this.traces  = [];

  this.on('connectReady',        this.collectorSetup.bind(this));
  this.on('transactionFinished', this.mergeTransaction.bind(this));
  this.on('transactionFinished', this.errors.onTransactionFinished.bind(this.errors));
  this.on('transactionFinished', this.captureTrace.bind(this));
  this.config.on('change',       this.updateApdexThreshold.bind(this));
}
util.inherits(Agent, events.EventEmitter);

Agent.prototype.start = function () {
  if (this.config.agent_enabled !== true) {
    return logger.warn("The Monis Agent Node.js agent is disabled in config.js. Not starting!");
  }

  logger.info("Starting Monis Agent Node.js instrumentation.");

  this.harvestIntervalId = setInterval(this.harvest.bind(this), 60 * 1000);
  sampler.start(this);

  this.connect();
};

Agent.prototype.stop = function () {
  logger.info("Stopping Monis Agent Node.js instrumentation");

  // stop the harvester coroutine
  if (this.harvestIntervalId) clearInterval(this.harvestIntervalId);

  // shut down the sampler (and its own coroutines)
  sampler.stop();
};

/**
 * Trigger the listener registered on 'connectReady' in the constructor, but
 * wait a little while if the instrumentation hasn't noticed an application
 * port yet.
 */
Agent.prototype.connect = function () {
  var self = this;

  if (!this.applicationPort) {
    logger.debug("No applicationPort set, waiting 15 seconds to try again.");
    setTimeout(function () { self.emit('connectReady'); }, 15 * 1000);
  }
  else {
    this.emit('connectReady');
  }
};

/**
 * Update the apdex tolerating threshold.
 *
 * Needs to be bound to the agent, because the agent manages the creation
 * and destruction of the metrics object as part of the harvest cycle.
 */
Agent.prototype.updateApdexThreshold = function (params) {
  this.metrics.updateApdexT(params);
};

/**
 * Reset the normalizer rules for metrics.
 *
 * Needs to be bound to the agent, because the agent manages the creation
 * and destruction of the metrics object as part of the harvest cycle.
 */
Agent.prototype.updateNormalizerRules = function (response) {
  this.metrics.normalizer.parseMetricRules(response);
};

/**
 * Update the metric renaming rules.
 *
 * Needs to be bound to the agent, because the agent manages the creation
 * and destruction of the metrics object as part of the harvest cycle.
 */
Agent.prototype.updateRenameRules = function (metricIDs) {
  this.metrics.updateRenameRules(metricIDs);
};

/**
 * Handle errors connecting to the collector by attempting to retry the connection.
 *
 * FIXME: should probably give up after a while if it can't connect.
 */
Agent.prototype.scheduleRetry = function (error) {
  var self = this;

  logger.error("An error occurred connecting to " + self.config.host + ":" + self.config.port + " - " + util.inspect(error));
  logger.error("Next attempting to connect to collector in 15 seconds.");
  setTimeout(function () { self.connect(); }, 15 * 1000);
};

Agent.prototype.collectorSetup = function () {
  if (this.connection) return;

  // Allow the connection to be mocked externally
  this.connection = this.options.connection || new CollectorConnection(this);

  // add listeners
  this.connection.on('connect',            this.config.onConnect.bind(this.config));
  this.connection.on('connect',            this.updateNormalizerRules.bind(this));
  this.connection.on('metricDataResponse', this.updateRenameRules.bind(this));
  this.connection.on('metricDataError',    this.mergeMetrics.bind(this));
  this.connection.on('errorDataError',     this.errors.onSendError.bind(this.errors));
  this.connection.on('connectError',       this.scheduleRetry.bind(this));

  this.connection.connect();

  this.emit('connect');
};

Agent.prototype.harvest = function () {
  if (this.connection && this.connection.isConnected()) {
    this.submitErrorData();
    this.submitMetricData();
    this.submitTransactionSampleData();
  }
};

/**
 * coalesce and reset the state of the error tracker
 */
Agent.prototype.submitErrorData = function () {
  this.metrics.getOrCreateMetric('Errors/all').stats.incrementCallCount(this.errors.errorCount);
  this.connection.sendTracedErrors(this.errors.errors);
  this.errors.clear();
};

/**
 * coalesce and reset the state of the gathered metrics
 */
Agent.prototype.submitMetricData = function () {
    var metrics  = this.metrics;
    this.metrics = new Metrics(metrics.apdexT, metrics.renamer, metrics.normalizer);

    // push that thar data to the collector
    this.connection.sendMetricData(metrics.lastSendTime / 1000, Date.now() / 1000, metrics);
};

/**
 * coalesce and reset the state of the transaction traces
 */
Agent.prototype.submitTransactionSampleData = function () {
  var traces = this.traces;
  this.traces = [];
  this.connection.sendTransactionTraces(traces);
};

/**
 * The error tracer and transaction tracer expect the full transaction,
 * but the metrics gatherer only wants to merge metrics objects.
 *
 * @param {Transaction} transaction A finished transaction.
 */
Agent.prototype.mergeTransaction = function (transaction) {
  this.mergeMetrics(transaction.metrics);
};

/**
 * Need to have a level of indirection between the event handler and the
 * metrics property to ensure that we're using the current metrics object
 * and am not holding a reference to the very first metrics object created
 * upon instantiation.
 */
Agent.prototype.mergeMetrics = function (metrics) {
  this.metrics.merge(metrics);
  this.emit('metricsMerged');
};

/**
 * Capture a transaction trace for delivery to the collector.
 *
 * FIXME: apply rules for deciding whether to keep this trace.
 * FIXME: cap the number of traces delivered
 *
 * @param {Transaction} transaction We only care about the trace.
 */
Agent.prototype.captureTrace = function (transaction) {
  var self = this;
  transaction.getTrace().generateJSON(function (err, json) {
    self.traces.push(json);
    self.emit('transactionTraceCaptured');
  });
};

Agent.prototype.noticeAppPort = function (port) {
  logger.debug("Noticed application running on port " + port);
  this.applicationPort = port;
  this.emit('connectReady');
};

/**
 * Proxy through to the transaction API.
 * FIXME: insert the relevant transaction API code here and eliminate the API.
 *
 * @param {Number} height How far up the call stack to attach the transaction.
 */
Agent.prototype.createTransaction = function (height) {
  if (!height) height = 3;

  return transaction.create(this, height);
};

/**
 * Proxy through to the transaction API.
 * FIXME: insert the relevant transaction API code here and eliminate the API.
 */
Agent.prototype.getTransaction = function () {
  var stashed = transaction.find(this);
  if (stashed && stashed.isActive()) return stashed;
};

module.exports = Agent;
