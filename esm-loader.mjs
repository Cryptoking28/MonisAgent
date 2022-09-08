/*
 * Copyright 2022 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import monisagent from './index.js'
import shimmer from './lib/shimmer.js'

/**
 * Hook chain responsible for resolving a file URL for a given module specifier
 *
 * Our loader has to be the last user-supplied loader if chaining is happening,
 * as we rely on `nextResolve` being the default Node.js resolve hook to get our URL
 *
 * Docs: https://nodejs.org/api/esm.html#resolvespecifier-context-nextresolve
 *
 * @param {string} specifier
 *        String identifier in an import statement or import() expression
 * @param {object} context
 *        Metadata about the specifier, including url of the parent module and any import assertions
 *        Optional argument that only needs to be passed when changed
 * @param {Function} nextResolve
 *        The Node.js default resolve hook
 * @returns {Promise} Promise object representing the resolution of a given specifier
 */
export async function resolve(specifier, context, nextResolve) {
  if (!monisagent.shim) {
    return nextResolve(specifier)
  }

  const instrumentationApi = monisagent.shim
  const logger = instrumentationApi.logger.child({ component: 'esm-loader' })

  const { url, format } = await nextResolve(specifier)
  const instrumentationName = shimmer.getInstrumentationNameFromModuleName(specifier)
  const instrumentationDefinition = shimmer.registeredInstrumentations[instrumentationName]

  if (instrumentationDefinition) {
    logger.debug(`Instrumentation exists for ${instrumentationName}`)

    if (format === 'commonjs') {
      // ES Modules translate import statements into fully qualified filepaths, so we create a copy of our instrumentation under this filepath
      const instrumentationDefinitionCopy = Object.assign({}, instrumentationDefinition)
      // TODO: do we really need to strip the prefix?
      instrumentationDefinitionCopy.moduleName = url.replace('file://', '')
      shimmer.registerInstrumentation(instrumentationDefinitionCopy)

      logger.debug(
        `Registered instrumentation for CommonJS ${instrumentationName} under ${instrumentationDefinitionCopy.moduleName}`
      )
    }

    logger.debug(`${instrumentationName} is not CommonJS, skipping for now`)
  }

  return { url, format }
}
