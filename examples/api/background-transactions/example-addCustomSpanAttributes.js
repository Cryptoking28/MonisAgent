/*
 * Copyright 2021 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const monisagent = require('monisagent') // eslint-disable-line node/no-extraneous-require

/*
`addCustomSpanAttributes` adds custom span attributes to an existing transaction.
It takes an `attributes` object as its sole parameter,
adding its keys and values as span attributes to the transaction.

Internally, the agent uses `addCustomSpanAttribute` to add these span attributes to the transaction.
Much like this:

```javascript
for (const [key, value] of Object.entries(attributes)) {
  monisagent.addCustomSpanAttribute(key, value)
}
```

In this example, we create a background transaction in order to modify it.
Once run, a transaction will be reported that has the span attribute `hello` with the value `world`.
*/

monisagent.startBackgroundTransaction('myCustomTransaction', function handle() {
  const transaction = monisagent.getTransaction()
  monisagent.addCustomSpanAttributes({ hello: 'world' })
  transaction.end()
})
