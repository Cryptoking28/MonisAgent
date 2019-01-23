'use strict'

const sinon = require('sinon')
const tap = require('tap')
const utils = require('@monisagent/test-utilities')

tap.test('aws-sdk', (t) => {
  t.autoend()

  let helper = null
  let AWS = null

  t.beforeEach((done) => {
    helper = utils.TestAgent.makeInstrumented()
    helper.registerInstrumentation({
      moduleName: 'aws-sdk',
      type: 'conglomerate',
      onRequire: require('../../lib/instrumentation')
    })
    AWS = require('aws-sdk')
    done()
  })

  t.afterEach((done) => {
    helper && helper.unload()
    AWS = null
    done()
  })

  t.test('should mark requests to be dt-disabled', (t) => {
    const https = require('https')
    sinon.spy(https, 'request')
    t.tearDown(() => {
      // `afterEach` runs before `tearDown`, so the sinon spy may have already
      // been removed.
      if (https.request.restore) {
        https.request.restore()
      }
    })

    AWS.config.update({
      region: 'region',
      credentials: new AWS.CognitoIdentityCredentials({
        IdentityPoolId: 'foobar'
      })
    })

    const s3 = new AWS.S3({
      apiVersion: '2006-03-01',
      params: {Bucket: 'bucket'}
    })
    s3.listObjects({Delimiter: '/'}, () => {})

    if (t.ok(https.request.calledOnce, 'should call http.request')) {
      const args = https.request.getCall(0).args
      const headers = args[0].headers
      const symbols = Object.getOwnPropertySymbols(headers).filter((s) => {
        return s.toString() === 'Symbol(Disable distributed tracing)'
      })
      t.equal(symbols.length, 1, 'should have disabled dt')
    }
    t.end()
  })
})
