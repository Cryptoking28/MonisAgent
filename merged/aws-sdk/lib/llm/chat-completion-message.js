/*
 * Copyright 2023 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const LlmEvent = require('./event')

/**
 * @typedef {object} LlmChatCompletionParams
 * @augments LlmEventParams
 * @property {string} completionId An identifier for the completion message.
 * @property {string} content The human readable response from the LLM.
 * @property {number} [index=0] The order of the message in the conversation.
 * @property {boolean} [isResponse=false] Indicates if the message represents
 * a response from the LLM.
 * @property {object} message The message sent to the LLM.
 * @property {OutgoingMessage} request The outgoing HTTP request used in the
 * LLM conversation.
 */
/**
 * @type {LlmChatCompletionParams}
 */
const defaultParams = {
  completionId: '',
  content: '',
  index: 0,
  isResponse: false,
  message: {},
  request: {}
}

/**
 * Represents an LLM chat completion.
 */
class LlmChatCompletionMessage extends LlmEvent {
  constructor(params = defaultParams) {
    params = Object.assign({}, defaultParams, params)
    super(params)

    const { agent, content, isResponse, index, completionId } = params
    const recordContent = agent.config?.ai_monitoring?.record_content?.enabled
    const tokenCB = agent?.llm?.tokenCountCallback

    this.is_response = isResponse
    this.completion_id = completionId
    this.sequence = index
    this.content = recordContent === true ? content : undefined
    this.role = ''

    this.#setId(index)
    if (this.is_response === true) {
      this.role = 'assistant'
      this.token_count = this.bedrockResponse.outputTokenCount
      if (this.token_count === undefined && typeof tokenCB === 'function') {
        this.token_count = tokenCB(this.bedrockCommand.modelId, content)
      }
    } else {
      this.role = 'user'
      this.content = recordContent === true ? this.bedrockCommand.prompt : undefined
      this.token_count = this.bedrockResponse.inputTokenCount
      if (this.token_count === undefined && typeof tokenCB === 'function') {
        this.token_count = tokenCB(this.bedrockCommand.modelId, this.bedrockCommand.prompt)
      }
    }
  }

  #setId(index) {
    const cmd = this.bedrockCommand
    if (cmd.isTitan() === true || cmd.isClaude() === true) {
      this.id = `${this.id}-${index}`
    } else if (cmd.isAi21() === true || cmd.isCohere() === true) {
      this.id = `${this.bedrockResponse.id || this.id}-${index}`
    }
  }
}

module.exports = LlmChatCompletionMessage
