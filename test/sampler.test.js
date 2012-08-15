'use strict';

var path = require('path')
  , chai = require('chai')
  , expect = chai.expect
  , sampler = require(path.join(__dirname, '..', 'lib', 'sampler'))
  , Agent = require(path.join(__dirname, '..', 'lib', 'agent'))
  ;

describe("environmental sampler", function () {
  var agent;

  beforeEach(function () {
    agent = new Agent();
  });

  afterEach(function (){
    sampler.stop();
  });

  it("should depend on Agent to provide the current metrics summary", function () {
    expect(function () { sampler.start(agent); }).not.throws();
    expect(function () { sampler.sampleMemory(agent); }).not.throws();
    expect(function () { sampler.checkEvents(agent); }).not.throws();
    expect(function () { sampler.stop(agent); }).not.throws();
  });

  it("should have a rough idea of how much memory Node is using", function () {
    sampler.sampleMemory(agent);

    var stats = agent.metrics.getOrCreateMetric('Memory/Physical').stats;
    expect(stats.callCount).equal(1);
    expect(stats.max).above(1); // maybe someday this test will fail
  });

  it("should have some rough idea of how deep the event queue is", function (done) {
    sampler.checkEvents(agent);

    /*
     * sampler.checkEvents works by creating a timer and using setTimeout to
     * schedule an "immediate" callback execution, which gives a rough idea of
     * how much stuff is sitting pending on the libuv event queue (and whether
     * there's a  lot of stuff being handled through process.nextTick, which
     * maintains its own queue of immediate callbacks). It remains to be seen
     * how high this metric will ever get, but at least the underlying timer
     * has nanosecond precision (and probably significantly
     * greater-than-millisecond accuracy).
     */
    setTimeout(function () {
      var stats = agent.metrics.getOrCreateMetric('Events/wait').stats;
      expect(stats.callCount).equal(1);
      expect(stats.total).above(0);

      return done();
    }, 0);
  });
});
