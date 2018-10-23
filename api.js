'use strict'

var arity = require('./lib/util/arity')
var util = require('util')
var logger = require('./lib/logger').child({component: 'api'})
var NAMES = require('./lib/metrics/names')
var recordWeb = require('./lib/metrics/recorders/http')
var recordBackground = require('./lib/metrics/recorders/other')
var customRecorder = require('./lib/metrics/recorders/custom')
var hashes = require('./lib/util/hashes')
var properties = require('./lib/util/properties')
var stringify = require('json-stringify-safe')
var shimmer = require('./lib/shimmer')
var Shim = require('./lib/shim/shim')
var TransactionHandle = require('./lib/transaction/handle')

const DESTS = require('./lib/config/attribute-filter').DESTINATIONS
const MODULE_TYPE = require('./lib/shim/constants').MODULE_TYPE

/*
 *
 * CONSTANTS
 *
 */
const RUM_STUB = "<script type='text/javascript' %s>window.NREUM||(NREUM={});" +
                "NREUM.info = %s; %s</script>"

// these messages are used in the _gracefail() method below in getBrowserTimingHeader
const RUM_ISSUES = [
  'NREUM: no browser monitoring headers generated; disabled',
  'NREUM: transaction missing or ignored while generating browser monitoring headers',
  'NREUM: config.browser_monitoring missing, something is probably wrong',
  'NREUM: browser_monitoring headers need a transaction name',
  'NREUM: browser_monitoring requires valid application_id',
  'NREUM: browser_monitoring requires valid browser_key',
  'NREUM: browser_monitoring requires js_agent_loader script',
  'NREUM: browser_monitoring disabled by browser_monitoring.loader config'
]

// Can't overwrite internal parameters or all heck will break loose.
const CUSTOM_BLACKLIST = new Set([
  'nr_flatten_leading'
])

const CUSTOM_EVENT_TYPE_REGEX = /^[a-zA-Z0-9:_ ]+$/

/**
 * The exported Monis Agent API. This contains all of the functions meant to be
 * used by Monis Agent customers. For now, that means transaction naming.
 *
 * You do not need to directly instantiate this class, as an instance of this is
 * the return from `require('monisagent')`.
 *
 * @constructor
 */
function API(agent) {
  this.agent = agent
  this.shim = new Shim(agent, 'MonisAgentAPI')
}

/**
 * Give the current transaction a custom name. Overrides any Monis Agent naming
 * rules set in configuration or from Monis Agent's servers.
 *
 * IMPORTANT: this function must be called when a transaction is active. New
 * Relic transactions are tied to web requests, so this method may be called
 * from within HTTP or HTTPS listener functions, Express routes, or other
 * contexts where a web request or response object are in scope.
 *
 * @param {string} name The name you want to give the web request in the New
 *                      Relic UI. Will be prefixed with 'Custom/' when sent.
 */
API.prototype.setTransactionName = function setTransactionName(name) {
  var metric = this.agent.metrics.getOrCreateMetric(
    NAMES.SUPPORTABILITY.API + '/setTransactionName'
  )
  metric.incrementCallCount()

  var transaction = this.agent.tracer.getTransaction()
  if (!transaction) {
    return logger.warn("No transaction found when setting name to '%s'.", name)
  }

  if (!name) {
    if (transaction && transaction.url) {
      logger.error("Must include name in setTransactionName call for URL %s.",
                   transaction.url)
    } else {
      logger.error("Must include name in setTransactionName call.")
    }

    return
  }

  logger.trace('Setting transaction %s name to %s', transaction.id, name)
  transaction.forceName = NAMES.CUSTOM + '/' + name
}

/**
 * This method returns an object with the following methods:
 * - end: end the transaction that was active when `API#getTransaction`
 *   was called.
 *
 * - ignore: set the transaction that was active when
 *   `API#getTransaction` was called to be ignored.
 *
 * @returns {TransactionHandle} The transaction object with the `end` and
 *  `ignore` methods on it.
 */
API.prototype.getTransaction = function getTransaction() {
  var metric = this.agent.metrics.getOrCreateMetric(
    NAMES.SUPPORTABILITY.API + '/getTransaction'
  )
  metric.incrementCallCount()

  var transaction = this.agent.tracer.getTransaction()
  if (!transaction) {
    logger.debug("No transaction found when calling API#getTransaction")
    return new TransactionHandle.Stub()
  }

  transaction.handledExternally = true

  return new TransactionHandle(transaction)
}

/**
 * Specify the `Dispatcher` and `Dispatcher Version` environment values.
 * A dispatcher is typically the service responsible for brokering
 * the request with the process responsible for responding to the
 * request.  For example Node's `http` module would be the dispatcher
 * for incoming HTTP requests.
 *
 * @param {string} name The string you would like to report to Monis Agent
 *                      as the dispatcher.
 *
 * @param {string} [version] The dispatcher version you would like to
 *                           report to Monis Agent
 */
API.prototype.setDispatcher = function setDispatcher(name, version) {
  var metric = this.agent.metrics.getOrCreateMetric(
    NAMES.SUPPORTABILITY.API + '/setDispatcher'
  )
  metric.incrementCallCount()

  if (!name || typeof name !== 'string') {
    logger.error("setDispatcher must be called with a name, and name must be a string.")
    return
  }

  // No objects allowed.
  if (version && typeof version !== 'object') {
    version = String(version)
  } else {
    logger.info('setDispatcher was called with an object as the version parameter')
    version = null
  }

  this.agent.environment.setDispatcher(name, version, true)
}

/**
 * Give the current transaction a name based on your own idea of what
 * constitutes a controller in your Node application. Also allows you to
 * optionally specify the action being invoked on the controller. If the action
 * is omitted, then the API will default to using the HTTP method used in the
 * request (e.g. GET, POST, DELETE). Overrides any Monis Agent naming rules set
 * in configuration or from Monis Agent's servers.
 *
 * IMPORTANT: this function must be called when a transaction is active. New
 * Relic transactions are tied to web requests, so this method may be called
 * from within HTTP or HTTPS listener functions, Express routes, or other
 * contexts where a web request or response object are in scope.
 *
 * @param {string} name   The name you want to give the controller in the New
 *                        Relic UI. Will be prefixed with 'Controller/' when
 *                        sent.
 * @param {string} action The action being invoked on the controller. Defaults
 *                        to the HTTP method used for the request.
 */
