/*
 * Copyright 2023 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'
const LlmEvent = require('./event')

module.exports = class LlmChatCompletionSummary extends LlmEvent {
  constructor({ agent, segment, request = {}, response = {}, withError = false, transaction }) {
    super({ agent, segment, request, response, responseAttrs: true, transaction })
    this.error = withError
    this['request.max_tokens'] = request.max_tokens
    this['request.temperature'] = request.temperature
    this['response.number_of_messages'] = request?.messages?.length + response?.choices?.length
    this['response.choices.finish_reason'] = response?.choices?.[0]?.finish_reason
  }
}
