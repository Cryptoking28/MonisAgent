/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

require('../../../index') // same as require('monisagent')
const express = require('express')

const app = express()

app.get('/', (req, res) => {
  req.resume()
  res.end('hello world!')
})

const server = app.listen(0, () => {
  process.send(server.address().port)
})
