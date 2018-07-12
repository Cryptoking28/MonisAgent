'use strict'

exports.getServer = function getServer(cfg) {
  cfg = cfg || {}
  var host = cfg.host || 'localhost'
  var port = cfg.port || 0
  var opts = cfg.options || {}
  var hapi = cfg.hapi || require('hapi')

  // v17 exports two references to the server object,
  // so we'll let fate decide which to use for a given test
  const servers = ['Server', 'server']
  const server = servers[Math.round(Math.random())]

  console.log(`Testing with hapi.${server}`)
  return hapi[server](Object.assign({}, opts, {host, port}))
}
