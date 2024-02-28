/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'
const tap = require('tap')
const { grabLastUrlSegment, setDynamoParameters } = require('../../lib/util')

function DatastoreParametersMock(params) {
  this.host = params.host ?? null
  this.port_path_or_id = params.port_path_or_id ?? null
  this.database_name = params.database_name ?? null
  this.collection = params.collection ?? null
}
tap.test('Utility Functions', (t) => {
  t.ok(grabLastUrlSegment, 'imported function successfully')

  const fixtures = [
    {
      input: '/foo/baz/bar',
      output: 'bar'
    },
    {
      input: null,
      output: ''
    },
    {
      input: undefined,
      output: ''
    },
    {
      input: NaN,
      output: ''
    }
  ]

  for (const [, fixture] of fixtures.entries()) {
    const result = grabLastUrlSegment(fixture.input)
    t.equal(result, fixture.output, `expecting ${result} to equal ${fixture.output}`)
  }
  t.end()
})

tap.test('DB parameters', (t) => {
  t.autoend()

  t.test('default values', (t) => {
    const input = {}
    const endpoint = {}
    const result = setDynamoParameters(DatastoreParametersMock, endpoint, input)
    t.same(
      result,
      {
        host: undefined,
        database_name: null,
        port_path_or_id: 443,
        collection: 'Unknown'
      },
      'should set default values for parameters'
    )
    t.end()
  })

  // v2 uses host key
  t.test('host, port, collection', (t) => {
    const input = { TableName: 'unit-test' }
    const endpoint = { host: 'unit-test-host', port: '123' }
    const result = setDynamoParameters(DatastoreParametersMock, endpoint, input)
    t.same(
      result,
      {
        host: endpoint.host,
        database_name: null,
        port_path_or_id: endpoint.port,
        collection: input.TableName
      },
      'should set appropriate parameters'
    )
    t.end()
  })

  // v3 uses hostname key
  t.test('hostname, port, collection', (t) => {
    const input = { TableName: 'unit-test' }
    const endpoint = { hostname: 'unit-test-host', port: '123' }
    const result = setDynamoParameters(DatastoreParametersMock, endpoint, input)
    t.same(
      result,
      {
        host: endpoint.hostname,
        database_name: null,
        port_path_or_id: endpoint.port,
        collection: input.TableName
      },
      'should set appropriate parameters'
    )
    t.end()
  })
})
