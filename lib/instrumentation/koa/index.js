'use strict'

/**
 * Allows users to `require('@monisagent/koa')` directly in their app. If they
 * for some reason choose to explicitly use an older version of our instrumentation
 * then the supportability metrics for custom instrumentation will trigger.
 */
var monisagent = require('monisagent')
monisagent.instrumentWebframework('koa', require('./lib/instrumentation'))
