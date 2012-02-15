var winston = require('winston');
var service = require('../lib/service');
var logger = require('../lib/logger').getLogger();

var agent = require('./test_agent').createAgent();

var testLicense = 'd67afc830dab717fd163bfcb0b8b88423e9a1a3b';

exports['test conn'] = function(beforeExit, assert) {
    var nr = service.createMonisAgentService(agent, testLicense, 'staging-collector.monisagent.com', 80);
    var connected = false;
    nr.on('connect', function() {
        connected = true;
    });
    nr.connect();
    
    beforeExit(function() {
        assert.ok(connected);
    });
};
