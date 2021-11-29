/*
 * Copyright 2021 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const tap = require('tap')
const utils = require('@monisagent/test-utilities')

const common = require('../common')
const { createEmptyResponseServer, FAKE_CREDENTIALS } = require('../aws-server-stubs')

tap.test('LambdaClient', (t) => {
  t.autoend()
  let helper = null
  let server = null
  let service = null
  let AddLayerVersionPermissionCommand = null

  t.beforeEach(async () => {
    server = createEmptyResponseServer()
    await new Promise((resolve) => {
      server.listen(0, resolve)
    })
    helper = utils.TestAgent.makeInstrumented()
    common.registerCoreInstrumentation(helper)
    const { LambdaClient, ...lib } = require('@aws-sdk/client-lambda')
    AddLayerVersionPermissionCommand = lib.AddLayerVersionPermissionCommand
    const endpoint = `http://localhost:${server.address().port}`
    service = new LambdaClient({
      credentials: FAKE_CREDENTIALS,
      endpoint,
      region: 'us-east-1'
    })
  })

  t.afterEach(() => {
    server.destroy()
    helper && helper.unload()
  })

  t.test('AddLayerVersionPermissionCommand', (t) => {
    helper.runInTransaction(async (tx) => {
      const cmd = new AddLayerVersionPermissionCommand({
        Action: 'lambda:GetLayerVersion' /* required */,
        LayerName: 'STRING_VALUE' /* required */,
        Principal: '*' /* required */,
        StatementId: 'STRING_VALUE' /* required */,
        VersionNumber: 2 /* required */,
        OrganizationId: 'o-0123456789',
        RevisionId: 'STRING_VALUE'
      })
      await service.send(cmd)
      tx.end()
      setImmediate(common.checkExternals, {
        t,
        service: 'Lambda',
        operations: ['AddLayerVersionPermissionCommand'],
        tx
      })
    })
  })
})
