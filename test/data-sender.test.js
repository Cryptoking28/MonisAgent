'use strict';

var path       = require('path')
  , chai       = require('chai')
  , expect     = chai.expect
  , DataSender = require(path.join(__dirname, '..', 'lib', 'collector', 'data-sender'))
  ;

describe("DataSender", function () {
  describe("with compression", function () {
    it("should stream correctly-compressed data");
    it("should signal the correct content type");
  });

  it("should deliver payloads to the correct destination via proxies");
  it("should time out when connections take too long");

  it("should attach proxy host and port during URL canonicalization", function () {
    var config = {
      proxy_host : 'localhost',
      proxy_port : '8765',
      host       : 'collector.monisagent.com',
      port       : '80'
    };
    var sender = new DataSender(config, 12);

    var expected = 'http://collector.monisagent.com:80' +
                   '/agent_listener/invoke_raw_method' +
                   '?marshal_format=json&protocol_version=9&' +
                   'license_key=&method=test&agent_run_id=12';
    expect(sender.getURL('test')).equal(expected);
  });

  describe("when generating headers for a plain request", function () {
    var headers;

    beforeEach(function () {
      var config = {
        host       : 'collector.monisagent.com',
        port       : '80'
      };
      var sender = new DataSender(config, 12);

      headers = sender.getHeaders('test');
    });

    it("should use the content type from the parameter", function () {
      expect(headers["CONTENT-ENCODING"]).equal("identity");
    });

    it("should use the content length from the parameter", function () {
      expect(headers["Content-Length"]).equal(4);
    });

    it("should use a keepalive connection for reasons that escape me", function () {
      expect(headers.Connection).equal("Keep-Alive");
    });

    it("should have the host from the configuration", function () {
      expect(headers.host).equal("collector.monisagent.com");
    });

    it("should tell the server we're sending JSON", function () {
      expect(headers["Content-Type"]).equal("application/json");
    });

    it("should have a user-agent string", function () {
      expect(headers["User-Agent"]).not.equal(undefined);
    });
  });

  describe("when generating headers for a compressed request", function () {
    var headers;

    beforeEach(function () {
      var config = {
        host       : 'collector.monisagent.com',
        port       : '80'
      };
      var sender = new DataSender(config, 12);

      headers = sender.getHeaders('zxxvxzxzzx', true);
    });

    it("should use the content type from the parameter", function () {
      expect(headers["CONTENT-ENCODING"]).equal("deflate");
    });

    it("should use the content length from the parameter", function () {
      expect(headers["Content-Length"]).equal(10);
    });

    it("should use a keepalive connection for reasons that escape me", function () {
      expect(headers.Connection).equal("Keep-Alive");
    });

    it("should have the host from the configuration", function () {
      expect(headers.host).equal("collector.monisagent.com");
    });

    it("should tell the server we're sending JSON", function () {
      expect(headers["Content-Type"]).equal("application/octet-stream");
    });

    it("should have a user-agent string", function () {
      expect(headers["User-Agent"]).not.equal(undefined);
    });
  });

  describe("when performing RPC against the collector", function () {
    var sender
      , TEST_RUN_ID = Math.floor(Math.random() * 3000)
      ;

    beforeEach(function () {
      var config = {
        host        : 'collector.monisagent.com',
        port        : '80',
        license_key : 'hamburtson'
      };
      sender = new DataSender(config, TEST_RUN_ID);
    });

    it("should always add the agent run ID, if set", function () {
      expect(sender.agentRunId).equal(TEST_RUN_ID);
      expect(sender.getURL('TEST_METHOD')).match(new RegExp('agent_run_id=' + TEST_RUN_ID));
    });

    it("should correctly set up the method", function () {
      expect(sender.getURL('TEST_METHOD')).match(/method=TEST_METHOD/);
    });
  });
});
