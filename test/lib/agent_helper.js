'use strict';

var path                = require('path')
  , sinon               = require('sinon')
  , architect           = require('architect')
  , wrench              = require('wrench')
  , shimmer             = require(path.join(__dirname, '..', '..', 'lib', 'shimmer'))
  , Agent               = require(path.join(__dirname, '..', '..', 'lib', 'agent'))
  , CollectorConnection = require(path.join(__dirname, '..', '..', 'lib', 'collector', 'connection'))
  ;

var helper = module.exports = {
  loadAgent : function loadAgent(options) {
    var agent = new Agent(options);
    shimmer.patchModule(agent);
    return agent;
  },

  unloadAgent : function unloadAgent(agent) {
    agent.stop();
    shimmer.unwrapAll();
  },

  loadMockedAgent : function loadMockedAgent(options) {
    if (!options) options = {};

    var connection = new CollectorConnection({
      config : {
        applications : function () { return 'none'; }
      }
    });

    sinon.stub(connection, 'connect');
    options.connection = connection;

    return helper.loadAgent(options);
  },

  /**
   * Create a transactional scope in which instrumentation that will only add
   * trace segments to existing transactions will funciton.
   *
   * @param Agent agent The agent whose tracer should be used to create the
   *                    transaction.
   * @param Function callback The function to be run within the transaction.
   */
  runInTransaction : function runInTransaction(agent, callback) {
    return agent.tracer.transactionProxy(callback)(); // <-- invoke immediately
  },

  /**
   * Use c9/architect to bootstrap a memcached server for running integration
   * tests.
   *
   * @param Function callback The operations to be performed while the server
   *                          is running.
   */
  bootstrapMemcached : function bootstrapMemcached(callback) {
    var memcached = path.join(__dirname, 'architecture', 'memcached.js');
    var config = architect.loadConfig(memcached);
    architect.createApp(config, function (error, app) {
      if (error) return helper.cleanMemcached(app, function () { return callback(error); });

      return callback(null, app);
    });
  },

  /**
   * Shut down and clean up after memcached.
   *
   * @param Object app The architect app to be shut down.
   * @param Function callback The operations to be run after the server is
   *                          shut down.
   */
  cleanMemcached : function cleanMemcached(app, callback) {
    var memcached = app.getService('memcachedProcess');
    memcached.shutdown(callback);
  },

  /**
   * Use c9/architect to bootstrap a MongoDB server for running integration
   * tests.
   *
   * @param Function callback The operations to be performed while the server
   *                          is running.
   */
  bootstrapMongoDB : function bootstrapMongoDB(callback) {
    var bootstrapped = path.join(__dirname, 'architecture', 'mongodb-bootstrapped.js');
    var config = architect.loadConfig(bootstrapped);
    architect.createApp(config, function (error, app) {
      if (error) return helper.cleanMongoDB(app, function () { return callback(error); });

      return callback(null, app);
    });
  },

  cleanMongoDB : function cleanMongoDB(app, callback) {
    var mongod = app.getService('mongodbProcess');
    mongod.shutdown(function () {
      wrench.rmdirSyncRecursive(path.join(__dirname, '..', 'integration', 'test-mongodb'));

      return callback();
    });
  },

  /**
   * Use c9/architect to bootstrap a MySQL server for running integration
   * tests. Will create a blank data directory, meant to be paired with
   * cleanMySQL.
   *
   * @param Function callback The operations to be performed while the server
   *                          is running.
   */
  bootstrapMySQL : function bootstrapMySQL(callback) {
    var bootstrapped = path.join(__dirname, 'architecture', 'mysql-bootstrapped.js');
    var config = architect.loadConfig(bootstrapped);
    architect.createApp(config, function (error, app) {
      var cleanup = helper.cleanMySQL.bind(helper, app,
                                           function() { console.error("cleaned up!"); });
      process.on('uncaughtException', cleanup);
      process.on('SIGINT', cleanup);

      if (error) return helper.cleanMySQL(app, function () { return callback(error); });

      return callback(null, app);
    });
  },

  cleanMySQL : function cleanMySQL(app, callback) {
    var mysqld = app.getService('mysqldProcess');
    mysqld.shutdown(function () {
      wrench.rmdirSyncRecursive(path.join(__dirname, '..', 'integration', 'test-mysql'));

      return callback();
    });
  }
};
