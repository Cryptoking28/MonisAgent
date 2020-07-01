[![Community Project header](https://github.com/Cryptoking28/opensource-website/raw/master/src/images/categories/Community_Project.png)](https://opensource.monisagent.com/oss-category/#community-project)

# Monis Agent's NodeJS Agent

[![npm status badge][1]][2]

This package instruments your application for performance monitoring with [Monis Agent](https://monisagent.com).

In order to take full advantage of this package, make sure you have a [Monis Agent account](https://monisagent.com) before starting. Available features, such as slow transaction traces, will vary [based on account level](https://monisagent.com/application-monitoring/features).

As with any instrumentation tool, please test before using in production.

## Installation and Getting Started

To use Monis Agent's NodeJS agent, you'll need to

1. Install [the `monisagent` package](https://www.npmjs.com/package/monisagent)
2. Create a base configuration file
3. Require the agent in your program

To install the agent for performance monitoring, use your favorite NPM based package manager to install the `monisagent` package into your application

    $ npm install monisagent

Then, copy the stock configuration file to your program's base folder, and add your Monis Agent license key and application/service name.

    $ cp node_modules/monisagent/monisagent.js

    # File: monisagent.js
    'use strict'
    /**
     * Monis Agent agent configuration.
     *
     * See lib/config/default.js in the agent distribution for a more complete
     * description of configuration variables and their potential values.
     */
    exports.config = {
      app_name: ['Your application or service name'],
      license_key: 'your new relic license key',
      /* ... rest of configuration .. */
    }

Finally, load the `monisagent` module _before any other module_ in your program.

    const monisagent = require('monisagent')

    /* ... the rest of your program ... */

If you are compiling your javascript and can't control the final `require` order, the NodeJS agent will work with node's `-r/--require` flag.

    $ node -r monisagent your-program.js
    $ node --require monisagent your-program.js

For more information on getting started, [check the official docs](https://docs.monisagent.com/docs/agents/nodejs-agent/getting-started/introduction-monis-agent-nodejs).

## Using the API

The `monisagent` module returns an object with the Node Agent's API methods attached.

    const monisagent = require('monisagent')

    /* ... */
    monisagent.addCustomAttribute('some-attribute', 'some-value')

You can read more about using the API over on the [Monis Agent Documentation](https://docs.monisagent.com/docs/agents/nodejs-agent/api-guides/guide-using-nodejs-agent-api) site.

## Core Agent Development and Tests

To work on core agent features, you'll want to

1. Fork the Agent
2. Install its Dependencies
3. Run tests via `npm`

[Fork](https://github.com/Cryptoking28/monisagent/fork) and clone this GitHub repository

    $ git clone git@github.com:your-user-name/node-monisagent.git
    $ cd node-monisagent

Install the project's dependences

    $ npm install

and you'll be all set to start programming.

To run the test suite

1. Install [install Docker](https://www.docker.com/products/docker-desktop)
2. Start the docker services: `$ npm run services`
3. Run all the tests via `$ npm run test`

Available test suites include

    $ npm run unit
    $ npm run integration
    $ npm run versioned
    $ npm run lint
    $ npm run smoke

## Further Reading

Here's some resources for learning more about the Agent

- [Monis Agent's official NodeJS Agent Documentation](https://docs.monisagent.com/docs/agents/nodejs-agent)

- [Developer Docs](http://monisagent.github.io/node-monisagent/docs/)

- [Configuring the Agent (via `monisagent.js` or environment variables)](https://docs.monisagent.com/docs/agents/nodejs-agent/installation-configuration/nodejs-agent-configuration)

- [Use the Node Agent to add the Browser and SPA Monitoring](https://docs.monisagent.com/docs/agents/nodejs-agent/supported-features/monis-agent-browser-nodejs-agent)

- [API Transaction Naming](https://docs.monisagent.com/docs/agents/nodejs-agent/api-guides/nodejs-agent-api#request-names) and [Rules Based Transaction Naming](https://docs.monisagent.com/docs/agents/nodejs-agent/api-guides/nodejs-agent-api#ignoring)

- [Custom Instrumentation/Transactions](https://docs.monisagent.com/docs/agents/nodejs-agent/api-guides/guide-using-nodejs-agent-api#creating-transactions)

- [The Changelog](/node-monisagent/blob/main/NEWS.md)

## Support

Monis Agent hosts and moderates an online forum where customers can interact with Monis Agent employees as well as other customers to get help and share best practices. Like all official Monis Agent open source projects, there's a related Community topic in the Monis Agent Explorers Hub. You can find this project's topic/threads here:

https://discuss.monisagent.com/c/support-products-agents/node-js-agent/

## Contributing

We encourage your contributions to improve the NodeJS Agent. Keep in mind when you submit your pull request, you'll need to sign the CLA via the click-through using CLA-Assistant.

You only have to sign the CLA one time per project.

If you have any questions or need to execute our corporate CLA, (required if your contribution is on behalf of a company),  please drop us an email at opensource@monisagent.com.

## License

The NodeJS Agent is licensed under the [Apache 2.0](http://apache.org/licenses/LICENSE-2.0.txt) License.

The NodeJS Agent also uses source code from third-party libraries. You can find full details on which libraries are used and the terms under which they are licensed in [the third-party notices document](/node-monisagent/blob/main/THIRD_PARTY_NOTICES.md).


[1]: https://nodei.co/npm/monisagent.png
[2]: https://nodei.co/npm/monisagent
