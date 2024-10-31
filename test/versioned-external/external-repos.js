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
    name: 'apollo-server',
    repository: 'https://github.com/Cryptoking28/monisagent-node-apollo-server-plugin.git',
    branch: 'remove-child-segments',
    additionalFiles: [
      'tests/lib',
    ]
  }
]

module.exports = repos
