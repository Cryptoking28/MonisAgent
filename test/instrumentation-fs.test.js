var path    = require('path')
  , chai    = require('chai')
  , should  = chai.should()
  , fs      = require('fs')
  , helper  = require(path.join(__dirname, 'lib', 'agent_helper'))
  ;

describe("agent instrumentation of the fs module", function () {
  var TESTDIR = 'XXXSHOULDNOTEXISTXXX'
    , FILE1   = 'IMAFILE'
    , FILE2   = 'IMANOTHERFILE'
    , FILE3   = 'IMLINK'
    , agent
    ;

  before(function (done) {
    agent = helper.loadMockedAgent();

    fs.mkdir(TESTDIR, function (error) {
      if (error) return done(error);

      [FILE1, FILE2, FILE3].forEach(function (filename) {
        var written = fs.writeFileSync(path.join(TESTDIR, filename), 'I like clams', 'utf8');
      });

      return done();
    });
  });

  after(function (done) {
    [FILE1, FILE2, FILE3].forEach(function (filename) {
      fs.unlinkSync(path.join(TESTDIR, filename));
    });

    fs.rmdir(TESTDIR, function (error) {
      if (error) return done(error);

      helper.unloadAgent(agent);

      return done();
    });
  });

  it("should trace the reading of directories", function (done) {
    agent.createTransaction();

    fs.readdir(TESTDIR, function (error, files) {
      if (error) return done(error);

      files.should.be.an.instanceof(Array);
      files.length.should.equal(3);
      [FILE1, FILE2, FILE3].forEach(function (filename) {
        files.should.include(filename);
      });

      var readdirStats = JSON.stringify(agent.statsEngine.statsByScope('FIXME').byName('Filesystem/ReadDir/' + TESTDIR));
      should.exist(readdirStats);
      readdirStats.should.match(/^\[[0-9.,]+\]$/);

      return done();
    });
  });
});
