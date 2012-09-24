# Monis Agent Node.js agent

Make sure you have a Monis Agent account before starting. Until the end of the
beta, you'll want to have access to Pro features like slow transaction traces.
Contact your Monis Agent representative to see about getting a trial upgrade for
the purposes of testing.

## Getting started

1. [Install node](http://nodejs.org/#download). For now, at least 0.6 is
   required. Development work is being done against the latest released
   version.
2. Put this directory under the node_modules directory for the application
   you want to instrument.
3. Run `npm install` to pull down the agent's dependencies.
4. If you want to instrument multiple applications, unpack the distribution
   into a directory and run `npm link` from the root of the distribution.
   From then, to use the agent in your apps, just run
   `npm link monisagent_agent` from the root of the application to be
   instrumented (after running `npm install`).
5. Copy `monisagent.js` from the agent directory into the root directory of
   your application.
6. Edit `monisagent.js` and replace `license_key`'s value with the license key
   for your account.
7. Add `require('monisagent_agent');` as the first line of the app's main module.

When you start your app, the agent should start up with it and start reporting
data that will appear within our UI after a few minutes. Because the agent
minimizes the amount of bandwidth it consumes, it only reports metrics, errors
and transaction traces once a minute, so if you add the agent to tests that run
in under a minute, the agent won't have time to report data to Monis Agent. The
agent will write its log to a file named `monisagent_agent.log` in the
application directory. If the agent doesn't send data or crashes your app, the
log can help Monis Agent determine what went wrong, so be sure to send it along
with any bug reports or support requests.

## Running tests

The agent's unit tests use [mocha](http://visionmedia.github.com/mocha/). Its
integration tests use [node-tap](http://github.com/isaacs/node-tap/). If you
want to run them yourself, they can be run via `npm test`, except on Windows,
where we haven't had time to do much testing yet.

If you encounter any test failures, please contact Monis Agent support, and
be sure to include whatever information you can about how you're running
Node and what the test suite returned.

## Recent changes

Information about changes to the agent are in the [NEWS file](NEWS.md).

## Known issues & remaining work

Information about what's known to be broken and what's being worked on
soon is in the [TODO file](TODO.md).

## LICENSE

The Monis Agent Node.js agent is free-to-use, proprietary software. Please see
the [full license](LICENSE) for details.
