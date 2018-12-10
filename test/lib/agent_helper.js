'use strict'

var path = require('path')
var fs = require('fs')
var architect = require('architect')
var async = require('async')
var shimmer = require('../../lib/shimmer')
var Agent = require('../../lib/agent')
var params = require('../lib/params')
var request = require('request')
const zlib = require('zlib')


/*
 * CONSTANTS
 */

var KEYPATH = path.join(__dirname, 'test-key.key')
var CERTPATH = path.join(__dirname, 'self-signed-test-certificate.crt')
var CAPATH = path.join(__dirname, 'ca-certificate.crt')


var _agent
var tasks = []
setInterval(function() {
  while (tasks.length) {
    tasks.pop()()
  }
}, 25).unref()

var helper = module.exports = {
  getAgent: function getAgent() {
    return _agent
  },

  /**
   * Set up an agent that won't try to connect to the collector, but also
   * won't instrument any calling code.
   *
   * @param object flags   Any feature flags
   * @param object options Any configuration to override in the agent.
   *                       See agent.js for details, but so far this includes
   *                       passing in a config object and the connection stub
   *                       created in this function.
   * @returns Agent Agent with a stubbed configuration.
   */
  loadMockedAgent: function loadMockedAgent(flags, conf) {
    if (_agent) {
      throw _agent.__created
    }

    // agent needs a 'real' configuration
    var configurator = require('../../lib/config')
    var config = configurator.initialize(conf)

    if (!config.debug) {
      config.debug = {}
    }

    // adds link to parents node in traces for easier testing
    config.debug.double_linked_transactions = true

    // stub applications
    config.applications = function faked() { return ['Monis Agent for Node.js tests'] }

    _agent = new Agent(config)
    _agent.__created = new Error('Only one agent at a time! This one was created at:')
    _agent.recordSupportability = function() {} // Stub supportabilities.

    if (flags) {
      var newFlags = Object.assign({}, _agent.config.feature_flag)
      newFlags = Object.assign(newFlags, flags)
      _agent.config.feature_flag = newFlags
    }

    global.__NR_agent = _agent
    return _agent
  },

  /**
   * Generate the URLs used to talk to the collector, which have a very
   * specific format. Useful with nock.
   *
   * @param String method The method being invoked on the collector.
   * @param number runID  Agent run ID (optional).
   *
   * @returns String URL path for the collector.
   */
  generateCollectorPath: function generateCollectorPath(method, runID, protocolVersion) {
    protocolVersion = protocolVersion || 17
    var fragment = '/agent_listener/invoke_raw_method?' +
      `marshal_format=json&protocol_version=${protocolVersion}&` +
      `license_key=license%20key%20here&method=${method}`

    if (runID) {
      fragment += '&run_id=' + runID
    }

    return fragment
  },

  /**
   * Builds on loadMockedAgent by patching the module loader and setting up
   * the instrumentation framework.
   *
   * @returns Agent Agent with a stubbed configuration.
   */
  instrumentMockedAgent: function instrumentMockedAgent(flags, conf) {
    shimmer.debug = true

    var agent = helper.loadMockedAgent(flags, conf)

    shimmer.patchModule(agent)
    shimmer.bootstrapInstrumentation(agent)
    return agent
  },

  /**
   * Shut down the agent, ensuring that any instrumentation scaffolding
   * is shut down.
   *
   * @param Agent agent The agent to shut down.
   */
  unloadAgent: function unloadAgent(agent) {
    agent.emit('unload')
    shimmer.unpatchModule()
    shimmer.unwrapAll()
    shimmer.debug = false

    // On all versions each agent will add an unhandledRejection handler. This
    // handler needs to be removed on unload.
    removeListenerByName(process, 'unhandledRejection', '__NR_unhandledRejectionHandler')

    if (agent === _agent) {
      global.__NR_agent = null
      _agent = null
    }
  },

  loadTestAgent: function loadTestAgent(t, flags, conf) {
    var agent = helper.instrumentMockedAgent(flags, conf)
    t.tearDown(function tearDown() {
      helper.unloadAgent(agent)
    })

    return agent
  },

  /**
   * Create a transactional scope in which instrumentation that will only add
   * trace segments to existing transactions will funciton.
   *
   * @param Agent agent The agent whose tracer should be used to create the
   *                    transaction.
   * @param Function callback The function to be run within the transaction.
   */
  runInTransaction: function runInTransaction(agent, type, callback) {
    if (callback === undefined && typeof type === 'function') {
      callback = type
      type = undefined
    }
    if (!(agent && callback)) {
      throw new TypeError('Must include both agent and function!')
    }
    type = type || 'web'

    return agent.tracer.transactionNestProxy(type, function onTransactionProxy() {
      var transaction = agent.getTransaction()
      return callback(transaction)
    })() // <-- invoke immediately
  },

  /**
   * Proxy for runInTransaction that names the transaction that the
   * callback is executed in
   */
  runInNamedTransaction: function runInNamedTransaction(agent, type, callback) {
    if (callback === undefined && typeof type === 'function') {
      callback = type
      type = undefined
    }

    return helper.runInTransaction(agent, type, function wrappedCallback(transaction) {
      transaction.name = 'TestTransaction'
      return callback(transaction)
    })
  },

  /**
   * Stub to bootstrap a memcached instance
   *
   * @param Function callback The operations to be performed while the server
   *                          is running.
   */
  bootstrapMemcached: function bootstrapMemcached(callback) {
    var Memcached = require('memcached')
    var memcached = new Memcached(params.memcached_host + ':' + params.memcached_port)
    memcached.flush(function(err) {
      memcached.end()
      callback(err)
    })
  },

  /**
   * Bootstrap a running MongoDB instance by dropping all the collections used
   * by tests
   *
   * @param Function callback The operations to be performed while the server
   *                          is running.
   */
  bootstrapMongoDB: function bootstrapMongoDB(mongodb, collections, callback) {
    if (!callback) {
      // bootstrapMongoDB(collections, callback)
      callback = collections
      collections = mongodb
      mongodb = require('mongodb')
    }

    var server = new mongodb.Server(params.mongodb_host, params.mongodb_port, {
      auto_reconnect: true
    })
    var db = new mongodb.Db('integration', server, {
      w: 1,
      safe: true,
      numberOfRetries: 10,
      wtimeout: 100,
      retryMiliSeconds: 300
    })

    db.open(function(err) {
      if (err) {
        return callback(err)
      }

      async.eachSeries(collections, function(collection, cb) {
        db.dropCollection(collection, function(err) {
          // It's ok if the collection didn't exist before
          if (err && err.errmsg === 'ns not found') {
            err = null
          }

          cb(err)
        })
      }, function(err) {
        db.close(function(err2) {
          callback(err || err2)
        })
      })
    })
  },

  /**
   * Use c9/architect to bootstrap a MySQL server for running integration
   * tests.
   *
   * @param Function callback The operations to be performed while the server
   *                          is running.
   */
  bootstrapMySQL: function bootstrapMySQL(callback) {
    var bootstrapped = path.join(__dirname, 'architecture/mysql-bootstrapped.js')
    var config = architect.loadConfig(bootstrapped)
    architect.createApp(config, function(error, app) {
      if (error) {
        return callback(error)
      }

      return callback(null, app)
    })
  },

  /**
   * Select Redis DB index and flush entries in it.
   *
   * @param {redis} [redis]
   * @param {number} dbIndex
   * @param {function} callback
   *  The operations to be performed while the server is running.
   */
  bootstrapRedis: function bootstrapRedis(redis, dbIndex, callback) {
    if (!callback) {
      // bootstrapRedis(dbIndex, callback)
      callback = dbIndex
      dbIndex = redis
      redis = require('redis')
    }
    var client = redis.createClient(params.redis_port, params.redis_host)
    client.select(dbIndex, function(err) {
      if (err) {
        client.end(true)
        return callback(err)
      }

      client.flushdb(function(err) {
        client.end(true)
        callback(err)
      })
    })
  },

  withSSL: function(callback) {
    fs.readFile(KEYPATH, function(error, key) {
      if (error) {
        return callback(error)
      }

      fs.readFile(CERTPATH, function(error, certificate) {
        if (error) {
          return callback(error)
        }

        fs.readFile(CAPATH, function(error, ca) {
          if (error) {
            return callback(error)
          }

          callback(null, key, certificate, ca)
        })
      })
    })
  },

  // FIXME: I long for the day I no longer need this gross hack
  onlyDomains: function() {
    var exceptionHandlers = process._events.uncaughtException
    if (exceptionHandlers) {
      if (Array.isArray(exceptionHandlers)) {
        process._events.uncaughtException = exceptionHandlers.filter(function(f) {
          return f.name === 'uncaughtHandler'
        })
      } else if (exceptionHandlers.name !== 'uncaughtException') {
        delete process._events.uncaughtException
      }
    }

    return exceptionHandlers
  },

  randomPort: function(callback) {
    var net = require('net')
    // Min port: 1024 (without root)
    // Max port: 65535
    // Our range: 1024-65024
    var port = Math.ceil(Math.random() * 64000 + 1024)
    var server = net.createServer().once('listening', function() {
      server.close(function onClose() {
        process.nextTick(callback.bind(null, port))
      })
    }).once('error', function(err) {
      if (err.code === 'EADDRINUSE') {
        helper.randomPort(callback)
      } else {
        throw err
      }
    })
    server.listen(port)
  },

  makeGetRequest: function(url, options, callback) {
    if (!options || typeof options === 'function') {
      callback = options
      options = {}
    }
    request.get(url, options, function requestCb(error, response, body) {
      if (error && error.code === 'ECONNREFUSED') {
        request.get(url, options, requestCb)
      } else if (typeof callback === 'function') {
        callback(error, response, body)
      }
    })
  },

  temporarilyRemoveListeners: function(t, emitter, evnt) {
    if (!emitter) {
      t.comment('Not removing %s listeners, emitter does not exist', evnt)
      return
    }

    t.comment('Removing listeners for %s', evnt)
    var listeners = emitter.listeners(evnt)
    t.tearDown(function() {
      t.comment('Re-adding listeners for %s', evnt)
      listeners.forEach(function(fn) {
        process.on('uncaughtException', fn)
      })
      listeners = []
    })
    emitter.removeAllListeners(evnt)
  },

  runOutOfContext: function(fn) {
    tasks.push(fn)
  },

  decodeServerlessPayload: (t, payload, cb) => {
    if (!payload) {
      t.comment('No payload to decode')
      return cb()
    }

    zlib.gunzip(Buffer.from(payload, 'base64'), (err, decompressed) => {
      if (err) {
        t.comment('Error occurred when decompressing payload')
        return cb(err)
      }

      let parsed = null
      try {
        parsed = JSON.parse(decompressed)
        cb(null, parsed)
      } catch (err) {
        cb(err)
      }
    })
  }
}

/**
 * Removes all listeners with the given name from the emitter.
 *
 * @param {EventEmitter}  emitter       - The emitter with listeners to remove.
 * @param {string}        eventName     - The event to search within.
 * @param {string}        listenerName  - The name of the listeners to remove.
 */
function removeListenerByName(emitter, eventName, listenerName) {
  var listeners = emitter.listeners(eventName)
  for (var i = 0, len = listeners.length; i < len; ++i) {
    var listener = listeners[i]
    if (typeof listener === 'function' && listener.name === listenerName) {
      emitter.removeListener(eventName, listener)
    }
  }
}
