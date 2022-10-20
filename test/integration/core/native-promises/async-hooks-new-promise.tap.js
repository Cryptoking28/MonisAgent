/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const exec = require('child_process').execSync
exec('NEW_RELIC_FEATURE_FLAG_ASYNC_LOCAL_CONTEXT=0 node --expose-gc ./async-hooks-new-promise.js', {
  stdio: 'inherit',
  cwd: __dirname
})
