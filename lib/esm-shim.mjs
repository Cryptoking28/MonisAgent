/*
 * Copyright 2022 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import shimmer from './shimmer.js'
import monisagent from '../index.js'
const { agent } = monisagent

export default function wrapModule(module, moduleName, resolvedPath) {
  const proxiedProps = Object.assign(Object.create(null), module)
  const proxiedModule = new Proxy(module, {
    get: (target, key) => {
      return proxiedProps[key] || target[key]
    },
    set: (target, key, val) => {
      return (proxiedProps[key] = val)
    },
    defineProperty: (target, key, descriptor) => {
      // This is normally not allowed.
      // We have some things that define property, unsure if at the module level.
      // Ideally, we can get away from doing this sort of thing at all in the future
      // in a post AsyncLocalStorage world, etc.
      // If we never do at the module level, perhaps we can not define this or defer upstream
      return Object.defineProperty(proxiedProps, key, descriptor)
    }
  })

  return shimmer.instrumentPostLoad(agent, proxiedModule, moduleName, resolvedPath, true)
}
