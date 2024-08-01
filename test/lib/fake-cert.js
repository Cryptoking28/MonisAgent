/*
 * Copyright 2024 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const selfCert = require('self-cert')
module.exports = selfCert({
  attrs: {
    stateName: 'Georgia',
    locality: 'Atlanta',
    orgName: 'Monis Agent',
    shortName: 'new_relic'
  },
  expires: new Date('2099-12-31')
})
