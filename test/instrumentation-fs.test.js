'use strict';

var path    = require('path')
  , chai    = require('chai')
  , should  = chai.should()
  , fs      = require('fs')
  , helper  = require(path.join(__dirname, 'lib', 'agent_helper'))
  , shimmer = require(path.join(__dirname, '..', 'lib', 'shimmer'))
  ;

describe("built-in fs module instrumentation", function () {
  var TESTDIR = 'XXXSHOULDNOTEXISTXXX'
    , FILE1   = 'IMAFILE'
    , FILE2   = 'IMANOTHERFILE'
    , FILE3   = 'IMLINK'
    , agent
    ;

  before(function (done) {
    agent = helper.loadMockedAgent();
    shimmer.bootstrapInstrumentation(agent);

    fs.mkdir(TESTDIR, function (error) {
      if (error) return done(error);

      [FILE1, FILE2, FILE3].forEach(function (filename) {
        var written = fs.writeFileSync(path.join(TESTDIR, filename), 'I like clams', 'utf8');
      });

      return done();
    });
  });

  after(function (done) {
    helper.unloadAgent(agent);

    [FILE1, FILE2, FILE3].forEach(function (filename) {
      fs.unlinkSync(path.join(TESTDIR, filename));
    });

    fs.rmdir(TESTDIR, function (error) {
      if (error) return done(error);

      return done();
    });
  });

  it("should trace the reading of directories", function (done) {
    var trans = agent.createTransaction();

    fs.readdir(TESTDIR, function (error, files) {
      if (error) return done(error);

      files.should.be.an('array');
      files.length.should.equal(3);
      [FILE1, FILE2, FILE3].forEach(function (filename) {
        files.should.include(filename);
      });

      var stats = agent.getTransaction().metrics.getOrCreateMetric('Filesystem/ReadDir/' + TESTDIR, 'FIXME').stats;
      stats.callCount.should.equal(1);

      trans.end();

      return done();
    });
  });

  it("should pick up scope when called in a scoped transaction");
});
