var winston = require('winston');

var logger = new (winston.Logger)({
        transports: [
            new (winston.transports.File)({ filename: 'monisagent_agent.log', json: false })
        ]
//        exceptionHandlers: [
//          new winston.transports.File({ filename: 'monisagent_agent.log' })
//        ]
      });

// why couldn't logger.levels be in sorted order?
var levels = ['verbose', 'debug', 'info', 'warn', 'error'];

// Winston appears to log all messages regardless of the level it's set to.  We only want
// to log messages that are at or above the log level.  Override the log method to do this
var originalLog = logger.log;
var logLevel = levels.indexOf('info');

winston.Logger.prototype.setLevel = function(level) {
    var l = levels.indexOf(level);
    if (l) {
        logLevel = l;
    } else {
        console.log("Unknown log level: " + level);
    }
};

winston.Logger.prototype.log = function(level, message) {
    if (levels.indexOf(level) >= logLevel) {
        if (typeof(message) === 'function') {
            
            var args = Array.prototype.slice.call(arguments);
            var value = message();
            if (value.toJSON) {
                value = JSON.stringify(value);
            }
            if (message.name) {
                args[1] = message.name;
                args[2] = value;                
            } else {
                args[1] = value;
            }
            
            return originalLog.apply(this, args);
        } else {
            return originalLog.apply(this, arguments);
        }
    }
};

winston.Logger.prototype.logToConsole = function() {
    try {
        this.add(winston.transports.Console);
    } catch (e) {} // may already be added in unit tests
};


exports.getLogger = function() {
    return logger;
};