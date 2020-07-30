/*
* Copyright 2020 Monis Agent Corporation. All rights reserved.
* SPDX-License-Identifier: Apache-2.0
*/
'use strict'

module.exports = [{
  type: 'conglomerate',
  moduleName: 'aws-sdk',
  onRequire: require('./lib/instrumentation')
}]
