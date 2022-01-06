/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

/**
 * Allows users to `require('@monisagent/aws-sdk')` directly in their app. If they
 * for some reason choose to explicitly use an older version of our instrumentation
 * then the supportability metrics for custom instrumentation will trigger.
 */
const monisagent = require('monisagent')
const semver = require('semver')
const agentVersion = monisagent && monisagent.agent && monisagent.agent.version
monisagent.instrumentConglomerate('aws-sdk', require('./lib/v2/instrumentation'))

// TODO: Remove this semver check and semver module when we ship Node 18 support
// A bug existed in 8.6.0 when we introduced the `onResolved` hook.
// See: https://github.com/Cryptoking28/monisagent/pull/986
// To avoid unnecessary support issues we will require agent version >= 8.7.0 to
// register AWS SDK v3 instrumentation
if (!semver.satisfies(agentVersion, '>=8.7.0')) {
  monisagent.shim.logger.warn(
    'The Monis Agent Node.js agent must be >= 8.7.0 to instrument AWS SDK v3, current version: %s',
    agentVersion
  )
  return
}

monisagent.instrument({
  moduleName: '@aws-sdk/smithy-client',
  onResolved: require('./lib/v3/smithy-client')
})
monisagent.instrumentMessages({
  moduleName: '@aws-sdk/client-sns',
  onResolved: require('./lib/v3/sns')
})
monisagent.instrumentMessages({
  moduleName: '@aws-sdk/client-sqs',
  onResolved: require('./lib/v3/sqs')
})
monisagent.instrumentDatastore({
  moduleName: '@aws-sdk/client-dynamodb',
  onResolved: require('./lib/v3/client-dynamodb')
})
monisagent.instrumentDatastore({
  moduleName: '@aws-sdk/lib-dynamodb',
  onResolved: require('./lib/v3/lib-dynamodb')
})
