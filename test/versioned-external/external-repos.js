/*
 * Copyright 2021 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

/**
 * name: folder name to checkout the repo into.
 * repository: repo URL to clone from.
 * branch: branch to checkout
 * additionalFiles: String array of files/folders to checkout in addition to lib and tests/versioned.
 */
const repos = [
  {
    name: 'aws-sdk',
    repository: 'https://github.com/Cryptoking28/monisagent-aws-sdk.git',
    branch: 'main'
  },
  {
    name: 'koa',
    repository: 'https://github.com/Cryptoking28/monisagent-koa.git',
    branch: 'main'
  },
  {
    name: 'next',
    repository: 'https://github.com/Cryptoking28/monisagent-node-nextjs.git',
    branch: 'prefix-route-params'
  },
  {
    name: 'superagent',
    repository: 'https://github.com/Cryptoking28/monisagent-superagent.git',
    branch: 'main'
  },
  {
    name: 'apollo-server',
    repository: 'https://github.com/Cryptoking28/monisagent-node-apollo-server-plugin.git',
    branch: 'main',
    additionalFiles: [
      'tests/agent-testing.js',
      'tests/create-apollo-server-setup.js',
      'tests/data-definitions.js',
      'tests/test-client.js',
      'tests/utils.js'
    ]
  }
]

module.exports = repos