API.prototype.setControllerName = function setControllerName(name, action) {
  var metric = this.agent.metrics.getOrCreateMetric(
    NAMES.SUPPORTABILITY.API + '/setControllerName'
  )
  metric.incrementCallCount()

  var transaction = this.agent.tracer.getTransaction()
  if (!transaction) {
    return logger.warn("No transaction found when setting controller to %s.", name)
  }

  if (!name) {
    if (transaction && transaction.url) {
      logger.error("Must include name in setControllerName call for URL %s.",
                   transaction.url)
    } else {
      logger.error("Must include name in setControllerName call.")
    }

    return
  }

  action = action || transaction.verb || 'GET'
  transaction.forceName = NAMES.CONTROLLER + '/' + name + '/' + action
}


/**
 * Deprecated. Please use `addCustomAttribute` instead.
 * TODO: remove in v5
 */
API.prototype.addCustomParameter = util.deprecate(
  addCustomParameter, [
    'API#addCustomParameter is being deprecated!',
    'Please use API#addCustomAttribute instead.'
  ].join(' ')
)
function addCustomParameter(key, value) {
  var metric = this.agent.metrics.getOrCreateMetric(
    NAMES.SUPPORTABILITY.API + '/addCustomParameter'
  )
  metric.incrementCallCount()

  // If high security mode is on, custom attributes are disabled.
  if (this.agent.config.high_security === true) {
    logger.warnOnce(
      'Custom attributes',
      'Custom attributes are disabled by high security mode.'
    )
    return false
  } else if (!this.agent.config.api.custom_attributes_enabled) {
    logger.debug(
      'Config.api.custom_attributes_enabled set to false, not collecting value'
    )
    return false
  }

  var transaction = this.agent.tracer.getTransaction()
  if (!transaction) {
    return logger.warn('No transaction found for custom attributes.')
  }

  var trace = transaction.trace
  if (!trace.custom) {
    return logger.warn(
      'Could not add attribute %s to nonexistent custom attributes.',
      key
    )
  }

  if (CUSTOM_BLACKLIST.has(key)) {
    return logger.warn('Not overwriting value of NR-only attribute %s.', key)
  }

  trace.addCustomAttribute(key, value)
}


/**
 * Add a custom attribute to the current transaction. Some attributes are
 * reserved (see CUSTOM_BLACKLIST for the current, very short list), and
 * as with most API methods, this must be called in the context of an
 * active transaction. Most recently set value wins.
 *
 * @param {string} key  The key you want displayed in the RPM UI.
 * @param {string} value The value you want displayed. Must be serializable.
 */
API.prototype.addCustomAttribute = function addCustomAttribute(key, value) {
  var metric = this.agent.metrics.getOrCreateMetric(
    NAMES.SUPPORTABILITY.API + '/addCustomAttribute'
  )
  metric.incrementCallCount()

  // If high security mode is on, custom attributes are disabled.
  if (this.agent.config.high_security === true) {
    logger.warnOnce(
      'Custom attributes',
      'Custom attributes are disabled by high security mode.'
    )
    return false
  } else if (!this.agent.config.api.custom_attributes_enabled) {
    logger.debug(
      'Config.api.custom_attributes_enabled set to false, not collecting value'
    )
    return false
  }

  var transaction = this.agent.tracer.getTransaction()
  if (!transaction) {
    return logger.warn('No transaction found for custom attributes.')
  }

  var trace = transaction.trace
  if (!trace.custom) {
    return logger.warn(
      'Could not add attribute %s to nonexistent custom attributes.',
      key
    )
  }

  if (CUSTOM_BLACKLIST.has(key)) {
    return logger.warn('Not overwriting value of NR-only attribute %s.', key)
  }

  trace.addCustomAttribute(key, value)
}

/**
 * Deprecated. Please use `addCustomAttributes` instead.
 * TODO: remove in v5
 */
API.prototype.addCustomParameters = util.deprecate(
  addCustomParameters, [
    '`API#addCustomParameters` has been deprecated!',
    'Please use `API#addCustomAttributes` instead.'
  ].join(' ')
)
function addCustomParameters(atts) {
  var metric = this.agent.metrics.getOrCreateMetric(
    NAMES.SUPPORTABILITY.API + '/addCustomParameters'
  )
  metric.incrementCallCount()

  for (var key in atts) {
    if (!properties.hasOwn(atts, key)) {
      continue
    }

    this.addCustomAttribute(key, atts[key])
  }
}

/**
 * Adds all custom attributes in an object to the current transaction.
 *
 * See documentation for monisagent.addCustomAttribute for more information on
 * setting custom attributes.
 *
 * An example of setting a custom attribute object:
 *
 *    monisagent.addCustomAttributes({test: 'value', test2: 'value2'});
 *
 * @param {object} [atts]
 * @param {string} [atts.KEY] The name you want displayed in the RPM UI.
 * @param {string} [atts.KEY.VALUE] The value you want displayed. Must be serializable.
 */
API.prototype.addCustomAttributes = function addCustomAttributes(atts) {
  var metric = this.agent.metrics.getOrCreateMetric(
    NAMES.SUPPORTABILITY.API + '/addCustomAttributes'
  )
  metric.incrementCallCount()

  for (var key in atts) {
    if (!properties.hasOwn(atts, key)) {
      continue
    }

    this.addCustomAttribute(key, atts[key])
  }
}

/**
 * Tell the tracer whether to ignore the current transaction. The most common
 * use for this will be to mark a transaction as ignored (maybe it's handling
 * a websocket polling channel, or maybe it's an external call you don't care
 * is slow), but it's also useful when you want a transaction that would
 * otherwise be ignored due to URL or transaction name normalization rules
 * to *not* be ignored.
 *
 * @param {boolean} ignored Ignore, or don't ignore, the current transaction.
 */
API.prototype.setIgnoreTransaction = function setIgnoreTransaction(ignored) {
  var metric = this.agent.metrics.getOrCreateMetric(
    NAMES.SUPPORTABILITY.API + '/setIgnoreTransaction'
  )
  metric.incrementCallCount()

  var transaction = this.agent.tracer.getTransaction()
  if (!transaction) {
    return logger.warn("No transaction found to ignore.")
  }

  transaction.setForceIgnore(ignored)
}

