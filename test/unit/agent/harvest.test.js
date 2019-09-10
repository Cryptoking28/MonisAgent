'use strict'

const a = require('async')
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

  it('has a start time congruent with reality', () => {
    expect(agent.metrics.started).to.be.closeTo(Date.now(), 500)
  })

  it('should bail immediately if not connected', (done) => {
    agent.config.run_id = null
    const harvest = nock(URL)

    agent.harvest((err) => {
      expect(err).to.exist.and.have.property('message', 'Not connected to Monis Agent!')
      harvest.done()
      done()
    })
  })

  describe('sending to metric_data endpoint', () => {
    it('should be the only endpoint hit for an empty harvest', (done) => {
      // Triggering a harvest causes supportability metrics to be generated for
      // how many custom, transaction, and error events were seen during the
      // harvest period.
      const harvest = nock(URL)
      harvest.post(ENDPOINTS.METRICS).reply(200, EMPTY_RESPONSE)

      agent.harvest((err) => {
        expect(err).to.not.exist
        harvest.done()
        done()
      })
    })

    it('should send when there are metrics', (done) => {
      let body = null
      const harvest = nock(URL)
      harvest.post(ENDPOINTS.METRICS, (_body) => {
        body = _body
        return true
      }).reply(200, EMPTY_RESPONSE)

      agent.metrics.measureMilliseconds('Test/bogus', null, 1)

      expect(agent.metrics.empty).to.be.false

      agent.harvest((err) => {
        expect(err).to.not.exist
        harvest.done()

        expect(body).to.be.an.instanceOf(Array).of.length(4)
        expect(body[0]).to.equal(RUN_ID)
        expect(body[1]).to.be.closeTo(agent.metrics.started / 1000, 250)
        expect(body[2]).to.be.closeTo(Date.now() / 1000, 250)
        expect(body[3]).to.be.an.instanceOf(Array).with.length.above(0)

        const metrics = body[3][0]
        expect(metrics).to.be.an.instanceOf(Array).of.length(2)
        expect(metrics[0]).to.have.property('name', 'Test/bogus')
        expect(metrics[1]).to.be.an.instanceOf(Array).of.length(6)

        done()
      })

      // Should clear the stored metrics immediately.
      expect(agent.metrics.empty).to.be.true
    })

    it('should add returned rules to the metric mapper', (done) => {
      const harvest = nock(URL)
      harvest.post(ENDPOINTS.METRICS).reply(200, {
        return_value: [
          [{name: 'Custom/Test/events', scope: 'TEST'}, 42]
        ]
      })

      agent.metrics.measureMilliseconds('Test/bogus', null, 1)

      agent.harvest((err) => {
        expect(err).to.not.exist
        harvest.done()
        expect(agent.mapper.map('Custom/Test/events', 'TEST')).to.equal(42)
        done()
      })
    })

    it('should put data back on failure', (done) => {
      const harvest = nock(URL)
      harvest.post(ENDPOINTS.METRICS).reply(500, EMPTY_RESPONSE)

      agent.metrics.measureMilliseconds('Test/bogus', null, 1)

      expect(agent.metrics.empty).to.be.false

      agent.harvest((err) => {
        expect(err).to.not.exist
        harvest.done()

        expect(agent.metrics.empty).to.be.false
        const metric = agent.metrics.getMetric('Test/bogus')
        expect(metric).to.exist.and.have.property('callCount', 1)

        done()
      })

      // Should clear the stored metrics immediately.
      expect(agent.metrics.empty).to.be.true
    })
  })

  describe('sending to analytic_event_data endpoint', () => {
    let tx = null

    beforeEach((done) => {
      helper.runInTransaction(agent, (transaction) => {
        tx = transaction
        tx.finalizeNameFromUri('/some/test/url', 200)
        tx.end()
        done()
      })
    })

    it('should send when there is an event', (done) => {
      let eventsBody = null
      const harvest = nock(URL)
      harvest.post(ENDPOINTS.METRICS).reply(200, EMPTY_RESPONSE)
      harvest.post(ENDPOINTS.EVENTS, (b) => eventsBody = b).reply(200, EMPTY_RESPONSE)

      expect(agent.events).to.have.length(1)

      agent.harvest((err) => {
        expect(err).to.not.exist
        harvest.done()

        expect(eventsBody).to.be.an.instanceOf(Array).of.length(3)
        expect(eventsBody[0]).to.equal(RUN_ID)
        expect(eventsBody[1]).to.have.property('reservoir_size', agent.events.limit)
        expect(eventsBody[1]).to.have.property('events_seen', 1)
        expect(eventsBody[2]).to.be.an.instanceOf(Array).of.length(1)

        const event = eventsBody[2][0]
        expect(event).to.be.an.instanceOf(Array).of.length(3)
        expect(event[0]).to.have.property('name', tx.getFullName())
        expect(event[0]).to.have.property('type', 'Transaction')

        done()
      })

      expect(agent.events).to.have.length(0)
    })

    it('should send two payloads when there are a lot of events', (done) => {
      // Reduce the event limit to avoid `RemoteMethod` compressing the payload.
      const limit = 100

      // Manualy trigger config value update.
      // TODO: Replace with harvest config, likely via agent.config.onConnect()
      // when wired up.
      agent.config.transaction_events.max_samples_per_minute = limit
      agent.config.emit('transaction_events.max_samples_per_minute', limit)

      let eventsBodies = []
      const harvest = nock(URL)
      harvest.post(ENDPOINTS.METRICS).reply(200, EMPTY_RESPONSE)
      harvest.post(ENDPOINTS.EVENTS, (b) => eventsBodies.push(b))
        .reply(200, EMPTY_RESPONSE)
      harvest.post(ENDPOINTS.EVENTS, (b) => eventsBodies.push(b))
        .reply(200, EMPTY_RESPONSE)

      a.series([
        (cb) => {
          a.timesSeries(limit - 1, (i, cb) => {
            helper.runInTransaction(agent, (transaction) => {
              tx = transaction
              tx.finalizeNameFromUri(`/some/test/url/${i}`, 200)
              tx.end()
              cb()
            })
          }, cb)
        },

        (cb) => {
          expect(agent.events).to.have.length(limit)
          agent.harvest(cb)
          expect(agent.events).to.have.length(0)
        },

        (cb) => {
          harvest.done()

          // Should have sent two payloads.
          expect(eventsBodies).to.have.length(2)
          const totalReserviorSize =
            eventsBodies[0][1].reservoir_size + eventsBodies[1][1].reservoir_size
          const totalSeen =
            eventsBodies[0][1].events_seen + eventsBodies[1][1].events_seen

          // Payloads should add up to what was harvested.
          expect(totalReserviorSize).to.equal(agent.events.limit)
          expect(totalSeen).to.equal(limit)

          // Should send two different payloads.
          expect(eventsBodies[0][2])
            .to.be.an.instanceOf(Array)
            .and.not.deep.equal(eventsBodies[1][2])

          cb()
        }
      ], done)
    })

    it('should replace split bodies on failure', (done) => {
      // Reduce the event limit to avoid `RemoteMethod` compressing the payload.
      const limit = 100

      // Manualy trigger config value update.
      // TODO: Replace with harvest config, likely via agent.config.onConnect()
      // when aggregation wired up.
      agent.config.transaction_events.max_samples_per_minute = limit
      agent.config.emit('transaction_events.max_samples_per_minute', limit)

      const harvest = nock(URL)
      harvest.post(ENDPOINTS.METRICS).reply(500, EMPTY_RESPONSE)
      harvest.post(ENDPOINTS.EVENTS).times(2).reply(500, EMPTY_RESPONSE)

      var expectedEvents
      a.series([
        (cb) => {
          a.timesSeries(limit - 1, (i, cb) => {
            helper.runInTransaction(agent, (transaction) => {
              tx = transaction
              tx.finalizeNameFromUri(`/some/test/url/${i}`, 200)
              tx.end()
              cb()
            })
          }, cb)
        },

        (cb) => {
          expect(agent.events).to.have.length(limit)
          expectedEvents = agent.events.toArray()
          agent.harvest(cb)
          expect(agent.events).to.have.length(0)
        }
      ], function handleError(err) {
        expect(err).to.not.exist
        expect(agent.events.toArray()).to.have.members(expectedEvents)
        done()
      })
    })

    it('should not send if `transaction_events.enabled` is false', (done) => {
      agent.config.transaction_events.enabled = false

      expect(agent.events).to.have.length(1)

      agent.harvest((err) => {
        expect(err).to.not.exist
        expect(agent.events).to.have.length(0)

        done()
      })

      expect(agent.events).to.have.length(0)
    })

    it('should put data back on failure', (done) => {
      const harvest = nock(URL)
      harvest.post(ENDPOINTS.METRICS).reply(500, EMPTY_RESPONSE)
      harvest.post(ENDPOINTS.EVENTS).reply(500, EMPTY_RESPONSE)

      expect(agent.events).to.have.length(1)
      const event = agent.events.toArray()[0]

      agent.harvest((err) => {
        expect(err).to.not.exist
        harvest.done()
        expect(agent.events).to.have.length(1)
        expect(agent.events.toArray()[0]).to.equal(event)

        done()
      })

      expect(agent.events).to.have.length(0)
    })

    it('should not put data back on 413', (done) => {
      const harvest = nock(URL)
      harvest.post(ENDPOINTS.METRICS).reply(200, EMPTY_RESPONSE)
      harvest.post(ENDPOINTS.EVENTS).reply(413, EMPTY_RESPONSE)

      expect(agent.events).to.have.length(1)

      agent.harvest((err) => {
        expect(err).to.not.exist
        harvest.done()
        expect(agent.events).to.have.length(0)

        done()
      })

      expect(agent.events).to.have.length(0)
    })
  })

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
      harvest.post(ENDPOINTS.METRICS).reply(200, EMPTY_RESPONSE)
      harvest.post(ENDPOINTS.QUERIES, (b) => traceBody = b).reply(200, EMPTY_RESPONSE)
      harvest.post(ENDPOINTS.EVENTS).reply(200, EMPTY_RESPONSE)

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

      const harvest = nock(URL)
      harvest.post(ENDPOINTS.METRICS).reply(200, EMPTY_RESPONSE)
      harvest.post(ENDPOINTS.EVENTS).reply(200, EMPTY_RESPONSE)

      expect(agent.queries.samples).to.have.property('size', 1)

      agent.harvest((err) => {
        expect(err).to.not.exist
        harvest.done()
        expect(agent.queries.samples).to.have.property('size', 0)

        done()
      })

      expect(agent.queries.samples).to.have.property('size', 0)
    })

    it('should put data back on failure', (done) => {
      const harvest = nock(URL)
      harvest.post(ENDPOINTS.METRICS).reply(500, EMPTY_RESPONSE)
      harvest.post(ENDPOINTS.EVENTS).reply(200, EMPTY_RESPONSE)
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

  describe('sending to span_event_data endpoint', () => {
    beforeEach(() => {
      agent.config.distributed_tracing.enabled = true
      agent.config.span_events.enabled = true
      helper.runInTransaction(agent, (tx) => {
        tx.trace.root.end()
        agent.spans.addSegment(tx.trace.root)
      })
    })

    it('should send when there is a span', (done) => {
      let spansBody = null
      const harvest = nock(URL)
      harvest.post(ENDPOINTS.METRICS).reply(200, EMPTY_RESPONSE)
      harvest
        .post(ENDPOINTS.SPAN_EVENTS, (b) => spansBody = b)
        .reply(200, EMPTY_RESPONSE)

      expect(agent.spans).to.have.length(1)

      agent.harvest((err) => {
        expect(err).to.not.exist
        harvest.done()

        expect(spansBody).to.be.an.instanceOf(Array).of.length(3)
        expect(spansBody[0]).to.equal(RUN_ID)
        expect(spansBody[1]).to.have.property('reservoir_size', agent.spans.limit)
        expect(spansBody[1]).to.have.property('events_seen', 1)
        expect(spansBody[2]).to.be.an.instanceOf(Array).of.length(1)

        const span = spansBody[2][0]
        expect(span).to.be.an.instanceOf(Array).of.length(3)
        expect(span[0]).to.have.property('name', 'ROOT')
        expect(span[0]).to.have.property('type', 'Span')
        expect(span[0]).to.have.property('category', 'generic')

        done()
      })

      expect(agent.spans).to.have.length(0)
    })

    it('should not send if `span_events.enabled` is false', (done) => {
      agent.config.span_events.enabled = false

      const harvest = nock(URL)
      harvest.post(ENDPOINTS.METRICS).reply(200, EMPTY_RESPONSE)

      expect(agent.spans).to.have.length(1)

      agent.harvest((err) => {
        expect(err).to.not.exist
        harvest.done()
        expect(agent.spans).to.have.length(0)

        done()
      })

      expect(agent.spans).to.have.length(0)
    })

    it('should not send if `distributed_tracing` is false', (done) => {
      agent.config.distributed_tracing.enabled = false

      const harvest = nock(URL)
      harvest.post(ENDPOINTS.METRICS).reply(200, EMPTY_RESPONSE)

      expect(agent.spans).to.have.length(1)

      agent.harvest((err) => {
        expect(err).to.not.exist
        harvest.done()
        expect(agent.spans).to.have.length(0)

        done()
      })

      expect(agent.spans).to.have.length(0)
    })

    it('should put data back on failure', (done) => {
      const harvest = nock(URL)
      harvest.post(ENDPOINTS.METRICS).reply(500, EMPTY_RESPONSE)
      harvest.post(ENDPOINTS.SPAN_EVENTS).reply(500, EMPTY_RESPONSE)

      expect(agent.spans).to.have.length(1)

      agent.harvest((err) => {
        expect(err).to.not.exist
        harvest.done()
        expect(agent.spans).to.have.length(1)

        done()
      })

      expect(agent.spans).to.have.length(0)
    })

    it('should not put data back on 413', (done) => {
      const harvest = nock(URL)
      harvest.post(ENDPOINTS.METRICS).reply(200, EMPTY_RESPONSE)
      harvest.post(ENDPOINTS.SPAN_EVENTS).reply(413, EMPTY_RESPONSE)

      expect(agent.spans).to.have.length(1)

      agent.harvest((err) => {
        expect(err).to.not.exist
        harvest.done()
        expect(agent.spans).to.have.length(0)

        done()
      })

      expect(agent.spans).to.have.length(0)
    })
  })
})
