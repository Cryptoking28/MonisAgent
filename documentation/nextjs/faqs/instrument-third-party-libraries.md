# Instrument 3rd Party Libraries within Next.js 

Q: How can I get instrumentation to load for 3rd party libraries within my Next.js application like mysql, mongodb, pino, winston, etc?  

A: Typically the Monis Agent Node.js agent auto-instruments all supported [3rd party libraries](https://docs.monisagent.com/docs/apm/agents/nodejs-agent/getting-started/compatibility-requirements-nodejs-agent/#instrument).  Next.js, however, bundles your project and code spilts between server and client side via webpack.  To get auto-instrumentation to work, you must externalize all libraries within webpack.  

## Externalize 3rd party libraries in webpack

To externalize all supported 3rd party libraries, add the following to `next.config.js`:

```js
const nrExternals = require('monisagent/load-externals')

module.exports = {
  // In order for monisagent to effectively instrument a Next.js application,
  // the modules that monisagent supports should not be mangled by webpack. Thus,
  // we need to "externalize" all of the modules that monisagent supports.
  webpack: (config) => {
    nrExternals(config)
    return config
  }
}
```