/**
 * Send errors to Monis Agent that you've already handled yourself. Should be an
 * `Error` or one of its subtypes, but the API will handle strings and objects
 * that have an attached `.message` or `.stack` property.
 *
 * NOTE: Errors that are recorded using this method do _not_ obey the
 * `ignore_status_codes` configuration.
 *
 * @param {Error} error
 *  The error to be traced.
 *
 * @param {object} [customAttributes]
 *  Optional. Any custom attributes to be displayed in the Monis Agent UI.
 */
API.prototype.noticeError = function noticeError(error, customAttributes) {
  const metric = this.agent.metrics.getOrCreateMetric(
    NAMES.SUPPORTABILITY.API + '/noticeError'
  )
  metric.incrementCallCount()

  if (!this.agent.config.api.notice_error_enabled) {
    logger.debug(
      'Config.api.notice_error_enabled set to false, not collecting error'
    )
    return false
  }

  // If high security mode is on or custom attributes are disabled,
  // noticeError does not collect custom attributes.
  if (this.agent.config.high_security === true) {
    logger.debug(
      'Passing custom attributes to notice error API is disabled in high security mode.'
    )
  } else if (!this.agent.config.api.custom_attributes_enabled) {
    logger.debug(
      'Config.api.custom_attributes_enabled set to false, ' +
      'ignoring custom error attributes.'
    )
  }

  if (typeof error === 'string') {
    error = new Error(error)
  }
  const transaction = this.agent.tracer.getTransaction()

  this.agent.errors.addUserError(transaction, error, customAttributes)
}

/**
 * If the URL for a transaction matches the provided pattern, name the
 * transaction with the provided name. If there are capture groups in the
 * pattern (which is a standard JavaScript regular expression, and can be
 * passed as either a RegExp or a string), then the substring matches ($1, $2,
 * etc.) are replaced in the name string. BE CAREFUL WHEN USING SUBSTITUTION.
 * If the replacement substrings are highly variable (i.e. are identifiers,
 * GUIDs, or timestamps), the rule will generate too many metrics and
 * potentially get your application blacklisted by Monis Agent.
 *
 * An example of a good rule with replacements:
 *
 *   monisagent.addNamingRule('^/storefront/(v[1-5])/(item|category|tag)',
 *                          'CommerceAPI/$1/$2')
 *
 * An example of a bad rule with replacements:
 *
 *   monisagent.addNamingRule('^/item/([0-9a-f]+)', 'Item/$1')
 *
 * Keep in mind that the original URL and any query parameters will be sent
 * along with the request, so slow transactions will still be identifiable.
 *
 * Naming rules can not be removed once added. They can also be added via the
 * agent's configuration. See configuration documentation for details.
 *
 * @param {RegExp} pattern The pattern to rename (with capture groups).
 * @param {string} name    The name to use for the transaction.
 */
API.prototype.addNamingRule = function addNamingRule(pattern, name) {
  var metric = this.agent.metrics.getOrCreateMetric(
    NAMES.SUPPORTABILITY.API + '/addNamingRule'
  )
  metric.incrementCallCount()


  if (!name) return logger.error("Simple naming rules require a replacement name.")

  this.agent.userNormalizer.addSimple(pattern, '/' + name)
}

/**
 * If the URL for a transaction matches the provided pattern, ignore the
 * transaction attached to that URL. Useful for filtering socket.io connections
 * and other long-polling requests out of your agents to keep them from
 * distorting an app's apdex or mean response time. Pattern may be a (standard
 * JavaScript) RegExp or a string.
 *
 * Example:
 *
 *   monisagent.addIgnoringRule('^/socket\\.io/')
 *
 * @param {RegExp} pattern The pattern to ignore.
 */
API.prototype.addIgnoringRule = function addIgnoringRule(pattern) {
  var metric = this.agent.metrics.getOrCreateMetric(
    NAMES.SUPPORTABILITY.API + '/addIgnoringRule'
  )
  metric.incrementCallCount()

  if (!pattern) return logger.error("Must include a URL pattern to ignore.")

  this.agent.userNormalizer.addSimple(pattern, null)
}

/**
 * Get the <script>...</script> header necessary for Browser Monitoring
 * This script must be manually injected into your templates, as high as possible
 * in the header, but _after_ any X-UA-COMPATIBLE HTTP-EQUIV meta tags.
 * Otherwise you may hurt IE!
 *
 * This method must be called _during_ a transaction, and must be called every
 * time you want to generate the headers.
 *
 * Do *not* reuse the headers between users, or even between requests.
 *
 * @param {string} [options.nonce] - Nonce to inject into `<script>` header.
 *
 * @returns {string} The `<script>` header to be injected.
 */
