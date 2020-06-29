#! /bin/sh

# Copyright 2020 Monis Agent Corporation. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

rm -rf test/lib/cross_agent_tests
git clone git@source.datanerd.us:monisagent/cross_agent_tests.git test/lib/cross_agent_tests
rm -rf test/lib/cross_agent_tests/.git