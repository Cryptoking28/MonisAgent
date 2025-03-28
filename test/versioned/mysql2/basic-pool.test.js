/*
 * Copyright 2024 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const fs = require('node:fs')
const path = require('node:path')
const basicPoolTests = require('../mysql/basic-pool')
const constants = require('./constants')

// exports are defined in newer versions so must read file directly
let pkgVersion
try {
  ;({ version: pkgVersion } = require('mysql2/package'))
} catch {
  ;({ version: pkgVersion } = JSON.parse(
    fs.readFileSync(path.join(__dirname, '/node_modules/mysql2/package.json'))
  ))
}

basicPoolTests({ factory: () => require('mysql2'), constants, pkgVersion })