API.prototype.getBrowserTimingHeader = function getBrowserTimingHeader(options) {
  var metric = this.agent.metrics.getOrCreateMetric(
    NAMES.SUPPORTABILITY.API + '/getBrowserTimingHeader'
  )
  metric.incrementCallCount()

  var config = this.agent.config

  /**
   * Gracefully fail.
   *
   * Output an HTML comment and log a warning the comment is meant to be
   * innocuous to the end user.
   *
   * @param {number} num          - Error code from `RUM_ISSUES`.
   * @param {bool} [quite=false]  - Be quiet about this failure.
   *
   * @see RUM_ISSUES
   */
  function _gracefail(num, quiet) {
    if (quiet) {
      logger.debug(RUM_ISSUES[num])
    } else {
      logger.warn(RUM_ISSUES[num])
    }
    return '<!-- NREUM: (' + num + ') -->'
  }

  var browser_monitoring = config.browser_monitoring

  // config.browser_monitoring should always exist, but we don't want the agent
  // to bail here if something goes wrong
  if (!browser_monitoring) return _gracefail(2)

  /* Can control header generation with configuration this setting is only
   * available in the monisagent.js config file, it is not ever set by the
   * server.
   */
  if (!browser_monitoring.enable) {
    // It has been disabled by the user; no need to warn them about their own
    // settings so fail quietly and gracefully.
    return _gracefail(0, true)
  }

  var trans = this.agent.getTransaction()

  // bail gracefully outside a transaction
  if (!trans || trans.isIgnored()) return _gracefail(1)

  var name = trans.getFullName()

  /* If we're in an unnamed transaction, add a friendly warning this is to
   * avoid people going crazy, trying to figure out why browser monitoring is
   * not working when they're missing a transaction name.
   */
  if (!name) return _gracefail(3)

  var time = trans.timer.getDurationInMillis()

  /*
   * Only the first 13 chars of the license should be used for hashing with
   * the transaction name.
   */
  var key = config.license_key.substr(0, 13)
  var appid = config.application_id

  /* This is only going to work if the agent has successfully handshaked with
   * the collector. If the networks is bad, or there is no license key set in
   * monisagent.js, there will be no application_id set.  We bail instead of
   * outputting null/undefined configuration values.
   */
  if (!appid) return _gracefail(4)

  /* If there is no browser_key, the server has likely decided to disable
   * browser monitoring.
   */
  var licenseKey = browser_monitoring.browser_key
  if (!licenseKey) return _gracefail(5)

  /* If there is no agent_loader script, there is no point
   * in setting the rum data
   */
  var js_agent_loader = browser_monitoring.js_agent_loader
  if (!js_agent_loader) return _gracefail(6)

  /* If rum is enabled, but then later disabled on the server,
   * this is the only parameter that gets updated.
   *
   * This condition should only be met if rum is disabled during
   * the lifetime of an application, and it should be picked up
   * on the next ForceRestart by the collector.
   */
  var loader = browser_monitoring.loader
  if (loader === 'none') return _gracefail(7)

  // This hash gets written directly into the browser.
  var rum_hash = {
    agent: browser_monitoring.js_agent_file,
    beacon: browser_monitoring.beacon,
    errorBeacon: browser_monitoring.error_beacon,
    licenseKey: licenseKey,
    applicationID: appid,
    applicationTime: time,
    transactionName: hashes.obfuscateNameUsingKey(name, key),
    queueTime: trans.queueTime,
    ttGuid: trans.id,

    // we don't use these parameters yet
    agentToken: null
  }

  var attrs = Object.create(null)

  const customAttrs = trans.trace.custom.get(DESTS.BROWSER_EVENT)
  if (!properties.isEmpty(customAttrs)) {
    attrs.u = customAttrs
  }

  const agentAttrs = trans.trace.attributes.get(DESTS.BROWSER_EVENT)
  if (!properties.isEmpty(agentAttrs)) {
    attrs.a = agentAttrs
  }

  if (!properties.isEmpty(attrs)) {
    rum_hash.atts = hashes.obfuscateNameUsingKey(JSON.stringify(attrs), key)
  }

  // if debugging, do pretty format of JSON
  var tabs = config.browser_monitoring.debug ? 2 : 0
  var json = JSON.stringify(rum_hash, null, tabs)

  // set nonce attribute if passed in options
  var nonce = options && options.nonce ? 'nonce="' + options.nonce + '"' : ''

  // the complete header to be written to the browser
  var out = util.format(
    RUM_STUB,
    nonce,
    json,
    js_agent_loader
  )

  logger.trace('generating RUM header', out)

  return out
}

API.prototype.createTracer = util.deprecate(
  createTracer, [
    'API#createTracer is being deprecated!',
    'Please use API#startSegment for segment creation.'
  ].join(' ')
)

/**
 * This creates a new tracer with the passed in name. It then wraps the
 * callback and binds it to the current transaction and segment so any further
 * custom instrumentation as well as auto instrumentation will also be able to
 * find the current transaction and segment.
 *
 * @memberof API#
 * @deprecated use {@link API#startSegment} instead
 */
function createTracer(name, callback) {
  var metric = this.agent.metrics.getOrCreateMetric(
    NAMES.SUPPORTABILITY.API + '/createTracer'
  )
  metric.incrementCallCount()

  // FLAG: custom_instrumentation
  if (!this.agent.config.feature_flag.custom_instrumentation) {
    return callback
  }

  var fail = false
  if (!name) {
    logger.warn('createTracer called without a name')
    fail = true
  }

  if (typeof callback !== 'function') {
    logger.warn('createTracer called with a callback arg that is not a function')
    fail = true
  }

  if (fail) {
    // If name is undefined but callback is defined we should make a best effort
    // to return it so things don't crash.
    return callback
  }

  var tracer = this.agent.tracer
  var txn = tracer.getTransaction()
  if (!txn) {
    logger.debug(
      'createTracer called with %s (%s) outside of a transaction, ' +
        'unable to create tracer.',
      name,
      callback && callback.name
    )
    return callback
  }

  logger.debug(
    'creating tracer %s (%s) on transaction %s.',
    name,
    callback && callback.name,
    txn.id
  )

  var segment = tracer.createSegment(name, customRecorder)
  segment.start()
  return arity.fixArity(callback, tracer.bindFunction(callback, segment, true))
}

/**
 * @callback startSegmentCallback
 * @param {function} cb
 *   The function to time with the created segment.
 * @return {Promise=} Returns a promise if cb returns a promise.
 */

/**
 * Wraps the given handler in a segment which may optionally be turned into a
 * metric.
 *
 * @example
 *  monisagent.startSegment('mySegment', false, function handler() {
 *    // The returned promise here will signify the end of the segment.
 *    return myAsyncTask().then(myNextTask)
 *  })
 *
 * @param {string} name
 *  The name to give the new segment. This will also be the name of the metric.
 *
 * @param {bool} record
 *  Indicates if the segment should be recorded as a metric. Metrics will show
 *  up on the transaction breakdown table and server breakdown graph. Segments
 *  just show up in transaction traces.
 *
 * @param {startSegmentCallback} handler
 *  The function to track as a segment.
 *
 * @param {function} [callback]
 *  An optional callback for the handler. This will indicate the end of the
 *  timing if provided.
 *
 * @return {*} Returns the result of calling `handler`.
 */
API.prototype.startSegment = function startSegment(name, record, handler, callback) {
  this.agent.metrics.getOrCreateMetric(
    NAMES.SUPPORTABILITY.API + '/startSegment'
  ).incrementCallCount()

  // Check that we have usable arguments.
  if (!name || typeof handler !== 'function') {
    logger.warn('Name and handler function are both required for startSegment')
    if (typeof handler === 'function') {
      return handler(callback)
    }
    return
  }
  if (callback && typeof callback !== 'function') {
    logger.warn('If using callback, it must be a function')
    return handler(callback)
  }

  // Are we inside a transaction?
  if (!this.shim.getActiveSegment()) {
    logger.debug('startSegment(%j) called outside of a transaction, not recording.', name)
    return handler(callback)
  }

  // Create the segment and call the handler.
  var wrappedHandler = this.shim.record(handler, function handlerNamer(shim) {
    return {
      name: name,
      recorder: record ? customRecorder : null,
      callback: callback ? shim.FIRST : null,
      promise: !callback
    }
  })

  return wrappedHandler(callback)
}

