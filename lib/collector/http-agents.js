/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const { HttpsProxyAgent } = require('https-proxy-agent')
const logger = require('../logger').child({ component: 'http-agent' })
const https = require('https')

// poor person's single-instance-objects.  We
// only ever instantiate one of each HTTP-agent
// and just reuse the same object in all the
// requests. This is how node does keep-alive.
let agentKeepAlive = null
let agentProxyWithKeepAlive = null

/**
 * Returns an HTTP agent with keep-alive enabled
 *
 * @param config
 */
exports.keepAliveAgent = function keepAliveAgent(config) {
  config = config ? config : {}

  // always return the same agent instance, which
  // ensures all requests share the same http
  // connection
  if (agentKeepAlive !== null) {
    return agentKeepAlive
  }

  config.keepAlive = true
  agentKeepAlive = new https.Agent(config)
  return agentKeepAlive
}

/**
 * Returns an HTTP-agent provided by the https-proxy-agent
 * NPM package with configuration suitable for working via
 * the configured monisagent-agent's proxy configuration.
 *
 * Include keep-alive configuration, but ultimately its up
 * to the proxy server as to how its connection is made
 * with Monis Agent's servers.
 *
 * @param config
 */
exports.proxyAgent = function proxyAgent(config) {
  if (agentProxyWithKeepAlive !== null) {
    return agentProxyWithKeepAlive
  }
  const proxyUrl = proxyOptions(config)

  // Tests may supply 127.0.0.1 as the host, but SNI requires a hostname.
  const servername = config.host
  const proxyOpts = {
    secureEndpoint: config.ssl,
    auth: proxyUrl.auth,
    ca: config?.certificates?.length ? config.certificates : [],
    keepAlive: true,
    servername
  }

  logger.info(`using proxy: ${proxyUrl}`)
  agentProxyWithKeepAlive = new HttpsProxyAgent(proxyUrl, proxyOpts)
  return agentProxyWithKeepAlive
}

function proxyOptions(config) {
  let proxyUrl
  if (config.proxy) {
    proxyUrl = config.proxy
  } else {
    proxyUrl = 'https://'
    let proxyAuth = config.proxy_user
    if (config.proxy_pass !== '') {
      proxyAuth += ':' + config.proxy_pass
      proxyUrl += `${proxyAuth}@`
    }

    proxyUrl += `${config.proxy_host || 'localhost'}:${config.proxy_port || 80}`
  }

  return proxyUrl
}
