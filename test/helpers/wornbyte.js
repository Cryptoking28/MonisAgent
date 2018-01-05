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
  app_name : ['My Application'],
  /**
   * Your Monis Agent license key.
   */
  license_key : 'license key here',
  utilization: {
    detect_aws: false,
    detect_pcf: false,
    detect_azure: false,
    detect_gcp: false,
    detect_docker: false
  },
  logging : {
    /**
     * Level at which to log. 'trace' is most useful to Monis Agent when diagnosing
     * issues with the agent, 'info' and higher will impose the least overhead on
     * production applications.
     */
    level : 'trace'
  }
}
