/*
 * Copyright 2023 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const Github = require('./github')

const SUPPORT_STATEMENT_HEADER = '### Support statement:'
const SUPPORT_STATEMENT_BODY = `* Monis Agent recommends that you upgrade the agent regularly to ensure that you're getting the latest features and performance benefits. Additionally, older releases will no longer be supported when they reach [end-of-life](https://docs.monisagent.com/docs/using-monis-agent/cross-product-functions/install-configure/notification-changes-monis-agent-saas-features-distributed-software).`

module.exports = async function updateRelease() {
  const org = process.env.RELEASE_ORG || 'monisagent'
  const repo = process.env.RELEASE_REPO || 'node-monisagent'
  const tag = process.env.RELEASE_TAG

  if (!tag || tag === '') {
    throw new Error('RELEASE_TAG is a required environment variable')
  }

  const github = new Github(org, repo)

  const { id, body } = await github.getReleaseByTag(tag)

  if (body.match(SUPPORT_STATEMENT_HEADER)) {
    console.log(`Release ${id} already has support statement, skipping`)
    return
  }

  await github.updateRelease({
    release_id: id,
    body: [body, SUPPORT_STATEMENT_HEADER, SUPPORT_STATEMENT_BODY].join('\n')
  })
}
