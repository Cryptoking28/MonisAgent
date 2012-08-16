'use strict';

var http  = require('http')
  , agent = require ('monisagent_agent')()
  ;

var server = http.createServer(function (request, response) {
  var body = '<html><head><title>yo dawg</title></head><body><p>I heard you like HTML.</p></body></html>';
  response.writeHead(200, {'Content-Length' : body.length, 'Content-Type' : 'text/html'});
  response.end(body);

  console.log('metrics after request', JSON.stringify(agent.metrics));
});

server.listen(8080, 'localhost');
