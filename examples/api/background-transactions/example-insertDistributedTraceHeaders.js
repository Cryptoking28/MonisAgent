/*
 * Copyright 2021 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const monisagent = require('monisagent') // eslint-disable-line node/no-extraneous-require

/*
For context on how to use this call and its partner call insertDistributedTraceHeaders, first read Enable distributed tracing with agent APIs:

https://docs.monisagent.com/docs/distributed-tracing/enable-configure/language-agents-enable-distributed-tracing/

`transactionHandle.insertDistributedTraceHeaders` is used to implement distributed tracing. It modifies the headers map that is passed in by adding W3C Trace Context headers and Monis Agent Distributed Trace headers. The Monis Agent headers can be disabled with `distributed_tracing.exclude_monisagent_header: true` in the config. This method replaces the deprecated createDistributedTracePayload method, which only creates Monis Agent Distributed Trace payloads.
*/

// example, mocked request.
// insertDistributedTraceHeaders modifies `req.headers`,
// adding trace headers for observability reporting
const req = { headers: {} }

monisagent.startBackgroundTransaction('myCustomTransaction', function handle() {
  const transaction = monisagent.getTransaction()
  transaction.insertDistributedTraceHeaders(req.headers)
  transaction.end()
})