API.prototype.createWebTransaction = util.deprecate(
  createWebTransaction, [
    'API#createWebTransaction is being deprecated!',
    'Please use API#startWebTransaction for transaction creation',
    'and API#getTransaction for transaction management including',
    'ending transactions.'
  ].join(' ')
)

/**
 * Creates a function that represents a web transaction. It does not start the
 * transaction automatically - the returned function needs to be invoked to start it.
 * Inside the handler function, the transaction must be ended by calling endTransaction().
 *
 * @example
 * var monisagent = require('monisagent')
 * var transaction = monisagent.createWebTransaction('/some/url/path', function() {
 *   // do some work
 *   monisagent.endTransaction()
 * })
 *
 * @param {string}    url       The URL of the transaction.  It is used to name and group
                                related transactions in APM, so it should be a generic
                                name and not iclude any variable parameters.
 * @param {Function}  handle    Function that represents the transaction work.
 *
 * @memberof API#
 *
 * @deprecated since version 2.0
 */
function createWebTransaction(url, handle) {
  var metric = this.agent.metrics.getOrCreateMetric(
    NAMES.SUPPORTABILITY.API + '/createWebTransaction'
  )
  metric.incrementCallCount()

  // FLAG: custom_instrumentation
  if (!this.agent.config.feature_flag.custom_instrumentation) {
    return handle
  }

  var fail = false
  if (!url) {
    logger.warn('createWebTransaction called without a url')
    fail = true
  }

  if (typeof handle !== 'function') {
    logger.warn('createWebTransaction called with a handle arg that is not a function')
    fail = true
  }

  if (fail) {
    // If name is undefined but handle is defined we should make a best effort
    // to return it so things don't crash.
    return handle
  }

  logger.debug(
    'creating web transaction generator %s (%s).',
    url,
    handle && handle.name
  )

  var tracer = this.agent.tracer

  var proxy = tracer.transactionNestProxy('web', function createWebSegment() {
    var tx = tracer.getTransaction()

    logger.debug(
      'creating web transaction %s (%s) with transaction id: %s',
      url,
      handle && handle.name,
      tx.id
    )
    tx.nameState.setName(NAMES.CUSTOM, null, NAMES.ACTION_DELIMITER, url)
    tx.url = url
    tx.applyUserNamingRules(tx.url)
    tx.baseSegment = tracer.createSegment(url, recordWeb)
    tx.baseSegment.start()

    return tracer.bindFunction(handle, tx.baseSegment).apply(this, arguments)
  })
  return arity.fixArity(handle, proxy)
}

/**
 * Creates and starts a web transaction to record work done in
 * the handle supplied. This transaction will run until the handle
 * synchronously returns UNLESS:
 * 1. The handle function returns a promise, where the end of the
 *    transaction will be tied to the end of the promise returned.
 * 2. {@link API#getTransaction} is called in the handle, flagging the
 *    transaction as externally handled.  In this case the transaction
 *    will be ended when {@link TransactionHandle#end} is called in the user's code.
 *
 * @example
 * var monisagent = require('monisagent')
 * monisagent.startWebTransaction('/some/url/path', function() {
 *   var transaction = monisagent.getTransaction()
 *   setTimeout(function() {
 *     // do some work
 *     transaction.end()
 *   }, 100)
 * })
 *
 * @param {string} url
 *  The URL of the transaction.  It is used to name and group related transactions in APM,
 *  so it should be a generic name and not iclude any variable parameters.
 *
 * @param {Function}  handle
 *  Function that represents the transaction work.
 */
API.prototype.startWebTransaction = function startWebTransaction(url, handle) {
  var metric = this.agent.metrics.getOrCreateMetric(
    NAMES.SUPPORTABILITY.API + '/startWebTransaction'
  )
  metric.incrementCallCount()

  if (typeof handle !== 'function') {
    logger.warn('startWebTransaction called with a handle arg that is not a function')
    return null
  }

  if (!url) {
    logger.warn('startWebTransaction called without a url, transaction not started')
    return handle()
  }

  logger.debug(
    'starting web transaction %s (%s).',
    url,
    handle && handle.name
  )

  var shim = this.shim
  var tracer = this.agent.tracer
  var parent = tracer.getTransaction()

  return tracer.transactionNestProxy('web', function startWebSegment() {
    var tx = tracer.getTransaction()

    if (tx === parent) {
      logger.debug(
        'not creating nested transaction %s using transaction %s',
        url,
        tx.id
      )
      return tracer.addSegment(url, null, null, true, handle)
    }

    logger.debug(
      'creating web transaction %s (%s) with transaction id: %s',
      url,
      handle && handle.name,
      tx.id
    )
    tx.nameState.setName(NAMES.CUSTOM, null, NAMES.ACTION_DELIMITER, url)
    tx.url = url
    tx.applyUserNamingRules(tx.url)
    tx.baseSegment = tracer.createSegment(url, recordWeb)
    tx.baseSegment.start()

    var boundHandle = tracer.bindFunction(handle, tx.baseSegment)
    var returnResult = boundHandle.call(this)
    if (returnResult && shim.isPromise(returnResult)) {
      returnResult = shim.interceptPromise(returnResult, tx.end.bind(tx))
    } else if (!tx.handledExternally) {
      logger.debug('Ending unhandled web transaction immediately.')
      tx.end()
    }
    return returnResult
  })()
}

API.prototype.startBackgroundTransaction = startBackgroundTransaction

