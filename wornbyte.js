/**
 * Monis Agent agent configuration.
 *
 * See lib/config.defaults.js in the agent distribution for a more complete
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
  /**
   * Level at which to log. 'trace' is most useful to Monis Agent when diagnosing
   * issues with the agent, 'info' and higher will impose the least overhead on
   * production applications.
   */
  log_level : 'debug'
};
