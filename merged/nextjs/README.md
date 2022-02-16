[![Community Plus header](https://github.com/Cryptoking28//raw/master/src/images/categories/Community_Plus.png)](https://opensource.monisagent.com/oss-category/#community-plus)

# Monis Agent Next.js Instrumentation [![Next.js Instrumentation CI][1]][2]

Monis Agent's official Next.js framework instrumentation for use with the Monis Agent [Node.js agent](https://github.com/Cryptoking28/monisagent).

This module is a dependency of the agent and is installed by default when you install the agent.

This module provides instrumentation for Server-Side Rendering via [getServerSideProps](https://nextjs.org/docs/basic-features/data-fetching/get-server-side-props), [Middleware](https://nextjs.org/docs/middleware), and Monis Agent Transaction naming for both page and server requests.

## Installation

Typically, most users use the version auto-installed by the agent. You can see agent install instructions [here](https://github.com/Cryptoking28/monisagent#installation-and-getting-started).

In some cases, installing a specific version is ideal. For example, new features or major changes might be released via a major version update to this module, prior to inclusion in the main Monis Agent Node.js Agent.

```
npm install @monisagent/next
```

```js
node -r @monisagent/next your-program.js
```

If you cannot control how your program is run, you can load the `@monisagent/next` module before any other module in your program.

```js
require('@monisagent/next')

/* ... the rest of your program ... */
```

For more information, please see the agent [installation guide][3].

## Getting Started

Our [API and developer documentation](http://monisagent.github.io/node-monisagent/docs/) for writing instrumentation will be of help. We particularly recommend the tutorials and various "shim" API documentation.

## Usage

Next.js is a full stack React Framework.  This module augments the Node.js Monis Agent agent, thus any client side actions will not be instrumented.

```js
How to inject browser snippet will go here
```

For more information, please see the agent [compatibility and requirements][4].

## Testing

The module includes a suite of unit and functional tests which should be used to
verify that your changes don't break existing functionality.

All tests are stored in `tests/` and are written using
[Tap](https://www.npmjs.com/package/tap) with the extension `.test.js`(unit), or `.tap.js`(versioned).

To run the full suite, run: `npm test`.

Individual test scripts include:

```
npm run unit
npm run versioned
```

## Support

Monis Agent hosts and moderates an online forum where customers can interact with Monis Agent employees as well as other customers to get help and share best practices. Like all official Monis Agent open source projects, there's a related Community topic in the Monis Agent Explorers Hub. You can find this project's topic/threads here:

**Support Channels**

* [Monis Agent Documentation](https://docs.monisagent.com/docs/agents/nodejs-agent/getting-started/introduction-monis-agent-nodejs): Comprehensive guidance for using our platform
* [Monis Agent Community](https://discuss.monisagent.com/tags/c/telemetry-data-platform/agents/nodeagent): The best place to engage in troubleshooting questions
* [Monis Agent Developer](https://developer.monisagent.com/): Resources for building a custom observability applications
* [Monis Agent University](https://learn.monisagent.com/): A range of online training for Monis Agent users of every level
* [Monis Agent Technical Support](https://support.monisagent.com/) 24/7/365 ticketed support. Read more about our [Technical Support Offerings](https://docs.monisagent.com/docs/licenses/license-information/general-usage-licenses/support-plan).

## Contribute

We encourage your contributions to improve Next.js instrumentation module! Keep in mind that when you submit your pull request, you'll need to sign the CLA via the click-through using CLA-Assistant. You only have to sign the CLA one time per project.

If you have any questions, or to execute our corporate CLA (which is required if your contribution is on behalf of a company), drop us an email at opensource@monisagent.com.

**A note about vulnerabilities**

As noted in our [security policy](../../security/policy), Monis Agent is committed to the privacy and security of our customers and their data. We believe that providing coordinated disclosure by security researchers and engaging with the security community are important means to achieve our security goals.

If you believe you have found a security vulnerability in this project or any of Monis Agent's products or websites, we welcome and greatly appreciate you reporting it to Monis Agent through [HackerOne](https://hackerone.com/monisagent).

If you would like to contribute to this project, review [these guidelines](./CONTRIBUTING.md).

To all contributors, we thank you!  Without your contribution, this project would not be what it is today.  We also host a community project page dedicated to [Project Name](<LINK TO https://opensource.monisagent.com/projects/... PAGE>).

## License
Monis Agent Next.js instrumentation is licensed under the [Apache 2.0](http://apache.org/licenses/LICENSE-2.0.txt) License.
Monis Agent Next.js instrumentation also uses source code from third-party libraries. Full details on which libraries are used and the terms under which they are licensed can be found in the third-party notices document.

[1]: https://github.com/Cryptoking28/monisagent-node-nextjs/workflows/Next.js%20Instrumentation%20CI/badge.svg
[2]: https://github.com/Cryptoking28/monisagent-nextjs/actions
[3]: https://docs.monisagent.com/docs/agents/nodejs-agent/installation-configuration/install-nodejs-agent
[4]: https://docs.monisagent.com/docs/agents/nodejs-agent/getting-started/compatibility-requirements-nodejs-agent

