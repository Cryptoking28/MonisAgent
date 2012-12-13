/**
 * This file includes all of the configuration variables used by the Node.js
 * agent. If there's a configurable element of the agent and it's not described
 * in here, there's been a terrible mistake.
 */
exports.config = {
  /**
   * Array of application names.
   *
   * @env NEW_RELIC_APP_NAME
   */
  app_name : ['MyApplication'],
  /**
   * The user's license key. Must be set by per-app configuration file.
   *
   * @env NEW_RELIC_LICENSE_KEY
   */
  license_key : '',
  /**
   * Hostname for the Monis Agent collector proxy.
   *
   * You shouldn't need to change this.
   *
   * @env NEW_RELIC_HOST
   */
  host : 'collector.monisagent.com',
  /**
   * The port on which the collector proxy will be listening.
   *
   * You shouldn't need to change this.
   *
   * @env NEW_RELIC_PORT
   */
  port : 80,
  logging : {
    /**
     * Verbosity of the agent logs. The agent uses bunyan
     * (https://github.com/trentm/node-bunyan) for its logging, and as such
     * the valid logging levels are 'fatal', 'error', 'warn', 'info', 'debug'
     * and 'trace'. Logging at levels 'info' and higher is very terse. For
     * support requests, attaching logs captured at 'trace' level are extremely
     * helpful in chasing down bugs.
     *
     * @env NEW_RELIC_LOG_LEVEL
     */
    level : 'info',
    /**
     * Where to put the log file -- by default just uses process.cwd +
     * 'monisagent_agent.log'. A special case is a filepath of 'stdout',
     * in which case all logging will go to stdout, or 'stderr', in which
     * case all logging will go to stderr.
     *
     * @env NEW_RELIC_LOG
     */
    filepath : ''
  },
  /**
   * Whether the agent is enabled.
   *
   * @env NEW_RELIC_ENABLED
   */
  agent_enabled : true,
  /**
   * Whether to collect & submit error traces to Monis Agent.
   *
   * @env NEW_RELIC_ERRORS_ENABLED
   */
  error_collector : {
    enabled : true,
    /**
     * List of HTTP error status codes the error tracer should disregard.
     * Defaults to 404 NOT FOUND.
     *
     * @env NEW_RELIC_ERRORS_CODES_IGNORED
     */
    ignore_status_codes : [404]
  },
  transaction_tracer : {
    /**
     * Whether to collect & submit slow transaction traces to Monis Agent.
     *
     * @env NEW_RELIC_TRACER_ENABLED
     */
    enabled : true,
    /**
     * The duration at below which the slow transaction tracer should collect a
     * transaction trace. If set to 'apdex_f', the threshold will be set to
     * 4 * apdex_t, which with a default apdex_t value of 500 milliseconds will
     * be 2000 milliseconds.
     *
     * If a time is provided, it is set in milliseconds.
     *
     * @env NEW_RELIC_TRACER_THRESHOLD
     */
    trace_threshold : 'apdex_f'
  },
  /**
   * Whether to enable internal supportability metrics and diagnostics. You're
   * welcome to turn these on, but they will probably be most useful to the
   * Monis Agent node engineering team.
   */
  debug : {
    /**
     * Whether to collect and submit internal supportability metrics alongside
     * application performance metrics.
     *
     * @env NEW_RELIC_DEBUG_METRICS
     */
    internal_metrics : false,
    /**
     * Traces the execution of the transaction tracer. Requires logging.level
     * to be set to 'trace' to provide any useful output.
     *
     * @env NEW_RELIC_DEBUG_TRACER
     */
    tracer_tracing : false
  }
};
