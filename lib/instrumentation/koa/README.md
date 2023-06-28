<a href="https://opensource.monisagent.com/oss-category/#community-plus"><picture><source media="(prefers-color-scheme: dark)" srcset="https://github.com/Cryptoking28/opensource-website/raw/main/src/images/categories/dark/Community_Plus.png"><source media="(prefers-color-scheme: light)" srcset="https://github.com/Cryptoking28/opensource-website/raw/main/src/images/categories/Community_Plus.png"><img alt="Monis Agent Open Source community plus project banner." src="https://github.com/Cryptoking28/opensource-website/raw/main/src/images/categories/Community_Plus.png"></picture></a>

# Monis Agent Koa instrumentation

[![npm status badge][5]][6] [![koa instrumentation CI][1]][2] [![codecov][7]][8]

Monis Agent's official Koa framework instrumentation for use with the
Monis Agent [Node.js agent](https://github.com/Cryptoking28/monisagent).

This module is a dependency of the agent and is installed by default when you install the agent.

## Installation

This package is [a dependency of the the Node Agent](https://github.com/Cryptoking28/monisagent/blob/main/package.json#L189), and the average user should not need to install it manually.

For more information, please see the agent [installation guide][3].

## Getting Started

Our [API and developer documentation](http://monisagent.github.io/node-monisagent/) for writing instrumentation will be of help. We particularly recommend the tutorials and various "shim" API documentation.

## Usage

In addition to the Koa framework, we support additional specific routing modules.

### Supported Routing Modules

- @koa/router
- koa-router
- koa-route

For more information, please see the agent [compatibility and requirements][4].

## Testing

The module includes a suite of unit and functional tests which should be used to
verify that your changes don't break existing functionality.

All tests are stored in `tests/` and are written using
[Tap](https://www.npmjs.com/package/tap) with the extension `.tap.js`.

To run the full suite, run: `npm test`.

Individual test scripts include:

```
npm run unit
npm run versioned
```

## Support

Should you need assistance with Monis Agent products, you are in good hands with several support channels.

If the issue has been confirmed as a bug or is a feature request, please file a GitHub issue.

**Support Channels**

* [Monis Agent Documentation](https://docs.monisagent.com/docs/agents/nodejs-agent/getting-started/introduction-monis-agent-nodejs): Comprehensive guidance for using our platform
* [Monis Agent Community](https://forum.monisagent.com/): The best place to engage in troubleshooting questions
* [Monis Agent Developer](https://developer.monisagent.com/): Resources for building a custom observability applications
* [Monis Agent University](https://learn.monisagent.com/): A range of online training for Monis Agent users of every level
* [Monis Agent Technical Support](https://support.monisagent.com/) 24/7/365 ticketed support. Read more about our [Technical Support Offerings](https://docs.monisagent.com/docs/licenses/license-information/general-usage-licenses/support-plan).

## Privacy
At Monis Agent we take your privacy and the security of your information seriously, and are committed to protecting your information. We must emphasize the importance of not sharing personal data in public forums, and ask all users to scrub logs and diagnostic information for sensitive information, whether personal, proprietary, or otherwise.

We define “Personal Data” as any information relating to an identified or identifiable individual, including, for example, your name, phone number, post code or zip code, Device ID, IP address and email address.

For more information, review [Monis Agent’s General Data Privacy Notice](https://monisagent.com/termsandconditions/privacy).

## Contribute

We encourage your contributions to improve the koa instrumentation module! Keep in mind when you submit your pull request, you'll need to sign the CLA via the click-through using CLA-Assistant. You only have to sign the CLA one time per project.

If you have any questions, or to execute our corporate CLA, required if your contribution is on behalf of a company,  please drop us an email at opensource@monisagent.com.

**A note about vulnerabilities**

As noted in our [security policy](https://github.com/Cryptoking28/monisagent-koa/security/policy), Monis Agent is committed to the privacy and security of our customers and their data. We believe that providing coordinated disclosure by security researchers and engaging with the security community are important means to achieve our security goals.

If you believe you have found a security vulnerability in this project or any of Monis Agent's products or websites, we welcome and greatly appreciate you reporting it to Monis Agent through [HackerOne](https://hackerone.com/monisagent).

If you would like to contribute to this project, review [these guidelines](./CONTRIBUTING.md).

To [all contributors](https://github.com/Cryptoking28/monisagent-koa/graphs/contributors), we thank you!  Without your contribution, this project would not be what it is today.  We also host a community project page dedicated to [Monis Agent Koa (Node)](https://opensource.monisagent.com/projects/monisagent/node-monisagent-koa).

## License
Monis Agent Koa instrumentation is licensed under the [Apache 2.0](http://apache.org/licenses/LICENSE-2.0.txt) License.

Monis Agent Koa instrumentation also uses source code from third-party libraries. You can find full details on which libraries are used and the terms under which they are licensed in the third-party notices document.

[1]: https://github.com/Cryptoking28/monisagent-koa/workflows/koa%20Instrumentation%20CI/badge.svg
[2]: https://github.com/Cryptoking28/monisagent-koa/actions
[3]: https://docs.monisagent.com/docs/agents/nodejs-agent/installation-configuration/install-nodejs-agent
[4]: https://docs.monisagent.com/docs/agents/nodejs-agent/getting-started/compatibility-requirements-nodejs-agent
[5]: https://img.shields.io/npm/v/@monisagent/koa.svg
[6]: https://www.npmjs.com/package/@monisagent/koa
[7]: https://codecov.io/gh/monisagent/node-monisagent-koa/branch/main/graph/badge.svg
[8]: https://codecov.io/gh/monisagent/node-monisagent-koa
