<a href="https://opensource.monisagent.com/oss-category/#community-plus"><picture><source media="(prefers-color-scheme: dark)" srcset="https://github.com/Cryptoking28/opensource-website/raw/main/src/images/categories/dark/Community_Plus.png"><source media="(prefers-color-scheme: light)" srcset="https://github.com/Cryptoking28/opensource-website/raw/main/src/images/categories/Community_Plus.png"><img alt="Monis Agent Open Source community plus project banner." src="https://github.com/Cryptoking28/opensource-website/raw/main/src/images/categories/Community_Plus.png"></picture></a>

# Monis Agent Next.js instrumentation 
[![npm status badge][4]][5] [![Next.js Instrumentation CI][1]][2] [![codecov][6]][7]

This is Monis Agent's official Next.js framework instrumentation for use with the Monis Agent [Node.js agent](https://github.com/Cryptoking28/monisagent).

This module provides instrumentation for server-side rendering via [getServerSideProps](https://nextjs.org/docs/basic-features/data-fetching/get-server-side-props), [middleware](https://nextjs.org/docs/middleware), and Monis Agent transaction naming for both page and server requests. It does not provide any instrumentation for actions occurring during build or in client-side code.  If you want telemetry data on actions occurring on the client (browser), you can [inject the browser agent](./docs/faqs/browser-agent.md).

Here are documents for more in-depth explanations about [transaction naming](./docs/transactions.md), and [segments/spans](./docs/segments-and-spans.md).

**Note**: The minimum supported Next.js version is [12.0.9](https://github.com/vercel/next.js/releases/tag/v12.0.9).  If you are using Next.js middleware the minimum supported version is [12.2.0](https://github.com/vercel/next.js/releases/tag/v12.2.0).

## Installation

Currently this package is not bundled with the agent, and must be installed as a standalone.  However, the package depends on the agent so you will get all the capabilities of the agent when loading this package.

```
npm install @monisagent/next
```

```js
NODE_OPTIONS='-r @monisagent/next' next start
```

If you cannot control how your program is run, you can load the `@monisagent/next` module before any other module in your program. However, we strongly suggest you avoid this method at all costs.  We found bundling when running `next build` causes problems and also will make your bundle unnecessarily large.

```js
require('@monisagent/next')

/* ... the rest of your program ... */
```

### Custom Next.js servers

If you are using next as a [custom server](https://nextjs.org/docs/advanced-features/custom-server), you're probably not running your application with the `next` CLI.  In that scenario we recommend running the Next.js instrumentation as follows.

```js
node -r @monisagent/next your-program.js
```

For more information, please see the agent [installation guide][3].

## Getting Started

Our [API and developer documentation](http://monisagent.github.io/node-monisagent/) for writing instrumentation will be of help. We particularly recommend the tutorials and various "shim" API documentation.

## FAQs

If you are having trouble getting the `@monisagent/next` package to instrument Next.js, take a look at our [FAQs](./docs/faqs/README.md).

## Testing

The module includes a suite of unit and functional tests which should be used to
verify that your changes don't break existing functionality.

All tests are stored in `tests/` and are written using
[Tap](https://www.npmjs.com/package/tap) with the extension `.test.js` (unit), or `.tap.js` (versioned).

To run the full suite, run: `npm test`.

Individual test scripts include:

```
npm run unit
npm run versioned
```

## Example projects

The following example applications show how to load the `@monisagent/next` instrumentation, inject browser agent, and handle errors:

 * [Pages Router example](https://github.com/Cryptoking28/monisagent-node-examples/tree/58f760e828c45d90391bda3f66764d4420ba4990/nextjs-legacy)
 * [App Router example](https://github.com/Cryptoking28/monisagent-node-examples/tree/58f760e828c45d90391bda3f66764d4420ba4990/nextjs-app-router)

## Support

Monis Agent hosts and moderates an online forum where you can interact with Monis Agent employees as well as other customers to get help and share best practices. Like all official Monis Agent open source projects, there's a related community topic in the Monis Agent Explorers Hub. You can find this project's topic/threads here:

* [Monis Agent Documentation](https://docs.monisagent.com/docs/agents/nodejs-agent/getting-started/introduction-monis-agent-nodejs): Comprehensive guidance for using our platform
* [Monis Agent Community](https://forum.monisagent.com/): The best place to engage in troubleshooting questions
* [Monis Agent Developer](https://developer.monisagent.com/): Resources for building a custom observability applications
* [Monis Agent University](https://learn.monisagent.com/): A range of online training for Monis Agent users of every level
* [Monis Agent Technical Support](https://support.monisagent.com/) 24/7/365 ticketed support. Read more about our [Technical Support Offerings](https://docs.monisagent.com/docs/licenses/license-information/general-usage-licenses/support-plan).

## Contribute

We encourage your contributions to improve the Next.js instrumentation module! Keep in mind that when you submit your pull request, you'll need to sign the CLA via the click-through using CLA-Assistant. You only have to sign the CLA one time per project.

If you have any questions, or want to execute our corporate CLA (which is required if your contribution is on behalf of a company), drop us an email at opensource@monisagent.com.

**A note about vulnerabilities**

As noted in our [security policy](../../security/policy), Monis Agent is committed to the privacy and security of our customers and their data. We believe that providing coordinated disclosure by security researchers and engaging with the security community are important means to achieve our security goals.

If you believe you have found a security vulnerability in this project or any of Monis Agent's products or websites, we welcome and greatly appreciate you reporting it to Monis Agent through [HackerOne](https://hackerone.com/monisagent).

If you would like to contribute to this project, review [these guidelines](./CONTRIBUTING.md).

To all contributors, we thank you!  Without your contribution, this project would not be what it is today.  We also host a community project page dedicated to [Monis Agent Next.js instrumentation](https://opensource.monisagent.com/projects/monisagent/monisagent-node-nextjs).

## License
Monis Agent Next.js instrumentation is licensed under the [Apache 2.0](http://apache.org/licenses/LICENSE-2.0.txt) License.

Monis Agent Next.js instrumentation also uses source code from third-party libraries. You can find the full details on which libraries are used and the terms under which they are licensed in the third-party notices document.

[1]: https://github.com/Cryptoking28/monisagent-node-nextjs/workflows/Next.js%20Instrumentation%20CI/badge.svg
[2]: https://github.com/Cryptoking28/monisagent-nextjs/actions
[3]: https://docs.monisagent.com/docs/agents/nodejs-agent/installation-configuration/install-nodejs-agent
[4]: https://img.shields.io/npm/v/@monisagent/next.svg 
[5]: https://www.npmjs.com/package/@monisagent/next
[6]: https://codecov.io/gh/monisagent/monisagent-node-nextjs/branch/main/graph/badge.svg?token=UPO8LT1X4W 
[7]: https://codecov.io/gh/monisagent/monisagent-node-nextjs
