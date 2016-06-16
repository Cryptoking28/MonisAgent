var monisagent = require('monisagent')

var transactionName = 'myCustomTransaction'

// related background transactions can be grouped in APM
// https://docs.monisagent.com/docs/apm/applications-menu/monitoring/transactions-page#txn-type-dropdown
var groupName = 'myTransactionGroup'

var invokeTransaction = monisagent.createBackgroundTransaction(transactionName, groupName,
    function() {
  // do some work
  monisagent.endTransaction()
})

// start the transaction
invokeTransaction()
