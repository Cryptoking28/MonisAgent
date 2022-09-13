/*
 * Copyright 2022 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import monisagent from './index.js'
import shimmer from './lib/shimmer.js'
import loggingModule from './lib/logger.js'
import NAMES from './lib/metrics/names.js'
import semver from 'semver'

const isSupportedVersion = () => semver.gte(process.version, 'v16.12.0')
const logger = loggingModule.child({ component: 'esm-loader' })

if (monisagent.agent) {
  monisagent.agent.metrics
    .getOrCreateMetric(`${NAMES.SUPPORTABILITY.FEATURES}/ESModuleLoader`)
    .incrementCallCount()
}

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
  if (!monisagent.agent || !isSupportedVersion()) {
    return nextResolve(specifier, context, nextResolve)
  }

  /**
   * We manually call the default Node.js resolve hook so
   * that we can get the fully qualified URL path and the
   * package type (commonjs/module/builtin) without
   * duplicating the logic of the Node.js hook
   */
  const resolvedModule = await nextResolve(specifier, context, nextResolve)
  const instrumentationName = shimmer.getInstrumentationNameFromModuleName(specifier)
  const instrumentationDefinition = shimmer.registeredInstrumentations[instrumentationName]

  if (instrumentationDefinition) {
    logger.debug(`Instrumentation exists for ${specifier}`)

    if (resolvedModule.format === 'commonjs') {
      // ES Modules translate import statements into fully qualified filepaths, so we create a copy of our instrumentation under this filepath
      const instrumentationDefinitionCopy = Object.assign({}, instrumentationDefinition)

      // Stripping the prefix is necessary because the code downstream gets this url without it
      instrumentationDefinitionCopy.moduleName = resolvedModule.url.replace('file://', '')

      // Added to keep our Supportability metrics from exploding/including customer info via full filepath
      instrumentationDefinitionCopy.friendlyModuleName = specifier

      shimmer.registerInstrumentation(instrumentationDefinitionCopy)

      logger.debug(
        `Registered CommonJS instrumentation for ${specifier} under ${instrumentationDefinitionCopy.moduleName}`
      )
    } else {
      logger.debug(`${specifier} is not a CommonJS module, skipping for now`)
    }
  }

  return resolvedModule
}
