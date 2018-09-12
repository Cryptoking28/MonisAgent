[![Coverage Status][1]][2]

Monis Agent's official Koa framework instrumentation for use with the
[Node agent](https://github.com/Cryptoking28/monisagent). This module is a
dependency of the agent and is installed with it by running:

```
npm install monisagent
```

Alternatively, it can be installed and loaded independently based on specific
versioning needs:

```
npm install @monisagent/koa
```
```js
// index.js
require('@monisagent/koa')
```

### Supported routing modules

- `koa-router`
- `koa-route`

For more information, please see the agent [installation guide][3], and
[compatibility and requirements][4].

[1]: https://coveralls.io/repos/github/monisagent/node-monisagent-koa/badge.svg?branch=master
[2]: https://coveralls.io/github/monisagent/node-monisagent-koa?branch=master
[3]: https://docs.monisagent.com/docs/agents/nodejs-agent/installation-configuration/install-nodejs-agent
[4]: https://docs.monisagent.com/docs/agents/nodejs-agent/getting-started/compatibility-requirements-nodejs-agent
