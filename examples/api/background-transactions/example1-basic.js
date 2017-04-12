var monisagent = require('monisagent')

var transactionName = 'myCustomTransaction'

// createBackgroundTransaction() returns a function that needs to be invoked
// to start the transaction.  The third argument is a function that represents the
// work inside the transaction.  The endTransaction() API method must be called at some
// point in this function in order to end the transaction.
var invokeTransaction = monisagent.createBackgroundTransaction(transactionName,
    function() {

  doSomeWork(function(error) {
    monisagent.endTransaction()
  })
})

// start the transaction
invokeTransaction()


// function to simulate async work
function doSomeWork(callback) {
  setTimeout(function() {
    callback()
  }, 500)
}
