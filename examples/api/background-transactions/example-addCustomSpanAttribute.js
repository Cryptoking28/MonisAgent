/*
 * Copyright 2021 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const monisagent = require('monisagent') // eslint-disable-line node/no-extraneous-require

/*
`addCustomSpanAttribute` adds a custom span attribute to an existing transaction.
It takes `name` and `value` parameters, adding them to the span reported to Monis Agent.

In this example, we create a background transaction in order to modify it.
Once run, a transaction will be reported that has the span attribute `hello` with the value `world`.
*/

monisagent.startBackgroundTransaction('myCustomTransaction', function handle() {
  const transaction = monisagent.getTransaction()
  monisagent.addCustomSpanAttribute('hello', 'world')
  transaction.end()
})
