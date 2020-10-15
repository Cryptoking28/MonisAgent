[![Community Plus header](https://github.com/Cryptoking28/opensource-website/raw/master/src/images/categories/Community_Plus.png)](https://opensource.monisagent.com/oss-category/#community-plus)

# Monis Agent AWS SDK Instrumentation [![aws-sdk Instrumentation CI][1]][2]

Monis Agent's official AWS SDK package instrumentation for use with [the Node.js agent](https://github.com/Cryptoking28/monisagent). Provides instrumentation for the [AWS SDK (`aws-sdk`)](https://www.npmjs.com/package/aws-sdk) npm package.

## Installation

This package is [a dependency of the the Node Agent](https://github.com/Cryptoking28/monisagent/blob/2121ffdc5001ea1bf9ab473138b9446c1f2a7eef/package.json#L147), and the average user should not need to install it manually.

If you are not the average user, you can add this package to your project using your package manager of choice (`npm` below), and then `require` the module into your project.

```
$ npm install @monisagent/aws-sdk
```

```javascript
// index.js
require('@monisagent/aws-sdk')
```

## Getting Started

Our instrumentation automatically tracks all SDK calls as "external" activities. In addition, the following have more specific instrumentation to capture additional data store or queue information.

- Amazon DynamoDB
- Amazon Simple Notification Service (SNS)
- Amazon Simple Queue Service (SQS)

## Testing

This module includes a list of unit and functional tests.  To run these tests, use the following command

    $ npm run test

You may also run individual test suites with the following commands

    $ npm run unit
    $ npm run versioned

## Support

Should you need assistance with Monis Agent products, you are in good hands with several support channels.

If the issue has been confirmed as a bug or is a feature request, please file a GitHub issue.

**Support Channels**

* [Monis Agent and AWS](https://docs.monisagent.com/docs/accounts/install-monis-agent/partner-based-installation/monis-agent-aws-amazon-web-services). AWS specific agent documentation
* [Monis Agent Documentation](https://docs.monisagent.com/docs/agents/nodejs-agent/getting-started/introduction-monis-agent-nodejs): Comprehensive guidance for using our platform
* [Monis Agent Community](https://discuss.monisagent.com/c/support-products-agents/node-js-agent/): The best place to engage in troubleshooting questions
* [Monis Agent Developer](https://developer.monisagent.com/): Resources for building a custom observability applications
* [Monis Agent University](https://learn.monisagent.com/): A range of online training for Monis Agent users of every level
* [Monis Agent Technical Support](https://support.monisagent.com/) 24/7/365 ticketed support. Read more about our [Technical Support Offerings](https://docs.monisagent.com/docs/licenses/license-information/general-usage-licenses/support-plan).

## Privacy

At Monis Agent we take your privacy and the security of your information seriously, and are committed to protecting your information. We must emphasize the importance of not sharing personal data in public forums, and ask all users to scrub logs and diagnostic information for sensitive information, whether personal, proprietary, or otherwise.

We define "Personal Data" as any information relating to an identified or identifiable individual, including, for example, your name, phone number, post code or zip code, Device ID, IP address and email address.

Please review [Monis Agent’s General Data Privacy Notice](https://monisagent.com/termsandconditions/privacy) for more information.

## Roadmap
See our [roadmap](https://github.com/Cryptoking28/monisagent/blob/main/ROADMAP_Node.md), to learn more about our product vision, understand our plans, and provide us valuable feedback.

## Contribute

We encourage your contributions to improve Monis Agent's AWS SDK Instrumentation! Keep in mind when you submit your pull request, you'll need to sign the CLA via the click-through using CLA-Assistant. You only have to sign the CLA one time per project.

If you have any questions, or to execute our corporate CLA, required if your contribution is on behalf of a company, please drop us an email at opensource@monisagent.com.

**A note about vulnerabilities**

As noted in our [security policy](https://github.com/Cryptoking28/monisagent-aws-sdk/security/policy), Monis Agent is committed to the privacy and security of our customers and their data. We believe that providing coordinated disclosure by security researchers and engaging with the security community are important means to achieve our security goals.

If you believe you have found a security vulnerability in this project or any of Monis Agent's products or websites, we welcome and greatly appreciate you reporting it to Monis Agent through [HackerOne](https://hackerone.com/monisagent).

If you would like to contribute to this project, please review [these guidelines](https://github.com/Cryptoking28/monisagent-aws-sdk/blob/main/CONTRIBUTING.md).

To [all contributors](https://github.com/Cryptoking28/monisagent-aws-sdk/graphs/contributors), we thank you! Without your contribution, this project would not be what it is today. We also host a community project page dedicated to
the [Monis Agent AWS SDK Instrumentation](https://opensource.monisagent.com/monisagent/node-monisagent-aws-sdk) package.

## License
The Monis Agent AWS SDK Instrumentation package is licensed under the [Apache 2.0](http://apache.org/licenses/LICENSE-2.0.txt) License.

[1]: https://github.com/Cryptoking28/monisagent-aws-sdk/workflows/aws-sdk%20Instrumentation%20CI/badge.svg
[2]: https://github.com/Cryptoking28/monisagent-aws-sdk/actions?query=workflow%3A%22aws-sdk+Instrumentation+CI%22
