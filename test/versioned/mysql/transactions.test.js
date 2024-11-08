/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'
const transactionTests = require('./transactions')
const constants = require('./constants')

transactionTests({ factory: () => require('mysql'), constants })
