'use strict'

var monisagent = require('../../index')

var commands = {
  uncaughtException: function() {
    throw new Error('nothing can keep me down')
  },

  caughtUncaughtException: function(code) {
    // register a uncaughtException handler of our own
    process.once('uncaughtException', function (e) {
      process.send(e.message)
    })

    process.nextTick(function (){
      throw new Error(code)
    })
  },

  checkAgent: function(err) {
    process.once('uncaughtException', function (e) {
      setTimeout(function () {
        process.send({
          count: monisagent.agent.errors.errorCount,
          messages: monisagent.agent.errors.errors.map(function (e) { return e[2] })
        })
      }, 15)
    })

    process.nextTick(function (){
      throw new Error(err)
    })
  }
}

process.on('message', function (msg) {
  commands[msg.name](msg.args)
})
