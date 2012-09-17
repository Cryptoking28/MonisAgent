'use strict';

var fs           = require('fs')
  , path         = require('path')
  , carrier      = require('carrier')
  , spawn        = require('child_process').spawn
  ;

var memcachedProcess;

var api = {
  memcachedProcess : {
    shutdown : function (callback) {
      if (memcachedProcess) memcachedProcess.kill();
      console.error('memcached killed.');
    }
  }
};

module.exports = function setup(options, imports, register) {
  var logger = options.logger;
  logger.debug('starting memcached');

  memcachedProcess = spawn('memcached', ['-v'],
                           {stdio : [process.stdin, 'pipe', 'pipe']});

  memcachedProcess.on('exit', function (code, signal) {
    logger.info('memcached exited with signal %s and returned code %s', signal, code);
  });

  carrier.carry(memcachedProcess.stdout, function (line) {
    logger.debug(line);
  });

  carrier.carry(memcachedProcess.stderr, function (line) {
    logger.error(line);
  });

  // memcached is the strong, silent type and doesn't indicate it's ready
  return register(null, api);
};
