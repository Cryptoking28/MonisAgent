'use strict'

var logger = require('./lib/logger.js')
var RealAPI = require('./api.js')


/* eslint-disable no-eval */
function stubFunction(name) {
  return eval("(function () {return function " + name + "() {" +
              "logger.debug('Not calling " + name + " because Monis Agent is disabled.');" +
              "}}())")
}
/* eslint-enable no-eval */

function Stub() {}

var keys = Object.keys(RealAPI.prototype)
var length = keys.length


/* This way the stub API doesn't have to be updated in lockstep with the regular
 * API.
 */
for (var i = 0; i < length; i++) {
  var functionName = keys[i]
  Stub.prototype[functionName] = stubFunction(functionName)
}

Stub.prototype.createTracer = createTracer
Stub.prototype.createWebTransaction = createWebTransaction
Stub.prototype.createBackgroundTransaction = createBackgroundTransaction
Stub.prototype.getTransaction = getTransaction
Stub.prototype.getBrowserTimingHeader = getBrowserTimingHeader
Stub.prototype.shutdown = shutdown

// This code gets injected into HTML templates
// and we don't want it to return undefined/null.
function getBrowserTimingHeader() {
  logger.debug('Not calling getBrowserTimingHeader because Monis Agent is disabled.')
  return ''
}

function getTransaction() {
  return {
    end: function stubbedEnd() {
      logger.debug('Not calling transaction.end because Monis Agent is disabled')
    },
    ignore: function stubbedIgnore() {
      logger.debug('Not calling transaction.ignore because Monis Agent is disabled')
    }
  }
}

// Normally the following 3 calls return a wrapped callback, instead we
// should just return the callback in its unwrapped state.
function createTracer(name, callback) {
  logger.debug('Not calling createTracer because Monis Agent is disabled.')
  return callback
}

function createWebTransaction(url, callback) {
  logger.debug('Not calling createWebTransaction because Monis Agent is disabled.')
  return callback
}

function createBackgroundTransaction(name, group, callback) {
  logger.debug('Not calling createBackgroundTransaction because Monis Agent is disabled.')
  return (callback === undefined) ? group : callback
}

// Normally the following call executes callback asynchronously
function shutdown(options, cb) {
  logger.debug('Not calling shutdown because Monis Agent is disabled.')
  
  var callback = cb
  if (!callback) {
    if (typeof options === 'function') {
      callback = options
    } else {
      callback = new Function()
    }
  }
  
  process.nextTick(callback)
}

module.exports = Stub
