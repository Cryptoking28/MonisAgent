'use strict'

/**
 * Allows users to `require('@monisagent/aws-sdk')` directly in their app. If they
 * for some reason choose to explicitly use an older version of our instrumentation
 * then the supportability metrics for custom instrumentation will trigger.
 */
const monisagent = require('monisagent')
monisagent.instrumentConglomerate('aws-sdk', require('./lib/instrumentation'))
