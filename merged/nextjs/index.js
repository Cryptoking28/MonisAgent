/*
 * Copyright 2022 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

/**
 * Allows users to `require('@monisagent/next')` directly in their app. If they
 * for some reason choose to explicitly use an older version of our instrumentation
 * then the supportability metrics for custom instrumentation will trigger.
 */
const monisagent = require('monisagent')

monisagent.instrumentWebframework('./next-server', require('./lib/next-server'))
monisagent.instrumentWebframework('./render', require('./lib/render'))
monisagent.instrumentWebframework('./context', require('./lib/context'))
