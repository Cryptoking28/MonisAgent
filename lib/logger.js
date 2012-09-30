'use strict';

var path   = require('path')
  , Logger = require('bunyan')
  ;

module.exports = new Logger({
  name    : 'monisagent',
  streams : [{
    level : 'trace',
    name  : 'file',
    path  : path.join(process.cwd(), 'monisagent_agent.log')
  }]
});
