/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

exports.config = {
  app_name: ['My Application'],
  license_key: 'license key here',
  logging: {
    level: 'debug',
    filepath: '../../../monisagent_agent.log'
  },
  utilization: {
    detect_aws: false,
    detect_pcf: false,
    detect_azure: false,
    detect_gcp: false,
    detect_docker: false
  }
}
