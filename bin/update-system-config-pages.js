/*
 * Copyright 2021 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'
const request = require('request')
const util = require('util')
const requestAsync = util.promisify(request)
const { program } = require('commander')
const API_ENDPOINT = '/v2/system_configuration.json'
const STAGING_HOST = 'https://staging-api.monisagent.com'
const PRD_US_HOST = 'https://api.monisagent.com'
const PRD_EU_HOST = 'https://api.eu.monisagent.com'

program.requiredOption('--version <version>', 'New version of node agent')
program.requiredOption('--staging-key <key>', 'Monis Agent API key for staging')
program.requiredOption('--prod-key <key>', 'Monis Agent API Key for prod')

/**
 * Generates the post body with the proper agent version
 *
 * @param {string} version new agent version
 * @returns {object} body payload
 */
function getPayload(version) {
  return {
    system_configuration: {
      key: 'nodejs_agent_version',
      value: version.substr(1) // strip the v from v1.0.0
    }
  }
}

/**
 * Formats the request object based on host, version, and api key
 *
 * @param {string} host API host endpoint
 * @param {string} version new agent version
 * @param {string} key API key for relevant host
 * @returns {object} formatted request object
 */
function formatRequest(host, version, key) {
  return {
    uri: `${host}${API_ENDPOINT}`,
    method: 'POST',
    json: true,
    headers: {
      'X-Api-Key': key
    },
    body: getPayload(version)
  }
}

/**
 * Makes 3 concurrent requests to staging, production US and EU to update
 * the system configuration pages for the nodejs_agent_version
 */
async function updateSystemConfigs() {
  const errors = []
  program.parse()
  const opts = program.opts()
  const stagingRequest = requestAsync(formatRequest(STAGING_HOST, opts.version, opts.stagingKey))
  const prodUsRequest = requestAsync(formatRequest(PRD_US_HOST, opts.version, opts.prodKey))
  const prodEuRequest = requestAsync(formatRequest(PRD_EU_HOST, opts.version, opts.prodKey))
  try {
    const responses = await Promise.all([stagingRequest, prodUsRequest, prodEuRequest])
    responses.forEach((res) => {
      if (![200, 201].includes(res.statusCode)) {
        errors.push(JSON.stringify(res.body))
      }
    })

    if (errors.length) {
      throw new Error(errors)
    }
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

updateSystemConfigs()
