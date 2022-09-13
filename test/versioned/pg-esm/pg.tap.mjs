/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import runTests from './pg.common.mjs'

runTests('pure JavaScript', async function getClient() {
  const pgExport = await import('pg')
  return pgExport.default
})
