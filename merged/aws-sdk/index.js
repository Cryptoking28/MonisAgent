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
monisagent.instrumentConglomerate('aws-sdk', require('./lib/instrumentation'))
monisagent.instrument({
  moduleName: '@aws-sdk/smithy-client',
  onResolved: require('./lib/smithy-client')
})
monisagent.instrumentMessages({
  moduleName: '@aws-sdk/client-sns',
  onResolved: require('./lib/v3-sns')
})
monisagent.instrumentMessages({
  moduleName: '@aws-sdk/client-dynamodb',
  onResolved: require('./lib/v3-client-dynamodb')
})
