#! /bin/bash

# Copyright 2020 Monis Agent Corporation. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

set -x

VERSIONED_MODE="${VERSIONED_MODE:---minor}"
SAMPLES="${SAMPLES:-10}"
set -f
directories=()
if [[ "$1" != '' ]];
then
  directories=(
    "test/versioned/${1}"
    "test/versioned-external/TEMP_TESTS/${1}"
    "test/versioned-external/TEMP_TESTS/${1}/tests/versioned"
  )
else
  directories=(
    "test/versioned/"
    "test/versioned-external"
  )
fi

export AGENT_PATH=`pwd`

# Runner will default to CPU count if not specified.
echo "JOBS = ${JOBS}"
echo "NPM7 = ${NPM7}"

if [[ "${NPM7}" = 1 ]];
then
  time ./node_modules/.bin/versioned-tests $VERSIONED_MODE -i 2 --all --strict --samples $SAMPLES --jobs $JOBS ${directories[@]}
else
  time ./node_modules/.bin/versioned-tests $VERSIONED_MODE -i 2 --strict --samples $SAMPLES --jobs $JOBS ${directories[@]}
fi
