#! /bin/sh

# Copyright 2020 Monis Agent Corporation. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

SSLKEY="test/lib/test-key.key"
CACERT="test/lib/ca-certificate.crt"
CAINDEX="test/lib/ca-index"
CASERIAL="test/lib/ca-serial"
CERTIFICATE="test/lib/self-signed-test-certificate.crt"

find . -depth -type d -name node_modules -print0 | xargs -0 rm -rf
find . -name monisagent_agent.log -print0 | xargs -0 rm -rf
rm -rf npm-debug.log monisagent_agent.log .coverage_data cover_html
rm -rf $SSLKEY $CACERT $CAINDEX $CASERIAL $CERTIFICATE
rm -rf test/lib/*.old test/lib/*.attr
rm -rf docs/