'use strict'

module.exports.ERRORS = {
  INVALID_LICENSE: 'MonisAgent::Agent::LicenseException',
  LIMIT_EXCEEDED: 'MonisAgent::Agent::InternalLimitExceeded',
  RESTART: 'MonisAgent::Agent::ForceRestartException',
  DISCONNECT: 'MonisAgent::Agent::ForceDisconnectException',
  MAINTENANCE: 'MonisAgent::Agent::MaintenanceError',
  RUNTIME: 'RuntimeError'
}
