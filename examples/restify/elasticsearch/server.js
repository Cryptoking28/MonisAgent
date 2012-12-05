'use strict';

require('monisagent');

var restify = require('restify');
var server = restify.createServer({name: 'monisagent-elasticsearch'});

server.get('/', function(req, res, next) {
  var ElasticSearchClient = require('elasticsearchclient');
  var client = new ElasticSearchClient({host: 'localhost', port: 9200});
  client.health()
    .on('data', function(data) {
      res.contentType = 'text/plain';
      res.send('data = ' + data);
      next();
    })
    .on('error', function(error) {
      res.contentType = 'text/plain';
      res.send('error = ' + error);
      next();
    })
    .exec();
});

server.listen(8080);
