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
  app_name: ['express smoke test'],
  /**
   * Your Monis Agent license key.
   */
  license_key: 'd67afc830dab717fd163bfcb0b8b88423e9a1a3b',
  logging: {
    /**
     * Level at which to log. 'trace' is most useful to Monis Agent when diagnosing
     * issues with the agent, 'info' and higher will impose the least overhead on
     * production applications.
     */
    level: 'info'
  },
  host: 'staging-collector.monisagent.com'
}
