/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import runTests from './pg.common.mjs'

runTests('native', async function getClient() {
  const { default: pg } = await import('pg')
  return pg.native
})
