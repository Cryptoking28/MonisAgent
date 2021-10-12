/*
 * Copyright 2021 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'
const Github = require('./github')
const { App } = require('@slack/bolt')
const requiredEnvVars = ['GITHUB_TOKEN', 'SLACK_CHANNEL', 'SLACK_TOKEN', 'SLACK_SECRET']
const channel = process.env.SLACK_CHANNEL
const token = process.env.SLACK_TOKEN
const signingSecret = process.env.SLACK_SECRET
let missingEnvVars = []

function stopOnError(err) {
  if (err) {
    console.error(err)
  }

  console.log('Halting execution with exit code: 1')
  process.exit(1)
}

function areEnvVarsSet() {
  missingEnvVars = requiredEnvVars.filter((envVar) => !process.env.hasOwnProperty(envVar))
  return missingEnvVars.length === 0
}

function createSlackMessage(prs, latestRelease) {
  return `
    There have been ${prs.length} PRs merged since \`${latestRelease.name}\` on *${
    latestRelease.published_at
  }*.

    :waiting: *PRs not yet released*:

 - ${prs.join('\n - ')}

    Do you want to <https://github.com/Cryptoking28/monisagent/actions/workflows/prepare-release.yml | prepare a release>?
    `
}

async function findMergedPRs() {
  const github = new Github()
  const latestRelease = await github.getLatestRelease()
  console.log(
    `The latest release is: ${latestRelease.name} published: ${latestRelease.published_at}`
  )
  console.log(`Tag: ${latestRelease.tag_name}, Target: ${latestRelease.target_commitish}`)

  const tag = await github.getTagByName(latestRelease.tag_name)
  console.log('The tag commit sha is: ', tag.commit.sha)

  const commit = await github.getCommit(tag.commit.sha)
  const commitDate = commit.commit.committer.date

  console.log(`Finding merged pull requests since: ${commitDate}`)

  const mergedPullRequests = await github.getMergedPullRequestsSince(commitDate)

  const filteredPullRequests = mergedPullRequests.filter((pr) => {
    // Sometimes the commit for the PR the tag is set to has an earlier time than
    // the PR merge time and we'll pull in release note PRs. Filters those out.
    return pr.merge_commit_sha !== tag.commit.sha
  })

  console.log(`Found ${filteredPullRequests.length}`)
  const prs = filteredPullRequests.map((pr) => pr.html_url)
  return {
    prs,
    latestRelease
  }
}

async function prepareReleaseNotes() {
  try {
    if (!areEnvVarsSet()) {
      console.log(`${missingEnvVars.join(', ')} are not set.`)
      stopOnError()
    }

    const app = new App({
      token,
      signingSecret
    })

    const { prs, latestRelease } = await findMergedPRs()
    const msg = createSlackMessage(prs, latestRelease)
    await app.client.chat.postMessage({
      channel,
      text: msg
    })
    console.log(`Posted msg to ${channel}`)
  } catch (err) {
    stopOnError(err)
  }
}

prepareReleaseNotes()
