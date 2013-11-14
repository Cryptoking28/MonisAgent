'use strict';

var path    = require('path')
  , util    = require('util')
  , url     = require('url')
  , http    = require('http')
  , deflate = require('zlib').deflate
  , lookup  = require('dns').lookup
  , logger  = require(path.join(__dirname, '..', 'logger'))
                .child({component : 'data_sender'})
  , Sink    = require(path.join(__dirname, '..', 'util', 'stream-sink'))
  ;

/*
 *
 * CONSTANTS
 *
 */
var PROTOCOL_VERSION        = 12
  , RESPONSE_VALUE_NAME     = 'return_value'
  , RUN_ID_NAME             = 'run_id'
  , RAW_METHOD_PATH         = '/agent_listener/invoke_raw_method'
  // see job/collector-master/javadoc/com/nr/servlet/AgentListener.html on NR Jenkins
  , USER_AGENT_FORMAT       = "MonisAgent-NodeAgent/%s (nodejs %s %s-%s)"
  , ENCODING_HEADER         = 'CONTENT-ENCODING'
  , CONTENT_TYPE_HEADER     = 'Content-Type'
  , DEFAULT_ENCODING        = 'identity'
  , DEFAULT_CONTENT_TYPE    = 'application/json'
  , COMPRESSED_ENCODING     = 'deflate'
  , COMPRESSED_CONTENT_TYPE = 'application/octet-stream'
  ;

function RemoteMethod(name, config) {
  if (!name) {
    throw new TypeError("Must include name of method to invoke on collector.");
  }

  this.name = name;
  this._config = config;
}

/**
 * The primary operation on RemoteMethod objects. If you're calling
 * anything on RemoteMethod objects aside from call (and you're not
 * writing test code), you're doing it wrong.
 *
 * @param object   payload    Serializable payload.
 * @param Function callback   What to do next. Gets passed any error.
 */
RemoteMethod.prototype.call = function call(payload, callback) {
  if (!payload) payload = [];

  var serialized;
  try {
    serialized = JSON.stringify(payload);
  }
  catch (error) {
    logger.error(error, "Unable to serialize payload for method %s.", this.name);
    return process.nextTick(function () {
      return callback(error);
    });
  }

  this._post(serialized, callback);
};

/**
 * Take a serialized payload and create a response wrapper for it before
 * invoking the method on the collector.
 *
 * @param string   methodName Name of method to invoke on collector.
 * @param string   data       Serialized payload.
 * @param Function callback   What to do next. Gets passed any error.
 */
RemoteMethod.prototype._post = function _post(data, callback) {
  var sender = this;

  // parse response into conventional Node object
  function parse(error, body) {
    if (error) return callback(error);

    if (!body) return callback();

    var json;
    try {
      json = JSON.parse(body);
    }
    catch (error) {
      return callback(error);
    }

    // can be super verbose, but useful for debugging
    logger.trace({response : json}, "Got back from from collector:");

    // If we get messages back from the collector, be polite and pass them along.
    var returned = json[RESPONSE_VALUE_NAME];
    if (returned && returned.messages) {
      returned.messages.forEach(function (element) {
        logger.info(element.message);
      });
    }

    /* If there's an exception, wait to return it until any messages have
     * been passed along.
     */
    if (json.exception) return callback(new Error(json.exception));

    // raw json is useful for tests and lower-level validation
    callback(undefined, returned, json);
  }

  // set up standard response handling
  function onResponse(response) {
    response.on('end', function () {
      logger.debug(
        "Finished receiving data back from the collector for %s.",
        sender.name
      );
    });

    if (response.statusCode < 200 || response.statusCode >= 300) {
      logger.debug("Got %s as a response code from the collector.", response.statusCode);

      var error = new Error(
        util.format("Got HTTP %s in response to %s.", response.statusCode, sender.name)
      );
      error.statusCode = response.statusCode;

      return callback(error);
    }

    response.setEncoding('utf8');
    response.pipe(new Sink(parse));
  }

  var options = {
    port       : this._config.proxy_port || this._config.port,
    host       : this._config.proxy_host || this._config.host,
    compressed : this._shouldCompress(data),
    path       : this._path(),
    onError    : callback,
    onResponse : onResponse
  };

  if (options.compressed) {
    logger.trace("Sending %s on collector API with (COMPRESSED): %s", this.name, data);

    deflate(data, function (err, deflated) {
      if (err) {
        logger.warn(err, "Error compressing JSON for delivery. Not sending.");
        return callback(err);
      }

      options.body = deflated;
      sender._safeRequest(options);
    });
  }
  else {
    logger.trace("Calling %s on collector API with: %s", this.name, data);

    options.body = data;
    this._safeRequest(options);
  }
};

