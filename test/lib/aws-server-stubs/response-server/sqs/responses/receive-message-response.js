/*
 * Copyright 2023 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

module.exports = (isJson) => {
  if (isJson) {
    return {
      Messages: [
        {
          MessageId: '5fea7756-0ea4-451a-a703-a558b933e274',
          ReceiptHandle:
            'MbZj6wDWliJvwwJaBV3dcjk2YW2vA3STFFljTM8tJJg6HRG6PYSasuWXPJBCwLj1FjgXUv1uSj1gUPAWV66FU/WeR4mq2OKpEGYWbnLmpRCJVAyeMjeU5ZBdtcQQEauMZc8ZRv37sIW2iJKq3M9MFx1YvV11A2x/KSbkJ0=',
          MD5OfBody: 'fafb00f5732ab283681e124bf8747ed1',
          Body: 'This is a test message',
          Attributes: {
            SenderId: '195004372649',
            SentTimestamp: '1238099229000',
            ApproximateReceiveCount: '2',
            ApproximateFirstReceiveTimestamp: '1595887234772'
          }
        }
      ],
      ResponseMetadata: {
        RequestId: 'b6633655-283d-45b4-aee4-4e84e0ae6afa'
      }
    }
  }
  return `
<ReceiveMessageResponse>
  <ReceiveMessageResult>
    <Message>
      <MessageId>5fea7756-0ea4-451a-a703-a558b933e274</MessageId>
      <ReceiptHandle>
        MbZj6wDWliJvwwJaBV3dcjk2YW2vA3STFFljTM8tJJg6HRG6PYSasuWXPJBCw
        Lj1FjgXUv1uSj1gUPAWV66FU/WeR4mq2OKpEGYWbnLmpRCJVAyeMjeU5ZBdtcQQE
        auMZc8ZRv37sIW2iJKq3M9MFx1YvV11A2x/KSbkJ0=
      </ReceiptHandle>
      <MD5OfBody>fafb00f5732ab283681e124bf8747ed1</MD5OfBody>
      <Body>This is a test message</Body>
      <Attribute>
        <Name>SenderId</Name>
        <Value>195004372649</Value>
      </Attribute>
      <Attribute>
        <Name>SentTimestamp</Name>
        <Value>1238099229000</Value>
      </Attribute>
      <Attribute>
        <Name>ApproximateReceiveCount</Name>
        <Value>2</Value>
      </Attribute>
      <Attribute>
        <Name>ApproximateFirstReceiveTimestamp</Name>
        <Value>1595887234772</Value>
      </Attribute>
    </Message>
  </ReceiveMessageResult>
  <ResponseMetadata>
    <RequestId>b6633655-283d-45b4-aee4-4e84e0ae6afa</RequestId>
  </ResponseMetadata>
</ReceiveMessageResponse>`
}
