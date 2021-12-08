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
    name: 'superagent',
    repository: 'https://github.com/Cryptoking28/monisagent-superagent.git',
    branch: 'main'
  }
]

module.exports = repos
