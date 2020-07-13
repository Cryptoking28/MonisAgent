/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

/**
 * Allows users to `require('@monisagent/koa')` directly in their app. If they
 * for some reason choose to explicitly use an older version of our instrumentation
 * then the supportability metrics for custom instrumentation will trigger.
 */
const monisagent = require('monisagent')
monisagent.instrumentWebframework('koa', require('./lib/instrumentation'))
monisagent.instrumentWebframework('koa-route', require('./lib/route-instrumentation'))
monisagent.instrumentWebframework('koa-router', require('./lib/router-instrumentation'))