/**
 * Creates and starts a background transaction to record work done in
 * the handle supplied. This transaction will run until the handle
 * synchronously returns UNLESS:
 * 1. The handle function returns a promise, where the end of the
 *    transaction will be tied to the end of the promise returned.
 * 2. {@link API#getTransaction} is called in the handle, flagging the
 *    transaction as externally handled.  In this case the transaction
 *    will be ended when {@link TransactionHandle#end} is called in the user's code.
 *
 * @example
 * var monisagent = require('monisagent')
 * monisagent.startBackgroundTransaction('Red October', 'Subs', function() {
 *   var transaction = monisagent.getTransaction()
 *   setTimeout(function() {
 *     // do some work
 *     transaction.end()
 *   }, 100)
 * })
 *
 * @param {string} name
 *  The name of the transaction. It is used to name and group related
 *  transactions in APM, so it should be a generic name and not iclude any
 *  variable parameters.
 *
 * @param {string} [group]
 *  Optional, used for grouping background transactions in APM. For more
 *  information see:
 *  https://docs.monisagent.com/docs/apm/applications-menu/monitoring/transactions-page#txn-type-dropdown
 *
 * @param {Function} handle
 *  Function that represents the background work.
 *
 * @memberOf API#
 */
function startBackgroundTransaction(name, group, handle) {
  var metric = this.agent.metrics.getOrCreateMetric(
    NAMES.SUPPORTABILITY.API + '/startBackgroundTransaction'
  )
  metric.incrementCallCount()

  if (handle === undefined && typeof group === 'function') {
    handle = group
    group = 'Nodejs'
  }

  if (typeof handle !== 'function') {
    logger.warn('startBackgroundTransaction called with a handle that is not a function')
    return null
  }

  if (!name) {
    logger.warn('startBackgroundTransaction called without a name')
    return handle()
  }

  logger.debug(
    'starting background transaction %s:%s (%s)',
    name,
    group,
    handle && handle.name
  )

  var tracer = this.agent.tracer
  var shim = this.shim
  var txName = group + '/' + name
  var parent = tracer.getTransaction()

  return tracer.transactionNestProxy('bg', function startBackgroundSegment() {
    var tx = tracer.getTransaction()

    if (tx === parent) {
      logger.debug(
        'not creating nested transaction %s using transaction %s',
        txName,
        tx.id
      )
      return tracer.addSegment(txName, null, null, true, handle)
    }

    logger.debug(
      'creating background transaction %s:%s (%s) with transaction id: %s',
      name,
      group,
      handle && handle.name,
      tx.id
    )

    tx._partialName = txName
    tx.baseSegment = tracer.createSegment(name, recordBackground)
    tx.baseSegment.partialName = group
    tx.baseSegment.start()

    var boundHandle = tracer.bindFunction(handle, tx.baseSegment)
    var returnResult = boundHandle.call(this)
    if (returnResult && shim.isPromise(returnResult)) {
      returnResult = shim.interceptPromise(returnResult, tx.end.bind(tx))
    } else if (!tx.handledExternally) {
      logger.debug('Ending unhandled background transaction immediately.')
      tx.end()
    }
    return returnResult
  })()
}

API.prototype.createBackgroundTransaction = util.deprecate(
  createBackgroundTransaction, [
    'API#createBackgroundTransaction is being deprecated!',
    'Please use API#startBackgroundTransaction for transaction creation',
    'and API#getTransaction for transaction management including',
    'ending transactions.'
  ].join(' ')
)

/**
 * Creates a function that represents a background transaction. It does not
 * start the transaction automatically - the returned function needs to be
 * invoked to start it. Inside the handler function, the transaction must be
 * ended by calling `endTransaction()`.
 *
 * @example
 *  var monisagent = require('monisagent')
 *  var startTx = monisagent.createBackgroundTransaction('myTransaction', function(a, b) {
 *    // Do some work
 *    monisagent.endTransaction()
 *  })
 *  startTx('a', 'b') // Start the transaction.
 *
 * @param {string} name
 *  The name of the transaction. It is used to name and group related
 *  transactions in APM, so it should be a generic name and not iclude any
 *  variable parameters.
 *
 * @param {string} [group]
 *  Optional, used for grouping background transactions in APM. For more
 *  information see:
 *  https://docs.monisagent.com/docs/apm/applications-menu/monitoring/transactions-page#txn-type-dropdown
 *
 * @param {Function} handle
 *  Function that represents the background work.
 *
 * @return {Function} The `handle` function wrapped with starting a new
 *  transaction. This function can be called repeatedly to start multiple
 *  transactions.
 *
 * @memberOf API#
 *
 * @deprecated since version 2.0
 */
function createBackgroundTransaction(name, group, handle) {
  var metric = this.agent.metrics.getOrCreateMetric(
    NAMES.SUPPORTABILITY.API + '/createBackgroundTransaction'
  )
  metric.incrementCallCount()

  if (handle === undefined && typeof group === 'function') {
    handle = group
    group = 'Nodejs'
  }
  // FLAG: custom_instrumentation
  if (!this.agent.config.feature_flag.custom_instrumentation) {
    return handle
  }

  var fail = false
  if (!name) {
    logger.warn('createBackgroundTransaction called without a name')
    fail = true
  }

  if (typeof handle !== 'function') {
    logger.warn(
      'createBackgroundTransaction called with a handle arg that is not a function'
    )
    fail = true
  }

  if (fail) {
    // If name is undefined but handle is defined we should make a best effort
    // to return it so things don't crash.
    return handle
  }

  logger.debug(
    'creating background transaction generator %s:%s (%s)',
    name,
    group,
    handle && handle.name
  )

  var tracer = this.agent.tracer
  var txName = group + '/' + name

  var proxy = tracer.transactionNestProxy('bg', function createBGSegment() {
    var tx = tracer.getTransaction()

    logger.debug(
      'creating background transaction %s:%s (%s) with transaction id: %s',
      name,
      group,
      handle && handle.name,
      tx.id
    )

    tx._partialName = txName
    tx.baseSegment = tracer.createSegment(name, recordBackground)
    tx.baseSegment.partialName = group
    tx.baseSegment.start()

    return tracer.bindFunction(handle, tx.baseSegment).apply(this, arguments)
  })
  return arity.fixArity(handle, proxy)
}

/**
 * End the current web or background custom transaction. This method requires being in
 * the correct transaction context when called.
 */
API.prototype.endTransaction = function endTransaction() {
  var metric = this.agent.metrics.getOrCreateMetric(
    NAMES.SUPPORTABILITY.API + '/endTransaction'
  )
  metric.incrementCallCount()

  // FLAG: custom_instrumentation
  if (!this.agent.config.feature_flag.custom_instrumentation) {
    return
  }

  var tracer = this.agent.tracer
  var tx = tracer.getTransaction()

  if (tx) {
    if (tx.baseSegment) {
      if (tx.type === 'web') {
        tx.finalizeNameFromUri(tx.url, 0)
      }
      tx.baseSegment.end()
    }
    tx.end()
    logger.debug('ended transaction with id: %s and name: %s', tx.id, tx.name)
  } else {
    logger.debug('endTransaction() called while not in a transaction.')
  }
}

