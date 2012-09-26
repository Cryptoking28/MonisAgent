'use strict';

var http    = require('http')
  , path    = require('path')
  , shimmer = require(path.join(__dirname, '..', 'shimmer'))
  , logger  = require(path.join(__dirname, '..', 'logger'))
  ;

function instrumentViews(agent) {
  logger.debug('Instrumenting Express views');
  shimmer.wrapMethod(
    http.ServerResponse.prototype,
    'http.ServerResponse.prototype',
    'render',
    function (original) {
      return function (view) {
        var segment = agent.getTransaction().getTrace().add('View/' + view + '/Rendering');
        try {
          original.apply(this, arguments);
        }
        finally {
          segment.end();
        }
      };
    }
  );
}

module.exports = function initialize(agent, express) {
  shimmer.wrapMethod(express, 'express', 'createServer', function (original) {
    return function wrappedCreateServer(options) {
      instrumentViews(agent);
      agent.environment.setDispatcher('express');
      agent.environment.setFramework('express');
      logger.debug('Monis Agent has instrumented this Express endpoint');

      return original.apply(this, arguments);
    };
  });
};
