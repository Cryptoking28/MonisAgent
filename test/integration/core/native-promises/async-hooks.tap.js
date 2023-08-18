/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const exec = require('child_process').execSync
exec('NEW_RELIC_FEATURE_FLAG_LEGACY_CONTEXT_MANAGER=1 node --expose-gc ./async-hooks.js', {
  stdio: 'inherit',
  cwd: __dirname
})
