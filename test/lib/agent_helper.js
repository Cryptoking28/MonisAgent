'use strict';

var path                = require('path')
  , sinon               = require('sinon')
  , trace               = require(path.join(__dirname, '..', '..', 'lib', 'trace'))
  , shimmer             = require(path.join(__dirname, '..', '..', 'lib', 'shimmer'))
  , Agent               = require(path.join(__dirname, '..', '..', 'lib', 'agent'))
  , CollectorConnection = require(path.join(__dirname, '..', '..', 'lib', 'collector', 'connection'))
  ;

/*
 * This function is very impolite. It removes a module from the module
 * cache, thus ensuring that a singleton is reset across test runs.
 */
function uncacheModule(pathname) {
  var module   = require('module')
    , resolved = module._resolveFilename(pathname)
    , nuked    = module._cache[resolved]
    ;

  delete module._cache[resolved];

  return nuked;
}

var helper = module.exports = {
  loadAgent : function loadAgent(options) {
    trace.resetTransactions();

    var agent = new Agent(options);
    shimmer.wrapAgent(agent);
    shimmer.patchModule(agent);
    return agent;
  },

  unloadAgent : function unloadAgent(agent) {
    agent.stop();
    shimmer.unwrapAgent(agent);
    shimmer.unpatchModule();
  },

  loadMockedAgent : function loadMockedAgent() {
    var connection = new CollectorConnection({
      config : {
        applications : function () { return 'none'; }
      }
    });
    sinon.stub(connection, 'connect');
    return helper.loadAgent({connection : connection});
  }
};
