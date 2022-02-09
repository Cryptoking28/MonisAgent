/*
 * Copyright 2022 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const helpers = module.exports
const { exec } = require('child_process')
const http = require('http')

/**
 * Builds a Next.js app
 * @param {string} [path=app] path to app
 * @returns {Promise}
 *
 */
helpers.build = function build(path = 'app') {
  return new Promise((resolve, reject) => {
    exec(
      `./node_modules/.bin/next build ${path}`,
      {
        cwd: __dirname
      },
      function cb(err, data) {
        if (err) {
          reject(err)
        }

        resolve(data)
      }
    )
  })
}

/**
 * Bootstraps and starts the Next.js app
 * @param {string} [path=app] path to app
 * @param {number} [port=3001]
 * @returns {Promise}
 */
helpers.start = async function start(path = 'app', port = 3001) {
  // Needed to support the various locations tests may get loaded from (versioned VS tap <file> VS IDE debugger)
  const fullPath = `${__dirname}/${path}`

  const { startServer } = require('next/dist/server/lib/start-server')
  const app = await startServer({
    dir: fullPath,
    hostname: 'localhost',
    port
  })

  await app.prepare()
  return app
}

/**
 * Makes a http GET request to uri specified
 *
 * @param {string} uri make sure to include `/`
 * @param {number} [port=3001]
 * @returns {Promise}
 */
helpers.makeRequest = function (uri, port = 3001) {
  const url = `http://localhost:${port}${uri}`
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        resolve(res)
      })
      .on('error', reject)
  })
}
