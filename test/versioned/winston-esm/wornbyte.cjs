/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

exports.config = {
  app_name: ['Monis Agent for Node.js tests'],
  license_key: 'license key here',
  logging: {
    level: 'trace',
    filepath: '../../../monisagent_agent.log'
  },
  utilization: {
    detect_aws: false,
    detect_pcf: false,
    detect_azure: false,
    detect_gcp: false,
    detect_docker: false
  },
  distributed_tracing: {
    enabled: true
  },
  transaction_tracer: {
    enabled: true
  }
}
