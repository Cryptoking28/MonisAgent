/*
 * Copyright 2022 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'
const logger = require('../logger').child({ component: 'code-level-metrics' })
const { isValidLength } = require('./byte-limit')
const symbols = require('../symbols')

/**
 * Uses function name if truthy
 * otherwise it defaults to (anonymous)
 *
 * @param {string} name name of function
 * @returns {string} function name or (anonymous)
 */
function setFunctionName(name) {
  return name || '(anonymous)'
}

/**
 * Helper used to assign Code Level Metrics(CLM)
 * to an active segment.
 *
 * spec states if function or filepath are > 255, do not assign
 * CLM attrs
 *
 * @param {Function} fn function reference
 * @param {TraceSegment} segment active segment to attach code.* attrs
 */
module.exports = function addCLMAttributes(fn, segment) {
  if (!fn[symbols.clm]) {
    return
  }

  try {
    const { funcInfo } = require('@contrast/fn-inspect')
    const { lineNumber, method, file: filePath, column } = funcInfo(fn)
    const fnName = setFunctionName(method)

    if (isValidLength(fnName, 255) && isValidLength(filePath, 255)) {
      segment.addAttribute('code.filepath', filePath)
      segment.addAttribute('code.function', fnName)
      segment.addAttribute('code.lineno', lineNumber + 1) // line numbers start at 0 in v8 so we have to add 1 to reflect js code
      segment.addAttribute('code.column', column)
    }
  } catch (err) {
    logger.infoOnce({ err }, 'Not using v8 function inspector, falling back to function name')
    const fnName = setFunctionName(fn.name)

    if (isValidLength(fnName, 255)) {
      segment.addAttribute('code.function', fnName)
    }
  }
}
