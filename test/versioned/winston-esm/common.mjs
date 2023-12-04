/*
 * Copyright 2023 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import Transport from 'winston-transport'
export class Sink extends Transport {
  loggedLines = []
  log(data, done) {
    this.loggedLines.push(data)
    done()
  }
}
