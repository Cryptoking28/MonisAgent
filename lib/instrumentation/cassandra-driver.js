/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const semver = require('semver')

/**
 * Instruments the `cassandra-driver` module, function that is
 * passed to `onRequire` when instantiating instrumentation.
 *
 * @param {object} _agent - MonisAgent agent
 * @param {object} cassandra - The cassandra-driver library definition
 * @param {string} _moduleName - String representation of require/import path
 * @param {object} shim - shim for instrumentation
 */
module.exports = function initialize(_agent, cassandra, _moduleName, shim) {
  const cassandraVersion = shim.require('./package.json').version

  shim.setDatastore(shim.CASSANDRA)

  const ClientProto = cassandra.Client.prototype
  const RequestExecutionProto = shim.require('./lib/request-execution.js').prototype

  shim.recordOperation(ClientProto, ['connect', 'shutdown'], { callback: shim.LAST })

  if (semver.satisfies(cassandraVersion, '>=4.4.0')) {
    shim.recordQuery(ClientProto, '_execute', {
      query: shim.FIRST,
      callback: shim.LAST
    })
  } else {
    shim.recordQuery(ClientProto, '_innerExecute', {
      query: shim.FIRST,
      callback: shim.LAST
    })

    shim.wrap(RequestExecutionProto, 'start', function wrapStart(shim, start) {
      return function wrappedStart() {
        const parent = shim.getSegment()

        if (!parent) {
          return start.apply(this, arguments)
        }

        const args = shim.argsToArray.apply(shim, arguments)
        shim.bindCallbackSegment(args, shim.LAST, parent)
        return start.apply(this, args)
      }
    })
  }

  shim.wrap(
    RequestExecutionProto,
    '_sendOnConnection',
    function wrapSendOnConnection(shim, _sendOnConnection) {
      return function wrappedSendOnConnection() {
        shim.captureInstanceAttributes(
          this._connection.address,
          this._connection.port,
          this._connection.keyspace
        )

        return _sendOnConnection.apply(this, arguments)
      }
    }
  )

  shim.recordBatchQuery(ClientProto, 'batch', {
    query: findBatchQueryArg,
    callback: shim.LAST
  })
}

/**
 * Given the arguments for Cassandra's `batch` method, this finds the first
 * query in the batch.
 *
 * @param {object} _shim - shim for instrumentation
 * @param {Function} _batch - original batch function
 * @param {string} _fnName - the function name (batch)
 * @param {Array} args - original arguments passed to the batch function
 * @returns {string} The query for this batch request.
 */
function findBatchQueryArg(_shim, _batch, _fnName, args) {
  const sql = (args[0] && args[0][0]) || ''
  return sql.query || sql
}
