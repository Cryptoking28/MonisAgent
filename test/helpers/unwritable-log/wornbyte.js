/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

/**
 * Monis Agent agent configuration.
 *
 * See lib/config/default.js in the agent distribution for a more complete
 * description of configuration variables and their potential values.
 */
exports.config = {
  /**
   * Array of application names.
   */
  app_name: ['My Application'],
  /**
   * Your Monis Agent license key.
   */
  license_key: 'license key here',
  logging: {
    /**
     * Level at which to log. 'trace' is most useful to Monis Agent when diagnosing
     * issues with the agent, 'info' and higher will impose the least overhead on
     * production applications.
     */
    level: 'trace',
    filepath: __dirname + '/test.log'
  }
}
