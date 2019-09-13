'use strict'

const expect = require('chai').expect
const helper = require('../../lib/agent_helper')
const nock = require('nock')

const RUN_ID = 1337
const URL = 'https://collector.monisagent.com'
const ENDPOINTS = helper.generateAllPaths(RUN_ID)
const EMPTY_RESPONSE = {return_value: null}
const Harvest = require('../../../lib/harvest')
describe('Synchronous agent harvests', () => {
  let agent = null

  beforeEach(() => {
    // This only works in serverless mode currently.
    agent = helper.loadMockedAgent({
      license_key: 'license key here',
      serverless_mode: {
        enabled: true
      },
      run_id: RUN_ID,
      apdex_t: 0.005
    })
  })

  afterEach(() => {
    helper.unloadAgent(agent)
  })

  it('should properly collect data to send', () => {
    const testObj = {}

    const oldGetPayloads = Harvest.prototype.getPayloads
    Harvest.prototype.getPayloads = function mockedGetPayloads() {
      return testObj
    }

    const oldPopData = agent.collector.populateDataSync
    agent.collector.populateDataSync = function mockedPopulatedDataSync(data) {
      expect(testObj).to.equal(data)
    }

    Harvest.prototype.getPayloads = oldGetPayloads
    agent.collector.populateDataSync = oldPopData
  })
})

describe('Agent harvests', () => {
  let agent = null

  beforeEach(() => {
    agent = helper.loadMockedAgent({
      license_key: 'license key here',
      run_id: RUN_ID,
      apdex_t: 0.005
    })
    nock.disableNetConnect()
  })

  afterEach(() => {
    helper.unloadAgent(agent)

    if (!nock.isDone()) {
      /* eslint-disable no-console */
      console.error('Cleaning pending mocks: %j', nock.pendingMocks())
      /* eslint-enable no-console */
      nock.cleanAll()
    }

    nock.enableNetConnect()
  })

  it('requires a callback', () => {
    expect(() => agent.harvest()).to.throw('callback required!')
  })

  // it('has a start time congruent with reality', () => {
  //   expect(agent.metrics.started).to.be.closeTo(Date.now(), 500)
  // })

  it('should bail immediately if not connected', (done) => {
    agent.config.run_id = null
    const harvest = nock(URL)

    agent.harvest((err) => {
      expect(err).to.exist.and.have.property('message', 'Not connected to Monis Agent!')
      harvest.done()
      done()
    })
  })

  // describe('sending to metric_data endpoint', () => {
  //   it('should send when there are metrics', (done) => {
  //     let body = null
  //     const harvest = nock(URL)
  //     harvest.post(ENDPOINTS.METRICS, (_body) => {
  //       body = _body
  //       return true
  //     }).reply(200, EMPTY_RESPONSE)

  //     agent.metrics.measureMilliseconds('Test/bogus', null, 1)

  //     expect(agent.metrics.empty).to.be.false

  //     agent.harvest((err) => {
  //       expect(err).to.not.exist
  //       harvest.done()

  //       expect(body).to.be.an.instanceOf(Array).of.length(4)
  //       expect(body[0]).to.equal(RUN_ID)
  //       expect(body[1]).to.be.closeTo(agent.metrics.started / 1000, 250)
  //       expect(body[2]).to.be.closeTo(Date.now() / 1000, 250)
  //       expect(body[3]).to.be.an.instanceOf(Array).with.length.above(0)

  //       const metrics = body[3][0]
  //       expect(metrics).to.be.an.instanceOf(Array).of.length(2)
  //       expect(metrics[0]).to.have.property('name', 'Test/bogus')
  //       expect(metrics[1]).to.be.an.instanceOf(Array).of.length(6)

  //       done()
  //     })

  //     // Should clear the stored metrics immediately.
  //     expect(agent.metrics.empty).to.be.true
  //   })

  //   it('should add returned rules to the metric mapper', (done) => {
  //     const harvest = nock(URL)
  //     harvest.post(ENDPOINTS.METRICS).reply(200, {
  //       return_value: [
  //         [{name: 'Custom/Test/events', scope: 'TEST'}, 42]
  //       ]
  //     })

  //     agent.metrics.measureMilliseconds('Test/bogus', null, 1)

  //     agent.harvest((err) => {
  //       expect(err).to.not.exist
  //       harvest.done()
  //       expect(agent.mapper.map('Custom/Test/events', 'TEST')).to.equal(42)
  //       done()
  //     })
  //   })

  //   it('should put data back on failure', (done) => {
  //     const harvest = nock(URL)
  //     harvest.post(ENDPOINTS.METRICS).reply(500, EMPTY_RESPONSE)

  //     agent.metrics.measureMilliseconds('Test/bogus', null, 1)

  //     expect(agent.metrics.empty).to.be.false

  //     agent.harvest((err) => {
  //       expect(err).to.not.exist
  //       harvest.done()

  //       expect(agent.metrics.empty).to.be.false
  //       const metric = agent.metrics.getMetric('Test/bogus')
  //       expect(metric).to.exist.and.have.property('callCount', 1)

  //       done()
  //     })

  //     // Should clear the stored metrics immediately.
  //     expect(agent.metrics.empty).to.be.true
  //   })
  // })

  describe('sending to sql_trace_data endpoint', () => {
    let tx = null

    beforeEach((done) => {
      agent.config.slow_sql.enabled = true
      agent.config.transaction_tracer.record_sql = 'raw'

      helper.runInTransaction(agent, (transaction) => {
        tx = transaction
        tx.finalizeNameFromUri('/some/test/url', 200)
        tx.trace.setDurationInMillis(5000)

        agent.queries.addQuery(
          tx.trace.root,
          'mysql',
          'select * from foo',
          new Error().stack
        )

        tx.end()
        done()
      })
    })

    it('should send when there is a sql trace', (done) => {
      let traceBody = null
      const harvest = nock(URL)
      harvest.post(ENDPOINTS.QUERIES, (b) => traceBody = b).reply(200, EMPTY_RESPONSE)
      expect(agent.queries.samples).to.have.property('size', 1)

      agent.harvest((err) => {
        expect(err).to.not.exist
        harvest.done()

        expect(traceBody).to.be.an.instanceOf(Array).of.length(1)
        expect(traceBody[0]).to.be.an.instanceOf(Array).of.length(1)
        expect(traceBody[0][0]).to.be.an.instanceOf(Array).of.length(10)

        const trace = traceBody[0][0]
        expect(trace[0]).to.equal(tx.getFullName())
        expect(trace[1]).to.equal(tx.url)
        expect(trace[3]).to.equal('select * from foo')

        done()
      })

      expect(agent.queries.samples).to.have.property('size', 0)
    })

    it('should not send if `slow_sql.enabled` is false', (done) => {
      agent.config.slow_sql.enabled = false

      expect(agent.queries.samples).to.have.property('size', 1)

      agent.harvest((err) => {
        expect(err).to.not.exist

        expect(agent.queries.samples).to.have.property('size', 0)

        done()
      })

      expect(agent.queries.samples).to.have.property('size', 0)
    })

    it('should put data back on failure', (done) => {
      const harvest = nock(URL)
      harvest.post(ENDPOINTS.QUERIES).reply(500, EMPTY_RESPONSE)

      expect(agent.queries.samples).to.have.property('size', 1)

      agent.harvest((err) => {
        expect(err).to.not.exist
        harvest.done()
        expect(agent.queries.samples).to.have.property('size', 1)

        done()
      })

      expect(agent.queries.samples).to.have.property('size', 0)
    })
  })
})
