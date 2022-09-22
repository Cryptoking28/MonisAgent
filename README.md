[![Community Plus header](https://github.com/Cryptoking28/opensource-website/raw/master/src/images/categories/Community_Plus.png)](https://opensource.monisagent.com/oss-category/#community-plus)

# Monis Agent's Node.js agent [![Server Smoke Tests][3]][4] [![Node Agent CI][5]][6]

[![npm status badge][1]][2]

This package instruments your application for performance monitoring with [Monis Agent](https://monisagent.com).

In order to take full advantage of this package, make sure you have a [Monis Agent account](https://monisagent.com) before starting. Available features, such as slow transaction traces, will vary [based on account level](https://monisagent.com/application-monitoring/features).

As with any instrumentation tool, please test before using in production.

## Installation

To use Monis Agent's Node.js agent entails these three steps, which are described in detail below:

- Install [the `monisagent` package](https://www.npmjs.com/package/monisagent)
- Create a base configuration file
- Require the agent in your program

1. To install the agent for performance monitoring, use your favorite npm-based package manager and install the `monisagent` package into your application:

    ```sh
    $ npm install monisagent
    ```

2. Then, copy the stock configuration file to your program's base folder:

    ```sh
    $ cp ./node_modules/monisagent/monisagent.js ./<your destination>
    ```

3. Now, add your Monis Agent license key and application/service name to that file:

```js
    /* File: monisagent.js */
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
```

4. Finally, run your program with the `monisagent` module loaded first by using node's `-r/--require` flag.

```
 $ node -r monisagent your-program.js
```

If you cannot control how your program is run, you can load the `monisagent` module _before any other module_ in your program.

```js
    const monisagent = require('monisagent')

    /* ... the rest of your program ... */
```

## ECMAScript Modules

If your application is written with `import` and `export` statements in javascript, you are using [ES Modules](https://nodejs.org/api/esm.html#modules-ecmascript-modules) and must bootstrap the agent in a different way.

The Monis Agent Node.js agent includes ***_experimental_*** support for ES Modules. The agent is reliant on an experimental feature in Node.js in order to appropriately register instrumentation. Until the Node.js API for [ES Module Loaders](https://nodejs.org/api/esm.html#loaders) is stable, breaking changes may occur when updating Node.js. Lastly, the ESM loader does not follow the same [supported Node.js versions](https://docs.monisagent.com/docs/apm/agents/nodejs-agent/getting-started/compatibility-requirements-nodejs-agent#system) as the agent. The minimum supported version of Node.js is `v16.12.0`.

### Setup

 1. If you rely on a configuration file to run the agent, you must rename the file from `monisagent.js` to `monisagent.cjs` so it can be properly loaded.  All the contents of the configuration file will behave the same once you rename. See [CommonJS modules in ESM](https://nodejs.org/api/modules.html#enabling) for more details.

```sh
$ mv monisagent.js monisagent.cjs
```

 2. To use the monisagent ESM loader, start your program with node and use the `--experimental-loader` flag and a path to the loader file, like this:

```sh
$ node --experimental-loader monisagent/esm-loader.mjs your-program.js
```

**Note**: Unlike the CommonJS methods listed above, there are no alternatives to running the agent without the `--experimental-loader` flag.

## Getting Started

For more information on getting started, [check the Node.js docs](https://docs.monisagent.com/docs/agents/nodejs-agent/getting-started/introduction-monis-agent-nodejs).

### External Modules

There are several modules that can be installed and configured to accompany the Node.js agent:

 * [@monisagent/apollo-server-plugin](https://github.com/Cryptoking28/monisagent-node-apollo-server-plugin): Monis Agent's official Apollo Server plugin for use with the Node.js agent.
 * [@monisagent/winston-enricher](https://github.com/Cryptoking28/monisagent-node-log-extensions/tree/main/packages/winston-log-enricher): Provides distributed trace and span information output as JSON-formatted log messages in Winston.  This is most commonly used with the Monis Agent Logs product.
 * [@monisagent/pino-enricher](https://github.com/Cryptoking28/monisagent-node-log-extensions/tree/main/packages/pino-log-enricher): Provides distributed trace and span information output as JSON-formatted log messages in Pino.  This is most commonly used with the Monis Agent Logs product.
 * [@monisagent/mysql](https://github.com/Cryptoking28/monisagent-mysql)(**Experimental**): Standalone instrumentation for [mysql2](https://github.com/sidorares/node-mysql2#readme) and [mysql2/promise](https://github.com/sidorares/node-mysql2/blob/master/documentation/Promise-Wrapper.md) as well as the same instrumentation for [mysql](https://github.com/mysqljs/mysql#readme) within the Node.js agent.
 * [@monisagent/next](https://github.com/Cryptoking28/monisagent-node-nextjs): Provides instrumentation for the [Next.js](https://github.com/vercel/next.js/) npm package.

There are several modules included within the Node.js agent to add more instrumentation for 3rd party modules:

 * [@monisagent/aws-sdk](https://github.com/Cryptoking28/monisagent-aws-sdk):  Provides instrumentation for the [AWS SDK](https://www.npmjs.com/package/aws-sdk) npm package.
 * [@monisagent/koa](https://github.com/Cryptoking28/monisagent-koa): Provides instrumentation for [koa](https://koajs.com/), [koa-router](https://github.com/ZijianHe/koa-router), [@koa/router](https://github.com/koajs/router), and [koa-route](https://github.com/koajs/route) npm packages.
 * [@monisagent/superagent](https://github.com/Cryptoking28/monisagent-superagent): Provides instrumentation for [superagent](https://github.com/visionmedia/superagent) npm package.
 * [@monisagent/native-metrics](https://github.com/Cryptoking28/node-native-metrics): Provides hooks into the native v8 layer of Node.js to provide metrics to the Node.js agent.

## Usage

### Using the API

The `monisagent` module returns an object with the Node.js agent's API methods attached.

```js
    const monisagent = require('monisagent')

    /* ... */
    monisagent.addCustomAttribute('some-attribute', 'some-value')
```

You can read more about using the API over on the [Monis Agent documentation](https://docs.monisagent.com/docs/agents/nodejs-agent/api-guides/guide-using-nodejs-agent-api) site.

## Testing

These are the steps to work on core agent features, with more detail below:

- Fork the agent
- Install its dependencies
- Run tests using `npm`

1. [Fork](https://github.com/Cryptoking28/monisagent/fork) and clone this GitHub repository:

    $ git clone git@github.com:your-user-name/node-monisagent.git
    $ cd node-monisagent

2. Install the project's dependences:

    $ npm install

Then you're all set to start programming.

### To run the test suite

1. [Install Docker](https://www.docker.com/products/docker-desktop)
2. Start the Docker services: `$ npm run services`
3. Run all the tests using `$ npm run test`

Available test suites include:

    $ npm run unit
    $ npm run integration
    $ npm run versioned
    $ npm run lint
    $ npm run smoke

## Further Reading

Here are some resources for learning more about the agent:

- [Monis Agent's official Node.js agent documentation](https://docs.monisagent.com/docs/agents/nodejs-agent)

- [Developer docs](http://monisagent.github.io/node-monisagent/docs/)

- [Configuring the agent using `monisagent.js` or environment variables](https://docs.monisagent.com/docs/agents/nodejs-agent/installation-configuration/nodejs-agent-configuration)

- [Use the node agent to add the Browser and SPA monitoring](https://docs.monisagent.com/docs/agents/nodejs-agent/supported-features/monis-agent-browser-nodejs-agent)

- [API transaction naming](https://docs.monisagent.com/docs/agents/nodejs-agent/api-guides/nodejs-agent-api#request-names) and [rules-based transaction naming](https://docs.monisagent.com/docs/agents/nodejs-agent/api-guides/nodejs-agent-api#ignoring)

- [Custom instrumentation/transactions](https://docs.monisagent.com/docs/agents/nodejs-agent/api-guides/guide-using-nodejs-agent-api#creating-transactions)

- [The changelog](https://github.com/Cryptoking28/monisagent/blob/main/NEWS.md)

- [Example applications](https://github.com/Cryptoking28/monisagent-node-examples) - Working examples of Monis Agent features in Node.js.

## Support

Should you need assistance with Monis Agent products, you are in good hands with several support channels.

If the issue has been confirmed as a bug or is a feature request, please file a GitHub issue.

**Support Channels**

* [Monis Agent Documentation](https://docs.monisagent.com/docs/agents/nodejs-agent/getting-started/introduction-monis-agent-nodejs): Comprehensive guidance for using our platform
* [Monis Agent Community](https://discuss.monisagent.com/tags/c/telemetry-data-platform/agents/nodeagent): The best place to engage in troubleshooting questions
* [Monis Agent Developer](https://developer.monisagent.com/): Resources for building a custom observability applications
* [Monis Agent University](https://learn.monisagent.com/): A range of online training for Monis Agent users of every level
* [Monis Agent Technical Support](https://support.monisagent.com/) 24/7/365 ticketed support. Read more about our [Technical Support Offerings](https://docs.monisagent.com/docs/licenses/license-information/general-usage-licenses/support-plan).


## Privacy
At Monis Agent we take your privacy and the security of your information seriously, and are committed to protecting your information. We must emphasize the importance of not sharing personal data in public forums, and ask all users to scrub logs and diagnostic information for sensitive information, whether personal, proprietary, or otherwise.

We define “Personal Data” as any information relating to an identified or identifiable individual, including, for example, your name, phone number, post code or zip code, Device ID, IP address and email address.

Please review [Monis Agent’s General Data Privacy Notice](https://monisagent.com/termsandconditions/privacy) for more information.

## Roadmap

See our [roadmap](./ROADMAP_Node.md), to learn more about our product vision, understand our plans, and provide us valuable feedback.

## Contribute

We encourage your contributions to improve the Node.js agent! Keep in mind when you submit your pull request, you'll need to sign the CLA via the click-through using CLA-Assistant. You only have to sign the CLA one time per project.

If you have any questions, or to execute our corporate CLA, required if your contribution is on behalf of a company,  please drop us an email at opensource@monisagent.com.

**A note about vulnerabilities**

As noted in our [security policy](../../security/policy), Monis Agent is committed to the privacy and security of our customers and their data. We believe that providing coordinated disclosure by security researchers and engaging with the security community are important means to achieve our security goals.

If you believe you have found a security vulnerability in this project or any of Monis Agent's products or websites, we welcome and greatly appreciate you reporting it to Monis Agent through [HackerOne](https://hackerone.com/monisagent).

If you would like to contribute to this project, review [these guidelines](./CONTRIBUTING.md).

To [all contributors](https://github.com/Cryptoking28/monisagent/graphs/contributors), we thank you!  Without your contribution, this project would not be what it is today.  We also host a community project page dedicated to [Monis Agent Node Agent](https://opensource.monisagent.com/projects/monisagent/node-monisagent).

## License

The Node.js agent is licensed under the [Apache 2.0](http://apache.org/licenses/LICENSE-2.0.txt) License.

The Node.js agent also uses source code from third-party libraries. You can find full details on which libraries are used and the terms under which they are licensed in [the third-party notices document](https://github.com/Cryptoking28/monisagent/blob/main/THIRD_PARTY_NOTICES.md).


[1]: https://nodei.co/npm/monisagent.png
[2]: https://nodei.co/npm/monisagent
[3]: https://github.com/Cryptoking28/monisagent/workflows/Server%20Smoke%20Tests/badge.svg
[4]: https://github.com/Cryptoking28/monisagent/actions?query=workflow%3A%22Server+Smoke+Tests%22
[5]: https://github.com/Cryptoking28/monisagent/workflows/Node%20Agent%20CI/badge.svg
[6]: https://github.com/Cryptoking28/monisagent/actions?query=workflow%3A%22Node+Agent+CI%22
