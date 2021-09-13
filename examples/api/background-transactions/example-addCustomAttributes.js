/*
 * Copyright 2021 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const monisagent = require('monisagent') // eslint-disable-line node/no-extraneous-require

/*
`addCustomAttributes` adds custom attributes to an existing transaction.
It takes an `attributes` object as its sole parameter,
adding its keys and values as attributes to the transaction.

Internally, the agent uses `addCustomAttribute` to add these attributes to the transaction.
Much like this:

```javascript
for (const [key, value] of Object.entries(attributes)) {
  monisagent.addCustomAttribute(key, value)
}
```

In this example, we create a background transaction in order to modify it.
Once run, a transaction will be reported that has the attribute `hello` with the value `world`.
*/

monisagent.startBackgroundTransaction('myCustomTransaction', function handle() {
  const transaction = monisagent.getTransaction()
  monisagent.addCustomAttributes({ hello: 'world' })
  transaction.end()
})
