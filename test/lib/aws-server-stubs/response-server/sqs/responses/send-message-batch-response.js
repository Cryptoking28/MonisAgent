/*
 * Copyright 2023 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

module.exports = (isJson) => {
  if (isJson) {
    return {
      Failed: [],
      Successful: [
        {
          Id: 'ONE',
          MessageId: '0a5231c7-8bff-4955-be2e-8dc7c50a25fa',
          MD5OfMessageBody: '8b2f30468657cfc118bbbebb6ad52b5a'
        },
        {
          Id: 'TWO',
          MessageId: '15ee1ed3-87e7-40c1-bdaa-2e49968ea7e9',
          MD5OfMessageBody: '446e666e0c0a8695b7a9693c082bc5da'
        }
      ],
      ResponseMetadata: {
        RequestId: 'ca1ad5d0-8271-408b-8d0f-1351bf547e74'
      }
    }
  }
  return `
<SendMessageBatchResponse>
  <SendMessageBatchResult>
    <SendMessageBatchResultEntry>
        <Id>ONE</Id>
        <MessageId>0a5231c7-8bff-4955-be2e-8dc7c50a25fa</MessageId>
        <MD5OfMessageBody>8b2f30468657cfc118bbbebb6ad52b5a</MD5OfMessageBody>
    </SendMessageBatchResultEntry>
    <SendMessageBatchResultEntry>
        <Id>TWO</Id>
        <MessageId>15ee1ed3-87e7-40c1-bdaa-2e49968ea7e9</MessageId>
        <MD5OfMessageBody>446e666e0c0a8695b7a9693c082bc5da</MD5OfMessageBody>
    </SendMessageBatchResultEntry>
  </SendMessageBatchResult>
  <ResponseMetadata>
    <RequestId>ca1ad5d0-8271-408b-8d0f-1351bf547e74</RequestId>
  </ResponseMetadata>
</SendMessageBatchResponse>`
}
