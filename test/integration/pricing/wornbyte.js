exports.config = {
  app_name           : ['My Application'],
  license_key        : 'license key here',
  logging            : {
    level : 'trace',
    filepath : '../../monisagent_agent.log'
  },
  utilization: {
    detect_aws: true,
    detect_azure: true,
    detect_docker: true
  },
  transaction_tracer : {
    enabled : true
  }
}
