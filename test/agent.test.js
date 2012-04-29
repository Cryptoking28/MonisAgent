var should = require('should')
  , path = require('path')
  , nr = require(path.join(__dirname, '..', 'lib', 'monisagent_agent.js'))
  ;

describe('the Monis Agent agent', function () {
  var agent;

  before(function (done) {
    agent = nr._agent;

    return done();
  });

  it('should expose its configured statsEngine directly', function (done) {
    should.exist(agent.statsEngine);

    return done();
  });

  it('should expose its configuration directly', function (done) {
    should.exist(agent.config);

    return done();
  });

  it('should expose its configured errorService directly', function (done) {
    should.exist(agent.errorService);

    return done();
  });

  it('should expose its configured metricNormalizer directly', function (done) {
    should.exist(agent.metricNormalizer);

    return done();
  });
});
