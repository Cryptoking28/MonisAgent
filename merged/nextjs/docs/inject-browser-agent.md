# Injecting Monis Agent Browser Agent

**Note**: You must [install the Monis Agent Browser agent](https://docs.monisagent.com/docs/browser/browser-monitoring/installation/install-browser-monitoring-agent/) in your account first before injecting it into a Next.js.

The process of setting up the browser agent on a Next.js requires a few lines of code.  Below is an example component that injects the Browser agent with a `getServerSideProps` call.

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

```

For static compiled pages, you can use the [copy-paste method](https://docs.monisagent.com/docs/browser/browser-monitoring/installation/install-browser-monitoring-agent/#copy-paste-app) for enabling the Monis Agent Browser agent.
