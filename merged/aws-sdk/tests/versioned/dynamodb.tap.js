'use strict'

const common = require('./common')
const tap = require('tap')
const utils = require('@monisagent/test-utilities')
const async = require('async')

const TABLE_NAME = 'StaticTestTable_DO_NOT_DELETE'
const FAKE_TABLE_NAME = 'NON-EXISTENT-TABLE'
const UNIQUE_ARTIST = `No One You Know ${Math.floor(Math.random() * 100000)}`

const TABLE_DEF = {
  AttributeDefinitions: [
    {AttributeName: 'Artist', AttributeType: 'S'},
    {AttributeName: 'SongTitle', AttributeType: 'S'}
  ],
  KeySchema: [
    {AttributeName: 'Artist', KeyType: 'HASH'},
    {AttributeName: 'SongTitle', KeyType: 'RANGE'}
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 5,
    WriteCapacityUnits: 5
  },
  TableName: TABLE_NAME
}
const ITEM_DEF = {
  Item: {
    AlbumTitle: {S: 'Somewhat Famous'},
    Artist: {S: UNIQUE_ARTIST},
    SongTitle: {S: 'Call Me Today'}
  },
  TableName: TABLE_NAME
}

const ITEM = {
  Key: {
    Artist: {S: UNIQUE_ARTIST},
    SongTitle: {S: 'Call Me Today'}
  },
  TableName: TABLE_NAME
}
const QUERY = {
  ExpressionAttributeValues: {
    ':v1': {S: UNIQUE_ARTIST}
  },
  KeyConditionExpression: 'Artist = :v1',
  TableName: TABLE_NAME
}

const TESTS = [
  {method: 'createTable', params: TABLE_DEF},
  {method: 'putItem', params: ITEM_DEF},
  {method: 'getItem', params: ITEM},
  {method: 'updateItem', params: ITEM},
  {method: 'scan', params: {TableName: TABLE_NAME}},
  {method: 'query', params: QUERY},
  {method: 'deleteItem', params: ITEM},
  {method: 'deleteTable', params: {TableName: FAKE_TABLE_NAME}}
]

tap.test('DynamoDB', (t) => {
  t.autoend()

  let helper = null
  let AWS = null
  let ddb = null

  t.beforeEach((done) => {
    helper = utils.TestAgent.makeInstrumented()
    helper.registerInstrumentation({
      moduleName: 'aws-sdk',
      type: 'conglomerate',
      onRequire: require('../../lib/instrumentation')
    })
    AWS = require('aws-sdk')
    ddb = new AWS.DynamoDB({region: 'us-east-1'})
    done()
  })

  t.afterEach((done) => {
    helper && helper.unload()
    done()
  })

  t.test('commands', (t) => {
    helper.runInTransaction((tx) => {
      async.eachSeries(TESTS, (cfg, cb) => {
        t.comment(`Testing ${cfg.method}`)
        ddb[cfg.method](cfg.params, (err) => {
          if (
            err &&
            err.code !== 'ResourceNotFoundException' &&
            // The table should always exist
            err.code !== 'ResourceInUseException'
          ) {
            t.error(err)
          }
          cb()
        })
      }, () => {
        tx.end()
        setImmediate(finish, t, tx)
      })
    })
  })
})

function finish(t, tx) {
  const segments = common.checkAWSAttributes(t, tx.trace.root, /^Datastore/)
  t.equal(segments.length, 8, 'should have 8 aws datastore segments')

  segments.forEach((segment, i) => {
    const attrs = segment.attributes.get(common.SEGMENT_DESTINATION)
    t.matches(attrs, {
      'host': String,
      'port_path_or_id': String,
      'database_name': String,
      'aws.operation': TESTS[i].method,
      'aws.requestId': String,
      'aws.region': 'us-east-1',
      'aws.service': 'DynamoDB'
    }, 'should have expected attributes')
  })

  t.end()
}
