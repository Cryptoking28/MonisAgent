#! /usr/bin/env node
/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const errorAndExit = (err, message, code) => {
  console.log(message)
  console.error(err)
  process.exit(code)
}

module.exports = {
  errorAndExit
}
