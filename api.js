'use strict';

var path   = require('path')
  , logger = require(path.join(__dirname, 'lib', 'logger')).child({component : 'api'})
  , NAMES  = require(path.join(__dirname, 'lib', 'metrics', 'names'))
  ;

/**
 * The exported Monis Agent API. This contains all of the functions meant to be
 * used by Monis Agent customers. For now, that means transaction naming.
 */
function API(agent) {
  this.agent = agent;
}

/**
 * Give the current transaction a custom name. Overrides any Monis Agent naming
 * rules set in configuration or from Monis Agent's servers.
 *
 * IMPORTANT: this function must be called when a transaction is active. New
 * Relic transactions are tied to web requests, so this method may be called
 * from within HTTP or HTTPS listener functions, Express routes, or other
 * contexts where a web request or response object are in scope.
 *
 * @param {string} name The name you want to give the web request in the New
 *                      Relic UI. Will be prefixed with 'Custom/' when sent.
 */
API.prototype.nameTransaction = function (name) {
  var transaction = this.agent.getTransaction();
  if (!transaction) {
    return logger.warn("No transaction found when setting name to '%s'.", name);
  }

  if (!name) {
    if (transaction && transaction.url) {
      logger.error("Must include controller name in nameTransaction call for URL %s.",
                   transaction.url);
    }
    else {
      logger.error("Must include controller name in nameTransaction call.");
    }

    return;
  }

  transaction.scope = NAMES.CUSTOM + '/' + name;
};

/**
 * Give the current transaction a name based on your own idea of what
 * constitutes a controller in your Node application. Also allows you to
 * optionally specify the action being invoked on the controller. If the action
 * is omitted, then the API will default to using the HTTP method used in the
 * request (e.g. GET, POST, DELETE). Overrides any Monis Agent naming rules set
 * in configuration or from Monis Agent's servers.
 *
 * IMPORTANT: this function must be called when a transaction is active. New
 * Relic transactions are tied to web requests, so this method may be called
 * from within HTTP or HTTPS listener functions, Express routes, or other
 * contexts where a web request or response object are in scope.
 *
 * @param {string} name   The name you want to give the controller in the New
 *                        Relic UI. Will be prefixed with 'Controller/' when
 *                        sent.
 * @param {string} action The action being invoked on the controller. Defaults
 *                        to the HTTP method used for the request.
 */
API.prototype.nameController = function (name, action) {
  var transaction = this.agent.getTransaction();
  if (!transaction) {
    return logger.warn("No transaction found when setting controller to %s.", name);
  }

  if (!name) {
    if (transaction && transaction.url) {
      logger.error("Must include controller name in nameController call for URL %s.",
                   transaction.url);
    }
    else {
      logger.error("Must include controller name in nameController call.");
    }

    return;
  }

  action = action || transaction.verb || 'GET';
  transaction.scope = NAMES.CONTROLLER + '/' + name + '/' + action;
};

/**
 * If the URL for a transaction matches the provided pattern, name the
 * transaction with the provided name. If there are capture groups in the
 * pattern (which is a standard JavaScript regular expression), then the
 * substring matches ($1, $2, etc.) are replaced in the name string. BE CAREFUL
 * WHEN USING SUBSTITUTION. If the replacement substrings are highly variable
 * (i.e. are identifiers, GUIDs, or timestamps), the rule will generate too
 * many metrics and potentially get your application blacklisted by Monis Agent.
 *
 * An example of a good rule with replacements:
 *
 *   monisagent.addNamingRule('^/storefront/(v[1-5])/(item|category|tag)',
 *                          'CommerceAPI/$1/$2')
 *
 * An example of a bad rule with replacements:
 *
 *   monisagent.addNamingRule('^/item/([0-9a-f]+)', 'Item/$1')
 *
 * Keep in mind that the original URL and any query parameters will be sent
 * along with the request, so slow transactions will still be identifiable.
 *
 * Naming rules can not be removed once added. They can also be added
 * to the configuration. See configuration documentation for details.
 *
 * @param {RegExp} pattern The pattern to rename (with capture groups).
 * @param {string} name    The name to use for the transaction.
 */
API.prototype.addNamingRule = function (pattern, name) {
  if (!name) return logger.error("Simple naming rules require a replacement name.");

  this.agent.normalizer.addSimple(pattern, name);
};

/**
 * If the URL for a transaction matches the provided pattern, ignore the transaction
 * attached to that URL. Useful for filtering socket.io connections and other
 * long-polling requests out of your agents to keep them from distorting an app's
 * apdex or mean response time.
 *
 * Example:
 *
 *   monisagent.addIgnoringRule('^/socket\\.io/')
 *
 * @param {RegExp} pattern The pattern to ignore.
 */
API.prototype.addIgnoringRule = function (pattern) {
  if (!pattern) return logger.error("Must include a URL pattern to ignore.");

  this.agent.normalizer.addSimple(pattern, null);
};

module.exports = API;
