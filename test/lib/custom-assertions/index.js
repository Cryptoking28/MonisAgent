/*
 * Copyright 2024 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const fs = require('node:fs')

module.exports = {}

const entries = fs.readdirSync(__dirname, { withFileTypes: true, encoding: 'utf8' })
for (const entry of entries) {
  if (entry.isFile() === false || entry.name === 'index.js' || entry.name === 'Readme.md') {
    continue
  }

  try {
    const fn = require(`./${entry.name}`)
    module.exports[fn.name] = fn
  } catch (error) {
    console.log(`could not load ${entry.name}: ${error.message}`)
    throw error
  }
}