/**
 * http.request does its own DNS lookup, and if it fails, will cause
 * dns.lookup to throw asynchronously instead of passing the error to
 * the callback (which is obviously awesome). To prevent Monis Agent from
 * crashing people's applications, verify that lookup works and bail out
 * early if not.
 *
 * Also, ensure that all the necessary parameters are set before
 * actually making the request. Useful to put here to simplify test code
 * that calls _request directly.
 *
 * @param object options A dictionary of request parameters.
 */
RemoteMethod.prototype._safeRequest = function _safeRequest(options) {
  if (!options) throw new Error("Must include options to make request!");
  if (!options.host) throw new Error("Must include collector hostname!");
  if (!options.port) throw new Error("Must include collector port!");
  if (!options.onError) throw new Error("Must include error handler!");
  if (!options.onResponse) throw new Error("Must include response handler!");
  if (!options.body) throw new Error("Must include body to send to collector!");
  if (!options.path) throw new Error("Must include URL to request!");

  var sender = this;
  lookup(options.host, function (error) {
    if (error) return options.onError(error);

    logger.debug("Requesting %s from %s:%s.", options.path, options.host, options.port);

    sender._request(options);
  });
};

/**
 * Generate the request headers and wire up the request. There are many
 * parameters used to make a request:
 *
 * @param string   options.host       Hostname (or proxy hostname) for collector.
 * @param string   options.port       Port (or proxy port) for collector.
 * @param string   options.path       URL path for method being invoked on collector.
 * @param string   options.body       Serialized payload to be sent to collector.
 * @param boolean  options.compressed Whether the payload has been compressed.
 * @param Function options.onError    Error handler for this request (probably the
 *                                    original callback given to .send).
 * @param Function options.onResponse Response handler for this request (created by
 *                                    ._post).
 */
RemoteMethod.prototype._request = function _request(options) {
  var request = http.request({
    method           : 'POST',
    setHost          : false,         // see below
    host             : options.host,  // set explicitly in the headers
    port             : options.port,
    path             : options.path,
    headers          : this._headers(options.body.length, options.compressed),
    __NR__connection : true           // who measures the metrics measurer?
  });

  request.on('error',    options.onError);
  request.on('response', options.onResponse);

  request.end(options.body);
};

/**
 * See the constants list for the format string (and the URL that explains it).
 */
RemoteMethod.prototype._userAgent = function _userAgent() {
  return util.format(USER_AGENT_FORMAT,
                     this._config.version,
                     process.versions.node,
                     process.platform,
                     process.arch);
};

/**
 * FIXME Use the newer "RESTful" URLs.
 *
 * @param string methodName The method to invoke on the collector.
 *
 * @returns string The URL path to be POSTed to.
 */
RemoteMethod.prototype._path = function _path() {
  var query = {
      marshal_format   : 'json',
      protocol_version : PROTOCOL_VERSION,
      license_key      : this._config.license_key,
      method           : this.name
  };

  if (this._config.run_id) query[RUN_ID_NAME] = this._config.run_id;

  var formatted = url.format({
    pathname : RAW_METHOD_PATH,
    query    : query
  });

  if (this._config.proxy_host || this._config.proxy_port > 0) {
    return 'http://' + this._config.host + ':' + this._config.port + formatted;
  }
  else {
    return formatted;
  }
};

/**
 * @param number  length     Length of data to be sent.
 * @param boolean compressed Whether the data are compressed.
 */
RemoteMethod.prototype._headers = function _headers(length, compressed) {
  var agent = this._userAgent();

  var headers = {
    // select the virtual host on the server end
    'Host'           : this._config.host,
    'User-Agent'     : agent,
    'Connection'     : 'Keep-Alive',
    'Content-Length' : length
  };

  if (compressed) {
    headers[ENCODING_HEADER]     = COMPRESSED_ENCODING;
    headers[CONTENT_TYPE_HEADER] = COMPRESSED_CONTENT_TYPE;
  }
  else {
    headers[ENCODING_HEADER]     = DEFAULT_ENCODING;
    headers[CONTENT_TYPE_HEADER] = DEFAULT_CONTENT_TYPE;
  }

  return headers;
};

/**
 * FLN pretty much decided on his own recognizance that 64K was a good point
 * at which to compress a server response. There's only a loose consensus that
 * the threshold should probably be much higher than this, if only to keep the
 * load on the collector down.
 *
 * FIXME: come up with a better heuristic
 */
RemoteMethod.prototype._shouldCompress = function (data) {
  return data && Buffer.byteLength(data, 'utf8') > 65536;
};

module.exports = RemoteMethod;