/**
 * Record an event-based metric, usually associated with a particular duration.
 * The `name` must be a string following standard metric naming rules. The `value` will
 * usually be a number, but it can also be an object.
 *   * When `value` is a numeric value, it should represent the magnitude of a measurement
 *     associated with an event; for example, the duration for a particular method call.
 *   * When `value` is an object, it must contain count, total, min, max, and sumOfSquares
 *     keys, all with number values. This form is useful to aggregate metrics on your own
 *     and report them periodically; for example, from a setInterval. These values will
 *     be aggregated with any previously collected values for the same metric. The names
 *     of these keys match the names of the keys used by the platform API.
 *
 * @param  {string} name  The name of the metric.
 * @param  {number|object} value
 */
API.prototype.recordMetric = function recordMetric(name, value) {
  var supportMetric = this.agent.metrics.getOrCreateMetric(
    NAMES.SUPPORTABILITY.API + '/recordMetric'
  )
  supportMetric.incrementCallCount()

  // FLAG: custom_metrics
  if (!this.agent.config.feature_flag.custom_metrics) {
    return
  }

  if (typeof name !== 'string') {
    logger.warn('Metric name must be a string')
    return
  }

  // TODO: In Agent v5 prefix custom metrics with `Custom/`.
  var metric = this.agent.metrics.getOrCreateMetric(name)

  if (typeof value === 'number') {
    metric.recordValue(value)
    return
  }

  if (typeof value !== 'object') {
    logger.warn('Metric value must be either a number, or a metric object')
    return
  }

  var stats = Object.create(null)
  var required = ['count', 'total', 'min', 'max', 'sumOfSquares']
  var keyMap = {count: 'callCount'}

  for (var i = 0, l = required.length; i < l; ++i) {
    if (typeof value[required[i]] !== 'number') {
      logger.warn('Metric object must include %s as a number', required[i])
      return
    }

    var key = keyMap[required[i]] || required[i]
    stats[key] = value[required[i]]
  }

  if (typeof value.totalExclusive === 'number') {
    stats.totalExclusive = value.totalExclusive
  } else {
    stats.totalExclusive = value.total
  }

  metric.merge(stats)
}

/**
 * Update a metric that acts as a simple counter. The count of the selected metric will
 * be incremented by the specified amount, defaulting to 1.
 *
 * @param  {string} name  The name of the metric.
 * @param  {number} [value] The amount that the count of the metric should be incremented
 *                          by.
 */
API.prototype.incrementMetric = function incrementMetric(name, value) {
  var metric = this.agent.metrics.getOrCreateMetric(
    NAMES.SUPPORTABILITY.API + '/incrementMetric'
  )
  metric.incrementCallCount()

  // FLAG: custom_metrics
  if (!this.agent.config.feature_flag.custom_metrics) {
    return
  }

  if (!value && value !== 0) {
    value = 1
  }

  if (typeof value !== 'number' || value % 1 !== 0) {
    logger.warn('Metric Increment value must be an integer')
    return
  }

  this.recordMetric(name, {
    count: value,
    total: 0,
    min: 0,
    max: 0,
    sumOfSquares: 0
  })
}

/**
 * Record an event-based metric, usually associated with a particular duration.
 *
 * @param  {string} eventType  The name of the event. It must be an alphanumeric string
 *                             less than 255 characters.
 * @param  {object} attributes Object of key and value pairs. The keys must be shorter
 *                             than 255 characters, and the values must be string, number,
 *                             or boolean.
 */
API.prototype.recordCustomEvent = function recordCustomEvent(eventType, attributes) {
  var metric = this.agent.metrics.getOrCreateMetric(
    NAMES.SUPPORTABILITY.API + '/recordCustomEvent'
  )
  metric.incrementCallCount()

  // If high security mode is on, custom events are disabled.
  if (this.agent.config.high_security === true) {
    logger.warnOnce(
      "Custom Event",
      "Custom events are disabled by high security mode."
    )
    return false
  } else if (!this.agent.config.api.custom_events_enabled) {
    logger.debug(
      "Config.api.custom_events_enabled set to false, not collecting value"
    )
    return false
  }

  if (!this.agent.config.custom_insights_events.enabled) {
    return
  }
  // Check all the arguments before bailing to give maximum information in a
  // single invocation.
  var fail = false

  if (!eventType || typeof eventType !== 'string') {
    logger.warn(
      'recordCustomEvent requires a string for its first argument, got %s (%s)',
      stringify(eventType),
      typeof eventType
    )
    fail = true
  } else if (!CUSTOM_EVENT_TYPE_REGEX.test(eventType)) {
    logger.warn(
      'recordCustomEvent eventType of %s is invalid, it must match /%s/',
      eventType,
      CUSTOM_EVENT_TYPE_REGEX.source
    )
    fail = true
  } else if (eventType.length > 255) {
    logger.warn(
      'recordCustomEvent eventType must have a length less than 256, got %s (%s)',
      eventType,
      eventType.length
    )
    fail = true
  }
  // If they don't pass an attributes object, or the attributes argument is not
  // an object, or if it is an object and but is actually an array, log a
  // warning and set the fail bit.
  if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) {
    logger.warn(
      'recordCustomEvent requires an object for its second argument, got %s (%s)',
      stringify(attributes),
      typeof attributes
    )
    fail = true
  } else if (_checkKeyLength(attributes, 255)) {
    fail = true
  }

  if (fail) {
    return
  }

  var instrinics = {
    type: eventType,
    timestamp: Date.now()
  }

  var tx = this.agent.getTransaction()
  var priority = tx && tx.priority || Math.random()
  this.agent.customEvents.add([instrinics, attributes], priority)
}

/**
 * Registers an instrumentation function.
 *
 *  - `monisagent.instrument(moduleName, onRequire [,onError])`
 *  - `monisagent.instrument(options)`
 *
 * @param {object} options
 *  The options for this custom instrumentation.
 *
 * @param {string} options.moduleName
 *  The module name given to require to load the module
 *
 * @param {function}  options.onRequire
 *  The function to call when the module is required
 *
 * @param {function} [options.onError]
 *  If provided, should `onRequire` throw an error, the error will be passed to
 *  this function.
 */
