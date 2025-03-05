<div style="text-align: center">
<picture><source media="(prefers-color-scheme: dark)" srcset="https://www.monisagent.com/sites/default/files/2023-02/Product%20Screen%202.svg"><source media="(prefers-color-scheme: light)" srcset="https://www.monisagent.com/sites/default/files/2023-02/Product%20Screen%202.svg"><img alt="Monis Agent Open Source community plus project banner." src="https://www.monisagent.com/sites/default/files/2023-02/Product%20Screen%202.svg"></picture>
</div>

# Monis Agent's Node.js agent

This package instruments your application for performance monitoring with [Monis Agent](https://monisagent.com).

In order to take full advantage of this package, make sure you have a [Monis Agent account](https://monisagent.com) before starting. Available features, such as slow transaction traces, will vary based on account level

As with any instrumentation tool, please test before using in production.

## Installation

To use Monis Agent's Node.js agent entails these three steps, which are described in detail below:

- Install the `monisagent` package
- Create a base configuration file
- Require the agent in your program

1. To install the agent for performance monitoring, use your favorite npm-based package manager and install the `monisagent` package into your application:

    ```sh
    npm install monisagent
    ```

2. Then, copy the stock configuration file to your program's base folder:

    ```sh
    cp ./node_modules/monisagent/monisagent.js ./<your destination>
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

    ```sh
    node -r monisagent your-program.js
    ```

If you cannot control how your program is run, you can load the `monisagent` module _before any other module_ in your program.

```js
    const monisagent = require('monisagent')

    /* ... the rest of your program ... */
```

## Next.js instrumentation

**Note**: The minimum supported Next.js version is [12.0.9](https://github.com/vercel/next.js/releases/tag/v12.0.9).  If you are using Next.js middleware the minimum supported version is [12.2.0](https://github.com/vercel/next.js/releases/tag/v12.2.0).

The Monis Agent Node.js agent provides instrumentation for Next.js  The instrumentation provides telemetry for server-side rendering via [getServerSideProps](https://nextjs.org/docs/basic-features/data-fetching/get-server-side-props), [middleware](https://nextjs.org/docs/middleware), and Monis Agent transaction naming for both page and server requests. It does not provide any instrumentation for actions occurring during build or in client-side code.  If you want telemetry data on actions occurring on the client (browser), you can [inject the browser agent](./documentation/nextjs/faqs/browser-agent.md).

Here are documents for more in-depth explanations about [transaction naming](./documentation/nextjs/transactions.md), and [segments/spans](./documentation/nextjs/segments-and-spans.md).

### Setup

Typically you are running a Next.js app with the `next` cli and you must load the agent via `NODE_OPTIONS`:

```sh
NODE_OPTIONS='-r monisagent' next start
```

If you are having trouble getting the `monisagent` package to instrument Next.js, take a look at our [FAQs](./documentation/nextjs/faqs/README.md).

### Next.js example projects

The following example applications show how to load the `monisagent` instrumentation, inject browser agent, and handle errors:

- Pages Router example
- App Router example

### Custom Next.js servers

If you are using next as a [custom server](https://nextjs.org/docs/advanced-features/custom-server), you're probably not running your application with the `next` CLI.  In that scenario we recommend running the Next.js instrumentation as follows.

```sh
node -r monisagent your-program.js
```

## ECMAScript Modules

If your application is written with `import` and `export` statements in javascript, you are using [ES Modules](https://nodejs.org/api/esm.html#modules-ecmascript-modules) and must bootstrap the agent in a different way.

The Monis Agent Node.js agent includes _**_experimental_**_ support for ES Modules. The agent is reliant on an experimental feature in Node.js in order to appropriately register instrumentation. Until the Node.js API for [ES Module Loaders](https://nodejs.org/api/esm.html#loaders) is stable, breaking changes may occur when updating Node.js. Lastly, the ESM loader does not follow the same supported Node.js versions as the agent. The minimum supported version of Node.js is `v16.12.0`.

### Setup

 1. If you rely on a configuration file to run the agent, you must rename the file from `monisagent.js` to `monisagent.cjs` so it can be properly loaded.  All the contents of the configuration file will behave the same once you rename. See [CommonJS modules in ESM](https://nodejs.org/api/modules.html#enabling) for more details.

    ```sh
    mv monisagent.js monisagent.cjs
    ```

 2. To use the monisagent ESM loader, start your program with node and use the `--experimental-loader` flag and a path to the loader file, like this:

    ```sh
    node --experimental-loader monisagent/esm-loader.mjs -r monisagent your-program.js
    ```

**Note**: Unlike the CommonJS methods listed above, there are no alternatives to running the agent without the `--experimental-loader` flag.

### Custom Instrumentation

The agent supports adding your own custom instrumentation to ES module applications. You can use the instrumentation API methods. The only other difference between CommonJS custom instrumentation and ESM is you must provide a property of `isEsm: true`.

```js
import monisagent from 'monisagent'
monisagent.instrument({ moduleName: 'parse-json', isEsm: true }, function wrap(shim, parseJson, moduleName) {
  shim.wrap(parseJson.default, function wrapParseJson(shim, orig) {
      return function wrappedParseJson() {
          const result = orig.apply(this, arguments)
          result.instrumented = true
          return true
      }
  })
})
```

We support the following custom instrumentation API methods in ES module apps:

- `monisagent.instrument`
- `monisagent.instrumentConglomerate`
- `monisagent.instrumentDatastore`
- `monisagent.instrumentMessages`
- `monisagent.instrumentWebframework`

Note that we _do not_ support `monisagent.instrumentLoadedModule`, for the same issue of immutability mentioned above.

If you want to see an example of how to write custom instrumentation in an ES module app, check out our examples repo for a working demo.

## Getting Started

For more information on getting started, check the Node.js docs.

### External Modules

There are modules that can be installed and configured to accompany the Node.js agent:

- `@monisagent/apollo-server-plugin`: Monis Agent's official Apollo Server plugin for use with the Node.js agent.

There are modules included within the Node.js agent to add more instrumentation for 3rd party modules:

- `@monisagent/native-metrics`: Provides hooks into the native v8 layer of Node.js to provide metrics to the Node.js agent.

## Usage

### Using the API

The `monisagent` module returns an object with the Node.js agent's API methods attached.

```js
    const monisagent = require('monisagent')

    /* ... */
    monisagent.addCustomAttribute('some-attribute', 'some-value')
```

You can read more about using the API over on the Monis Agent documentation site.

## Testing

These are the steps to work on core agent features, with more detail below:

- Fork the agent
- Install its dependencies
- Run tests using `npm`

1. Fork and clone this GitHub repository:

    ```sh
    git clone git@github.com:your-user-name/node-monisagent.git
    cd node-monisagent
    ```

2. Install the project's dependencies:

    ```sh
    npm install
    ```

Then you're all set to start programming.

### To run the test suite

1. [Install Docker](https://www.docker.com/products/docker-desktop)
2. Start the Docker services: `$ npm run services`
3. Run all the tests using `$ npm run test`

Available test suites include:

  ```sh
  npm run unit
  npm run integration
  npm run versioned
  npm run lint
  npm run smoke
  ```

## Further Reading

Here are some resources for learning more about the agent:

- Monis Agent's official Node.js agent documentation

- Developer docs

- Configuring the agent using `monisagent.js` or environment variable

- Use the node agent to add the Browser and SPA monitoring

- API transaction naming and rules-based transaction naming

- Custom instrumentation/transactions

- The changelog

- Example applications - Working examples of Monis Agent features in Node.js.

## Support

Should you need assistance with Monis Agent products, you are in good hands with several support channels.

If the issue has been confirmed as a bug or is a feature request, please file a GitHub issue.

**Support Channels**

- Monis Agent Documentation: Comprehensive guidance for using our platform
- Monis Agent Community: The best place to engage in troubleshooting questions
- Monis Agent Developer: Resources for building a custom observability applications
- Monis Agent University: A range of online training for Monis Agent users of every level
- Monis Agent Technical Support 24/7/365 ticketed support. Read more about our Technical Support Offerings.

## Privacy

At Monis Agent we take your privacy and the security of your information seriously, and are committed to protecting your information. We must emphasize the importance of not sharing personal data in public forums, and ask all users to scrub logs and diagnostic information for sensitive information, whether personal, proprietary, or otherwise.

We define “Personal Data” as any information relating to an identified or identifiable individual, including, for example, your name, phone number, post code or zip code, Device ID, IP address and email address.

Please review Monis Agent’s General Data Privacy Notice for more information.

## Roadmap

See our [roadmap](./ROADMAP_Node.md), to learn more about our product vision, understand our plans, and provide us valuable feedback.

## Contribute

We encourage your contributions to improve the Node.js agent! Keep in mind when you submit your pull request, you'll need to sign the CLA via the click-through using CLA-Assistant. You only have to sign the CLA one time per project.

If you have any questions, or to execute our corporate CLA, required if your contribution is on behalf of a company,  please drop us an email at <opensource@monisagent.com>.

**A note about vulnerabilities**

As noted in our [security policy](../../security/policy), Monis Agent is committed to the privacy and security of our customers and their data. We believe that providing coordinated disclosure by security researchers and engaging with the security community are important means to achieve our security goals.

If you believe you have found a security vulnerability in this project or any of Monis Agent's products or websites, we welcome and greatly appreciate you reporting it to Monis Agent through [our bug bounty program](https://docs.monisagent.com/docs/security/security-privacy/information-security/report-security-vulnerabilities/).

If you would like to contribute to this project, review [these guidelines](./CONTRIBUTING.md).

To [all contributors](https://github.com/Cryptoking28/monisagent/graphs/contributors), we thank you!  Without your contribution, this project would not be what it is today.  We also host a community project page dedicated to [Monis Agent Node Agent](https://opensource.monisagent.com/projects/monisagent/node-monisagent).

## License

Except as noted below, the Node.js agent is licensed under the [Apache 2.0](https://apache.org/licenses/LICENSE-2.0.txt) License.

The Monis Agent [security agent](https://github.com/Cryptoking28/csec-node-agent) is licensed under the Monis Agent Software License v1.0.  The Monis Agent security agent module may be integrated like the Monis Agent Node.js agent.

The Node.js agent also uses source code from third-party libraries. You can find full details on which libraries are used and the terms under which they are licensed in [the third-party notices document](https://github.com/Cryptoking28/monisagent/blob/main/THIRD_PARTY_NOTICES.md).
