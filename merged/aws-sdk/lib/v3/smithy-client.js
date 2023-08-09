/*
 * Copyright 2021 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const { middlewareConfig } = require('./common')
const { snsMiddlewareConfig } = require('./sns')
const { sqsMiddlewareConfig } = require('./sqs')
const { dynamoMiddlewareConfig } = require('./dynamodb')
const MIDDLEWARE = Symbol('nrMiddleware')

const middlewareByClient = {
  Client: middlewareConfig,
  SNSClient: [...middlewareConfig, snsMiddlewareConfig],
  SQSClient: [...middlewareConfig, sqsMiddlewareConfig],
  DynamoDBClient: [...middlewareConfig, dynamoMiddlewareConfig],
  DynamoDBDocumentClient: [...middlewareConfig, dynamoMiddlewareConfig]
}

module.exports = function instrumentSmithyClient(shim, smithyClientExport) {
  if (!shim.isFunction(smithyClientExport?.Client?.prototype?.send)) {
    shim.logger.debug('Could not find Smithy Client, not instrumenting.')
  } else {
    shim.wrap(smithyClientExport.Client.prototype, 'send', wrapSend)
  }
}

function wrapSend(shim, send) {
  return function wrappedSend() {
    const client = this?.constructor?.name
    const config = this.config
    const middlewares = middlewareByClient[client] || middlewareByClient.Client

    // only attach the middleware to the stack instance once
    // We just assign a symbol indicating this application
    // This was refactored when we went from instrumentation when module was resolved
    // to compiled which did not allow us to instrument the constructor as it lacked
    // at getter.
    if (!this[MIDDLEWARE]) {
      this[MIDDLEWARE] = true
      for (const mw of middlewares) {
        const localShim = shim.makeSpecializedShim(mw.type, client)
        const middleware = mw.middleware.bind(null, localShim, config)
        this.middlewareStack.add(middleware, mw.config)
      }
    }

    return send.apply(this, arguments)
  }
}
