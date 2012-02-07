var module = require('module');

// check to see if the agent has already been initialized
if (module.monisagent_agent != null) {
	return module.monisagent_agent;
}

var stats = require('./stats.js');
var service = require('./service.js');
var metric = require('./metric.js');
var trace = require('./trace.js');
var events = require('events');
var winston = require('winston');

function Agent() {
	events.EventEmitter.call(this);
	var self = this;
	var logger = new (winston.Logger)({
	    transports: [
//			new (winston.transports.Console)(),
			new (winston.transports.File)({ filename: 'monisagent_agent.log', json: false })
	    ]
//	    exceptionHandlers: [
//	      new winston.transports.File({ filename: 'monisagent_agent.log' })
//	    ]
	  });
	
	var statsEngine = stats.createStatsEngine(logger);
	var metrics = new metric.Metrics(statsEngine);

	// MonisAgentService
	var nrService;
	var harvestIntervalId;
	
	this.stop = function() {
 		logger.info('Stopping the Monis Agent node.js agent');
		clearInterval(harvestIntervalId);
	};

	this.connect = function(licenseKey, host, port) {
		nrService = service.createMonisAgentService(licenseKey, host, port);
		nrService.on('connect', statsEngine.onConnect);
		nrService.on('metricDataError', statsEngine.mergeMetricData);
		nrService.on('metricDataResponse', statsEngine.parseMetricIds);
		nrService.on('connectError', function(error) {
			setTimeout(function() {
				self.connect(licenseKey, host, port);
			}, 15*1000);
		});
		nrService.connect();
	}
	
	this.getLogger = function() {
		return logger;
	}
	
	this.getStatsEngine = function() {
		return statsEngine;
	}
	
	this.getMetrics = function() {
		return metrics;
	}

	/*
	function patchModule() {
		var module = require('module');
		
		// append the agent exports to module
		module.monisagent_agent = exports;
	
		var moduleLoadFunction = module._load;
	
		module._load = function(file) {		
			var m = moduleLoadFunction(file);
			moduleLoad(module, m, file);
			return m;
		}
	};
	
	function moduleLoad(modules, module, file) {
	//console.log("Load file: " + file);
	// FIXME here's where we'd notice modules loading.  we'd need to sort out native/custom modules
	};

	*/
	
	function loadInstrumentation() {
		var fs = require('fs');
		var coreDir = 'lib/core_instrumentation';
		var files = fs.readdirSync(coreDir);
		
		// load the core instrumentation files
		for (var i = 0; i < files.length; i++) {
			var inst = require("monisagent_agent/" + coreDir + "/" + files[i]);
			inst.initialize(self, trace);
		}
	}
	
	function harvest() {
		self.emit('harvest', nrService);
		logger.debug("Harvest");
		if (nrService && nrService.isConnected()) {
			statsEngine.harvest(nrService);
		}
	}
	
	function startHarvest() {
		harvestIntervalId = setInterval(harvest, 60*1000);
	}

 	this.start = function() {
		logger.info('Starting the Monis Agent node.js agent');
	
//		patchModule();
	
		loadInstrumentation();
		startHarvest();
	};
	
	this.clearTransaction = function(transaction) {
		if (this.transaction == transaction) {
			this.transaction = null;
		}
	}
	
	this.createTransaction = function() {
		return this.transaction = trace.createTransaction(self);
	}
};

Agent.super_ = events.EventEmitter;
Agent.prototype = Object.create(events.EventEmitter.prototype, {
    constructor: {
        value: Agent,
        enumerable: false
    }
});


var agent = new Agent();

exports.stop = agent.stop;
exports.connect = agent.connect;
exports.getStatsEngine = agent.getStatsEngine;
exports.createTransaction = agent.createTransaction;
exports.getMetrics = agent.getMetrics;
exports.getLogger = agent.getLogger;
exports.logToConsole = function() {
	agent.getLogger().add(winston.transports.Console);
}

agent.start();


function generateShim(next) {
	var _currentTransaction = agent.currentTransaction;
	
	return function() {
		agent.currentTransaction = _currentTransaction;
		return next.apply(this, arguments);
	};
}

// Thanks Adam Crabtree! (dude@noderiety.com)
require('./hook.js')(generateShim);
