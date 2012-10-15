'use strict';

var path    = require('path')
  , tap     = require('tap')
  , test    = tap.test
  , shimmer = require(path.join(__dirname, '..', '..', 'lib', 'shimmer'))
  , helper  = require(path.join(__dirname, '..', 'lib', 'agent_helper'))
  ;

test("memcached instrumentation should find memcached calls in the transaction trace",
     {timeout : 5000},
     function (t) {
  t.plan(15);

  var self = this;
  helper.bootstrapMemcached(function (error, app) {
    if (error) return t.fail(error);

    var agent = helper.loadMockedAgent();
    shimmer.bootstrapInstrumentation(agent);
    var Memcached = require('memcached');

    var memcached = new Memcached('localhost:11211');

    self.tearDown(function () {
      helper.cleanMemcached(app, function done() {
        helper.unloadAgent(agent);
      });
    });

    t.notOk(agent.getTransaction(), "no transaction should be in play");

    helper.runInTransaction(agent, function transactionInScope() {
      var transaction = agent.getTransaction();
      t.ok(transaction, "transaction should be visible");

      memcached.set('testkey', 'arglbargle', 1000, function (error, ok) {
        if (error) return t.fail(error);

        t.ok(agent.getTransaction(), "transaction should still be visible");
        t.ok(ok, "everything should be peachy after setting");

        memcached.get('testkey', function (error, value) {
          if (error) return t.fail(error);

          t.ok(agent.getTransaction(), "transaction should still still be visible");
          t.equals(value, 'arglbargle', "memcached client should still work");

          transaction.end();

          var trace = transaction.getTrace();
          t.ok(trace, "trace should exist");
          t.ok(trace.root, "root element should exist");
          t.equals(trace.root.children.length, 1, "there should be only one child of the root");

          var setSegment = trace.root.children[0];
          t.ok(setSegment, "trace segment for set should exist");
          t.equals(setSegment.name, "Memcache/set", "should register the set");
          t.equals(setSegment.children.length, 1, "set should have an only child");

          var getSegment = setSegment.children[0];
          t.ok(getSegment, "trace segment for get should exist");
          t.equals(getSegment.name, "Memcache/get", "should register the get");
          t.equals(getSegment.children.length, 0, "get should leave us here at the end");

          t.end();
        });
      });
    });
  });
});