API.prototype.instrument = function instrument(moduleName, onRequire, onError) {
  var metric = this.agent.metrics.getOrCreateMetric(
    NAMES.SUPPORTABILITY.API + '/instrument'
  )
  metric.incrementCallCount()

  var opts = moduleName
  if (typeof opts === 'string') {
    opts = {
      moduleName: moduleName,
      onRequire: onRequire,
      onError: onError
    }
  }

  opts.type = MODULE_TYPE.GENERIC
  shimmer.registerInstrumentation(opts)
}

/**
 * Registers an instrumentation function.
 *
 *  - `monisagent.instrumentDatastore(moduleName, onRequire [,onError])`
 *  - `monisagent.instrumentDatastore(options)`
 *
 * @param {object} options
 *  The options for this custom instrumentation.
 *
 * @param {string} options.moduleName
 *  The module name given to require to load the module
 *
 * @param {function}  options.onRequire
 *  The function to call when the module is required
 *
 * @param {function} [options.onError]
 *  If provided, should `onRequire` throw an error, the error will be passed to
 *  this function.
 */
API.prototype.instrumentDatastore =
function instrumentDatastore(moduleName, onRequire, onError) {
  var metric = this.agent.metrics.getOrCreateMetric(
    NAMES.SUPPORTABILITY.API + '/instrumentDatastore'
  )
  metric.incrementCallCount()

  var opts = moduleName
  if (typeof opts === 'string') {
    opts = {
      moduleName: moduleName,
      onRequire: onRequire,
      onError: onError
    }
  }

  opts.type = MODULE_TYPE.DATASTORE
  shimmer.registerInstrumentation(opts)
}

/**
 * Registers an instrumentation function.
 *
 *  - `monisagent.instrumentWebframework(moduleName, onRequire [,onError])`
 *  - `monisagent.instrumentWebframework(options)`
 *
 * @param {object} options
 *  The options for this custom instrumentation.
 *
 * @param {string} options.moduleName
 *  The module name given to require to load the module
 *
 * @param {function}  options.onRequire
 *  The function to call when the module is required
 *
 * @param {function} [options.onError]
 *  If provided, should `onRequire` throw an error, the error will be passed to
 *  this function.
 */
API.prototype.instrumentWebframework =
function instrumentWebframework(moduleName, onRequire, onError) {
  var metric = this.agent.metrics.getOrCreateMetric(
    NAMES.SUPPORTABILITY.API + '/instrumentWebframework'
  )
  metric.incrementCallCount()

  var opts = moduleName
  if (typeof opts === 'string') {
    opts = {
      moduleName: moduleName,
      onRequire: onRequire,
      onError: onError
    }
  }

  opts.type = MODULE_TYPE.WEB_FRAMEWORK
  shimmer.registerInstrumentation(opts)
}

/**
 * Registers an instrumentation function for instrumenting message brokers.
 *
 *  - `monisagent.instrumentMessages(moduleName, onRequire [,onError])`
 *  - `monisagent.instrumentMessages(options)`
 *
 * @param {object} options
 *  The options for this custom instrumentation.
 *
 * @param {string} options.moduleName
 *  The module name given to require to load the module
 *
 * @param {function}  options.onRequire
 *  The function to call when the module is required
 *
 * @param {function} [options.onError]
 *  If provided, should `onRequire` throw an error, the error will be passed to
 *  this function.
 */
API.prototype.instrumentMessages =
function instrumentMessages(moduleName, onRequire, onError) {
  var metric = this.agent.metrics.getOrCreateMetric(
    NAMES.SUPPORTABILITY.API + '/instrumentMessages'
  )
  metric.incrementCallCount()

  var opts = moduleName
  if (typeof opts === 'string') {
    opts = {
      moduleName: moduleName,
      onRequire: onRequire,
      onError: onError
    }
  }

  opts.type = MODULE_TYPE.MESSAGE
  shimmer.registerInstrumentation(opts)
}

/**
 * Shuts down the agent.
 *
 * @param {object}  [options]                           object with shut down options
 * @param {boolean} [options.collectPendingData=false]  If true, the agent will send any
 *                                                      pending data to the collector
 *                                                      before shutting down.
 * @param {number}  [options.timeout]                   time in ms to wait before
 *                                                      shutting down
 * @param {function} [callback]                         callback function that runs when
 *                                                      agent stopped
 */
API.prototype.shutdown = function shutdown(options, cb) {
  var metric = this.agent.metrics.getOrCreateMetric(
    NAMES.SUPPORTABILITY.API + '/shutdown'
  )
  metric.incrementCallCount()

  var callback = cb
  if (!callback) {
    if (typeof options === 'function') {
      callback = options
    } else {
      callback = function noop() {}
    }
  }

  var agent = this.agent

  function cb_harvest(error) {
    if (error) {
      logger.error(
        error,
        'An error occurred while running last harvest before shutdown.'
      )
    }
    agent.stop(callback)
  }

  if (options && options.collectPendingData && agent._state !== 'started') {
    if (typeof options.timeout === 'number') {
      setTimeout(function shutdownTimeout() {
        agent.stop(callback)
      }, options.timeout).unref()
    } else if (options.timeout) {
      logger.warn(
        'options.timeout should be of type "number". Got %s',
        typeof options.timeout
      )
    }

    agent.on('started', function shutdownHarvest() {
      agent.harvest(cb_harvest)
    })
    agent.on('errored', function logShutdownError(error) {
      agent.stop(callback)
      if (error) {
        logger.error(
          error,
          'The agent encountered an error after calling shutdown.'
        )
      }
    })
  } else if (options && options.collectPendingData) {
    agent.harvest(cb_harvest)
  } else {
    agent.stop(callback)
  }
}

function _checkKeyLength(object, maxLength) {
  var keys = Object.keys(object)
  var badKey = false
  var len = keys.length
  var key = '' // init to string because gotta go fast
  for (var i = 0; i < len; i++) {
    key = keys[i]
    if (key.length > maxLength) {
      logger.warn(
        'recordCustomEvent requires keys to be less than 256 chars got %s (%s)',
        key,
        key.length
      )
      badKey = true
    }
  }
  return badKey
}

module.exports = API
