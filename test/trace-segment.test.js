'use strict';

var path         = require('path')
  , chai         = require('chai')
  , should       = chai.should()
  , expect       = chai.expect
  , web          = require(path.join(__dirname, '..', 'lib', 'transaction', 'web'))
  , helper       = require(path.join(__dirname, 'lib', 'agent_helper'))
  , TraceSegment = require(path.join(__dirname, '..', 'lib', 'transaction',
                                     'trace', 'segment'))
  , Trace        = require(path.join(__dirname, '..', 'lib', 'transaction', 'trace'))
  , Transaction  = require(path.join(__dirname, '..', 'lib', 'transaction'))
  ;

describe("TraceSegment", function () {
  it("should be bound to a Trace", function () {
    var segment;
    expect(function noTrace() {
      segment = new TraceSegment(null, 'UnitTest');
    }).throws();

    var success = new TraceSegment(new Trace('Test/TraceExample07'), 'UnitTest');
    expect(success.trace).instanceof(Trace);
  });

  it("should call an optional callback function", function (done) {
    var segment;
    expect(function noCallback() {
      segment = new TraceSegment(new Trace('Test/TraceExample08'), 'UnitTest');
    }).not.throws();

    var agent   = helper.loadMockedAgent()
      , trans   = new Transaction(agent)
      , working = new TraceSegment(trans.getTrace(), 'UnitTest', function () {
      helper.unloadAgent(agent);
      return done();
    });
    working.end();
    trans.end();
  });

  it("should be named", function () {
    var segment;
    expect(function noName() {
      segment = new TraceSegment(new Trace('Test/TraceExample06'));
    }).throws();
    var success = new TraceSegment(new Trace('Test/TraceExample07'), 'UnitTest');
    expect(success.name).equal('UnitTest');
  });

  it("should have 0 children at creation", function () {
    var segment = new TraceSegment(new Trace('Test/TraceExample02'), 'UnitTest');
    expect(segment.children.length).equal(0);
  });

  it("should have a timer", function () {
    var segment = new TraceSegment(new Trace('Test/TraceExample03'), 'UnitTest');
    expect(segment.timer.isRunning()).equal(true);
  });

  it("should accept a callback that records metrics associated with this segment",
     function (done) {
    var agent   = helper.loadMockedAgent()
      , trans   = new Transaction(agent)
      , segment = new TraceSegment(trans.getTrace(), 'Test', function (insider) {
      expect(insider).equal(segment);
      helper.unloadAgent(agent);
      return done();
    });

    segment.end();
    trans.end();
  });

  describe("with children created from URLs", function () {
    var webChild, agent;

    before(function () {
      agent = helper.loadMockedAgent();

      var trace   = new Trace(new Transaction(agent))
        , segment = new TraceSegment(trace, 'UnitTest')
        , url     = '/test?test1=value1&test2&test3=50&test4='
        ;

      webChild = segment.add(web.scrubURL(url));
      web.normalizeAndName(webChild, url, 200);

      trace.setDurationInMillis(1, 0);
      webChild.setDurationInMillis(1, 0);
    });

    after(function () {
      helper.unloadAgent(agent);
    });

    it("should return the URL minus any query parameters", function () {
      expect(webChild.name).equal('WebTransaction/NormalizedUri/*');
    });

    it("should have parameters on the child segment", function () {
      should.exist(webChild.parameters);
    });

    it("should have the parameters that were passed in the query string", function () {
      expect(webChild.parameters.test1).equal('value1');
      expect(webChild.parameters.test3).equal('50');
    });

    it("should set bare parameters to true (as in present)", function () {
      expect(webChild.parameters.test2).equal(true);
    });

    it("should set parameters with empty values to ''", function () {
      expect(webChild.parameters.test4).equal('');
    });

    it("should serialize the segment with the parameters", function () {
      var expected = [
        0,
        1,
        'WebTransaction/NormalizedUri/*',
        {
          nr_exclusive_duration_millis : 1,
          test1 : 'value1',
          test2 : true,
          test3 : '50',
          test4 : ''
        },
        []
      ];
      expect(webChild.toJSON()).deep.equal(expected);
    });
  });

  it("should retain any associated SQL statements");
  it("should allow an arbitrary number of segments in the scope of this segment");

  describe("when ended", function () {
    it("should have a ended timer", function () {
      var segment = new TraceSegment(new Trace('Test/TraceExample04'), 'UnitTest');
      segment.end();
      expect(segment.timer.isRunning()).equal(false);
    });

    it("should know its exclusive duration");
    it("should produce human-readable JSON");

    it("should produce JSON that conforms to the collector spec", function () {
      var trace = new Trace('WebTransaction/NormalizedUri/*');
      var segment = new TraceSegment(trace, 'DB/select/getSome');

      trace.setDurationInMillis(17, 0);
      segment.setDurationInMillis(14, 3);
      // See documentation on TraceSegment.toJSON for what goes in which field.
      expect(segment.toJSON()).deep.equal([3,
                                           17,
                                           'DB/select/getSome',
                                           {nr_exclusive_duration_millis : 14},
                                           []]);
    });

    it("should record its own metrics onto the trace");
  });
});
