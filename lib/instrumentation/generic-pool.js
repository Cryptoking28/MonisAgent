/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

module.exports = function initialize(agent, generic, moduleName, shim) {
  if (!generic || !generic.Pool || !generic.Pool.prototype) {
    return false
  }

  const proto = generic.Pool.prototype
  shim.wrap(proto, 'acquire', function wrapAcquire(shim, acquire) {
    if (!shim.isFunction(acquire)) {
      return acquire
    }

    return function wrappedAcquire(callback, priority) {
      return acquire.call(this, shim.bindSegment(callback), priority)
    }
  })

  shim.wrap(proto, ['drain', 'destroyAllNow'], function wrap(shim, original) {
    if (!shim.isFunction(original)) {
      return original
    }

    return function wrappedMethod(cb) {
      return original.call(this, shim.bindSegment(cb))
    }
  })
}
