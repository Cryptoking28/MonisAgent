var monisagent = require('monisagent')

var transactionName = 'myCustomTransaction'

var invokeTransaction = monisagent.createBackgroundTransaction(transactionName,
    function(a, b) {

  // do something with 'a' and 'b'

  monisagent.endTransaction()
})

// arguments are passed in to the transaction function given to
// createBackgroundTransaction
invokeTransaction(1, 2)

// start another transaction with different arguments
invokeTransaction(3, 4)
