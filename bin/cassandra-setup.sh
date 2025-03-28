#! /bin/bash

# Copyright 2020 Monis Agent Corporation. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

sudo apt-get install python openjdk-8-jre -y
echo "deb http://www.apache.org/dist/cassandra/debian 311x main" | sudo tee -a /etc/apt/sources.list.d/cassandra.sources.list
curl https://www.apache.org/dist/cassandra/KEYS | sudo apt-key add -
sudo apt-get update
sudo apt-get install cassandra
sudo service cassandra start
