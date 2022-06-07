[![Community Plus header](https://github.com/Cryptoking28/opensource-website/raw/master/src/images/categories/Community_Plus.png)](https://opensource.monisagent.com/oss-category/#community-plus)

# Monis Agent Next.js instrumentation [![Next.js Instrumentation CI][1]][2]

This is Monis Agent's official Next.js framework instrumentation for use with the Monis Agent [Node.js agent](https://github.com/Cryptoking28/monisagent).

This module is a dependency of the agent and is installed by default when you install the agent.

This module provides instrumentation for server-side rendering via [getServerSideProps](https://nextjs.org/docs/basic-features/data-fetching/get-server-side-props), [middleware](https://nextjs.org/docs/middleware), and Monis Agent transaction naming for both page and server requests. It does not provide any instrumentation for actions occurring during build or in client-side code.  If you want telemetry data on actions occurring on the client (browser), you can [inject the browser agent](./docs/inject-browser-agent.md).

Here are documents for more in-depth explanations about [transaction naming](./docs/transactions.md), [segments/spans](./docs/segments-and-spans.md), and [injecting the browser agent](./docs/inject-browser-agent.md).

**Note**: The minimum supported Next.js version is [12.0.9](https://github.com/vercel/next.js/releases/tag/v12.0.9).

## Installation

Typically, most users use the version auto-installed by the agent. You can see agent install instructions [here](https://github.com/Cryptoking28/monisagent#installation-and-getting-started).

In some cases, installing a specific version is ideal. For example, new features or major changes might be released via a major version update to this module, prior to inclusion in the main Monis Agent Node.js agent.

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

Our [API and developer documentation](http://monisagent.github.io/node-monisagent/docs/) for writing instrumentation will be of help. We particularly recommend the tutorials and various "shim" API documentation.

## Client-side Instrumentation

Next.js is a full stack React Framework. This module augments the Node.js Monis Agent agent, thus any client-side actions will not be instrumented. However, below is a method of adding the [Monis Agent Browser agent](https://docs.monisagent.com/docs/browser/browser-monitoring/getting-started/introduction-browser-monitoring/) to get more information on client-side actions.

```js
import Head from 'next/head'
import Layout, { siteTitle } from '../../components/layout'
import utilStyles from '../../styles/utils.module.css'
import Link from 'next/link'


export async function getServerSideProps() {
  // You must require agent and put it within this function
  // otherwise it will try to get bundled by webpack and cause errors.
  const monisagent = require('monisagent')
  const browserTimingHeader = monisagent.getBrowserTimingHeader()
  return {
    props: {
      browserTimingHeader
    }
  }
}

export default function Home({ browserTimingHeader }) {
  return (
    <Layout home>
      <Head>
        <title>{siteTitle}</title>
      </Head>
      <div dangerouslySetInnerHTML={{ __html: browserTimingHeader }} />
      <section className={utilStyles.headingMd}>
        <p>It me</p>
        <p>
          This page uses server-side rendering and uses the monisagent API to inject
          timing headers.
        </p>
        <div>
          <Link href="/">
            <a>← Back to home</a>
          </Link>
        </div>
      </section>
    </Layout>
  )
}
```

For static compiled pages, you can use the [copy-paste method](https://docs.monisagent.com/docs/browser/browser-monitoring/installation/install-browser-monitoring-agent/#copy-paste-app) for enabling the Monis Agent Browser agent.

For more information, please see the agent [compatibility and requirements][4].

### Error Handling

For capturing both the client and server side errors it is best to use `pages/_error.js` pattern recommended by Next.js documentation on [Advanced Error Page Customization](https://nextjs.org/docs/advanced-features/custom-error-page#more-advanced-error-page-customizing)

This pattern can be used to send either client, server or both types of errors to Monis Agent.

```js
function Error({ statusCode }) {
  return (
    <p>
      {statusCode
        ? `An error ${statusCode} occurred on server`
        : "An error occurred on client"}
    </p>
  );
}

Error.getInitialProps = ({ res, err }) => {
  if (typeof window === "undefined") {
    const monisagent = require('monisagent');
    monisagent.noticeError(err);
  } else {
    window.monisagent.noticeError(err);
  }

  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
```

The example above assumes that both the Monis Agent Browser and Node agents are integrated. `getInitialProps` function's `if` statement checks whether an error was thrown on the server side (`typeof window === "undefined"`) and if it was the case, it `requires` Monis Agent Node agent and sends an `err` with `noticeError` method. Otherwise it assumes the error was throw on the front-end side, and uses the browser agent to send the error to Monis Agent by using `window.monisagent.noticeError(err)`.

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

Monis Agent hosts and moderates an online forum where you can interact with Monis Agent employees as well as other customers to get help and share best practices. Like all official Monis Agent open source projects, there's a related community topic in the Monis Agent Explorers Hub. You can find this project's topic/threads here:

* [Monis Agent Documentation](https://docs.monisagent.com/docs/agents/nodejs-agent/getting-started/introduction-monis-agent-nodejs): Comprehensive guidance for using our platform
* [Monis Agent Community](https://discuss.monisagent.com/tags/c/telemetry-data-platform/agents/nodeagent): The best place to engage in troubleshooting questions
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
[4]: https://docs.monisagent.com/docs/agents/nodejs-agent/getting-started/compatibility-requirements-nodejs-agent
