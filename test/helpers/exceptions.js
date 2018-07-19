'use strict'

var monisagent = require('../../index')

var commands = {
  uncaughtException: function() {
    throw new Error('nothing can keep me down')
  },

  caughtUncaughtException: function(code) {
    // register a uncaughtException handler of our own
    process.once('uncaughtException', function(e) {
      process.send(e.message)
    })

    process.nextTick(function() {
      throw new Error(code)
    })
  },

  domainUncaughtException: function(message) {
    var domain = require('domain')
    var d = domain.create()

    d.on('error', sendErrors)

    d.run(function() {
      setTimeout(function() {
        throw new Error(message)
      }, 10)
    })
  },

  checkAgent: function(err) {
    process.once('uncaughtException', function() {
      setTimeout(sendErrors, 15)
    })

    process.nextTick(function() {
      throw new Error(err)
    })
  },

  setUncaughtExceptionCallback: () => {
    process.setUncaughtExceptionCaptureCallback(() => {
      setTimeout(sendErrors, 15)
    })

    commands.uncaughtException()
  },

  unsetUncaughtExceptionCallback: () => {
    process.setUncaughtExceptionCaptureCallback(() => {
      setTimeout(sendErrors, 15)
    })
    process.once('uncaughtException', function() {
      setTimeout(sendErrors, 15)
    })
    process.setUncaughtExceptionCaptureCallback(null)

    commands.uncaughtException()
  }
}

function sendErrors() {
  process.send({
    count: monisagent.agent.errors.errorCount,
    messages: monisagent.agent.errors.errors.map(function(e) { return e[2] })
  })
}

process.on('message', function(msg) {
  commands[msg.name](msg.args)
})
