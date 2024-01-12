/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'
const UNKNOWN = 'Unknown'
const DESTINATIONS = {
  TRANS_EVENT: 0x01
}

function grabLastUrlSegment(url = '/') {
  // cast URL as string, and an empty
  // string for null, undefined, NaN etc.
  url = '' + (url || '/')
  const lastSlashIndex = url.lastIndexOf('/')
  return url.substr(lastSlashIndex + 1)
}

/**
 * Retrieves the db segment params from endpoint and command parameters
 *
 * @param {Object} endpoint instance of ddb endpoint
 * @param {Object} params parameters passed to a ddb command
 * @returns {Object}
 */
function setDynamoParameters(endpoint, params) {
  return {
    host: endpoint && (endpoint.host || endpoint.hostname),
    port_path_or_id: (endpoint && endpoint.port) || 443,
    collection: (params && params.TableName) || UNKNOWN
  }
}

module.exports = {
  grabLastUrlSegment,
  setDynamoParameters,
  DESTINATIONS
}
