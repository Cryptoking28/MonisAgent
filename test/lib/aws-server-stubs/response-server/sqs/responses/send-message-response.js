/*
 * Copyright 2023 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

module.exports = (isJson) => {
  if (isJson) {
    return {
      MD5OfMessageBody: 'fafb00f5732ab283681e124bf8747ed1',
      MessageId: '5fea7756-0ea4-451a-a703-a558b933e274',
      ResponseMetadata: {
        RequestId: '27daac76-34dd-47df-bd01-1f6e873584a0'
      }
    }
  }
  return `
<SendMessageResponse>
  <SendMessageResult>
    <MD5OfMessageBody>fafb00f5732ab283681e124bf8747ed1</MD5OfMessageBody>
    <MessageId>5fea7756-0ea4-451a-a703-a558b933e274</MessageId>
  </SendMessageResult>
  <ResponseMetadata>
      <RequestId>27daac76-34dd-47df-bd01-1f6e873584a0</RequestId>
  </ResponseMetadata>
</SendMessageResponse>`
}
