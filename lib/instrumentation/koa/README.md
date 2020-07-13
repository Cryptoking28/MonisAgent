[![Community Project header](https://github.com/Cryptoking28/opensource-website/raw/master/src/images/categories/Community_Project.png)](https://opensource.monisagent.com/oss-category/#community-project)

# Monis Agent Koa Instrumentation [![koa Instrumentation CI][1]][2]

Monis Agent's official Koa framework instrumentation for use with the
Monis Agent [Node.js Agent](https://github.com/Cryptoking28/monisagent).

This module is a dependency of the agent and will be installed by default upon installing the agent.

## Installation and Getting Started

Typically, most users will use the version auto-installed by the agent. You can see agent install instructions [here](https://github.com/Cryptoking28/monisagent#installation-and-getting-started).

In some cases, installing a specific version may be ideal. For example: new features or major changes may be released via major version update to this module, prior to inclusion in the main Monis Agent Node.js Agent.

```
npm install @monisagent/koa
```

```js
// index.js
require('@monisagent/koa')
```

For more information, please see the agent [installation guide][3].

Our [API and developer documentation](http://monisagent.github.io/node-monisagent/docs/) for writing instrumentation will be of help. We particularly recommend the tutorials and various "shim" API documentation.

## Usage

In addition to the Koa framework, we support additional specific routing modules.

### Supported Routing Modules

- koa-router
- koa-route

For more information, please see the agent [compatibility and requirements][4].

## Testing

The module includes a suite of unit and functional tests which should be used to
verify your changes don't break existing functionality.

All tests are stored in `tests/` and are written using
[Tap](https://www.npmjs.com/package/tap) with the extension `.tap.js`.

To run the full suite, run: `npm test`.

Individual test scripts include:

```
npm run unit
npm run versioned
```

## Support

Monis Agent hosts and moderates an online forum where customers can interact with Monis Agent employees as well as other customers to get help and share best practices. Like all official Monis Agent open source projects, there's a related Community topic in the Monis Agent Explorers Hub. You can find this project's topic/threads here: https://discuss.monisagent.com/c/support-products-agents/node-js-agent/.

## Contributing
We encourage your contributions to improve Monis Agent Koa Instrumentation! Keep in mind when you submit your pull request, you'll need to sign the CLA via the click-through using CLA-Assistant. You only have to sign the CLA one time per project.

If you have any questions, or to execute our corporate CLA, required if your contribution is on behalf of a company,  please drop us an email at opensource@monisagent.com.

## License
Monis Agent Koa Instrumentation is licensed under the [Apache 2.0](http://apache.org/licenses/LICENSE-2.0.txt) License.

Monis Agent Koa Instrumentation also uses source code from third-party libraries. You can find full details on which libraries are used and the terms under which they are licensed in the third-party notices document.

[1]: https://github.com/Cryptoking28/monisagent-koa/workflows/koa%20Instrumentation%20CI/badge.svg
[2]: https://github.com/Cryptoking28/monisagent-koa/actions
[3]: https://docs.monisagent.com/docs/agents/nodejs-agent/installation-configuration/install-nodejs-agent
[4]: https://docs.monisagent.com/docs/agents/nodejs-agent/getting-started/compatibility-requirements-nodejs-agent
