exports.config = {
  app_name           : ['My Application'],
  license_key        : 'license key here',
  logging            : {
    level : 'trace',
    enabled: false,
    filepath : '../../../monisagent_agent.log'
  },
  utilization: {
    detect_aws: false,
    detect_docker: false
  },
  transaction_tracer : {
    enabled : true
  }
}
