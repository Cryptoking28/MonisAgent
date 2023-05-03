/*
 * Copyright 2022 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const fs = require('fs')
const path = require('path')
const { program } = require('commander')

const Github = require('./github')
const git = require('./git-commands')

const DEFAULT_FILE_NAME = 'NEWS.md'
/** e.g. v7.2.1 */
const TAG_VALID_REGEX = /v\d+\.\d+\.\d+/
const BASE_BRANCH = 'develop'

program.requiredOption('--tag <tag>', 'tag name to get version of released agent')
program.option('--remote <remote>', 'remote to push branch to', 'origin')
program.option('--username <github username>', 'Owner of the fork of docs-website')
program.option(
  '--changelog <changelog>',
  'Name of changelog(defaults to NEWS.md)',
  DEFAULT_FILE_NAME
)
program.option('--dry-run', 'executes script but does not commit nor create PR')
program.option(
  '--repo-path <path',
  'Path to the docs-website fork on local machine',
  '/tmp/docs-website'
)

program.option('--repo-owner <owner>', 'Owner of the target repo', 'monisagent')

const RELEASE_NOTES_PATH =
  './src/content/docs/release-notes/agent-release-notes/nodejs-release-notes'

const SUPPORT_STATEMENT = `
### Support statement:

* Monis Agent recommends that you upgrade the agent regularly to ensure that you're getting the latest features and performance benefits. Additionally, older releases will no longer be supported when they reach [end-of-life](/docs/using-monis-agent/cross-product-functions/install-configure/notification-changes-monis-agent-saas-features-distributed-software).`

async function createReleaseNotesPr() {
  // Parse commandline options inputs
  program.parse()

  const options = program.opts()

  console.log(`Script running with following options: ${JSON.stringify(options)}`)

  const username = options.username || process.env.GITHUB_ACTOR
  const repoOwner = options.repoOwner

  try {
    const version = options.tag.replace('refs/tags/', '')
    console.log(`Getting version from tag: ${version}`)

    logStep('Validation')
    validateTag(version, options.force)
    logStep('Get Release Notes from File')
    const { body, releaseDate } = await getReleaseNotes(version, options.changelog)

    logStep('Set up docs repo')
    await cloneDocsRepo(options.repoPath, repoOwner)

    logStep('Branch Creation')
    const branchName = await createBranch(options.repoPath, version, options.dryRun)
    logStep('Format release notes file')
    const releaseNotesBody = formatReleaseNotes(releaseDate, version, body)
    logStep('Create Release Notes')
    await addReleaseNotesFile(releaseNotesBody, version)
    logStep('Commit Release Notes')
    await commitReleaseNotes(version, options.remote, branchName, options.dryRun)
    logStep('Create Pull Request')
    await createPR(username, version, branchName, options.dryRun, repoOwner)
    console.log('*** Full Run Successful ***')
  } catch (err) {
    if (err.status && err.status === 404) {
      console.log('404 status error detected. For octokit, this may mean insufficient permissions.')
      console.log('Ensure you have a valid GITHUB_TOKEN set in your env vars.')
    }

    stopOnError(err)
  } finally {
    process.chdir('..')
  }
}

/**
 * Validates tag matches version we want vX.X.X
 *
 * @param {string} version string to validate
 * @param {boolean} force flag to skip validation of tag
 */
function validateTag(version, force) {
  if (force) {
    console.log('--force set. Skipping validation logic')
    return
  }

  if (!TAG_VALID_REGEX.exec(version)) {
    console.log('Tag arg invalid (%s). Valid tags in form: v#.#.# (e.g. v7.2.1)', version)
    stopOnError()
  }
}

/**
 * Extracts the relevant changes from the NEWS.md
 *
 * @param {string} version the new version
 * @param {string} releaseNotesFile the filename where the release notes are stored
 */
async function getReleaseNotes(version, releaseNotesFile) {
  console.log('Retrieving release notes from file: ', releaseNotesFile)

  const data = await readReleaseNoteFile(releaseNotesFile)

  const sections = data.split('### ')
  // Iterate over all past releases to find the version we want
  const versionChangeLog = sections.find((section) => section.startsWith(version))
  // e.g. v7.1.2 (2021-02-24)\n\n
  const headingRegex = /^v\d+\.\d+\.\d+ \((\d{4}-\d{2}-\d{2})\)\s+/
  const body = versionChangeLog.replace(headingRegex, '') + SUPPORT_STATEMENT
  const [, releaseDate] = headingRegex.exec(versionChangeLog)

  return { body, releaseDate }
}

/**
 * Reads the contents of NEWS.md
 *
 * @param {string} file path to NEWS.md
 */
async function readReleaseNoteFile(file) {
  return new Promise((resolve, reject) => {
    fs.readFile(file, 'utf8', (err, data) => {
      if (err) {
        reject(err)
      }

      resolve(data)
    })
  })
}

/**
 * Clones docs repo
 *
 * @param repoPath
 * @param repoOwner
 * @returns {boolean} success or failure
 */
async function cloneDocsRepo(repoPath, repoOwner) {
  const branch = 'develop'
  const url = `https://x-access-token:${process.env.GITHUB_TOKEN}@github.com/${repoOwner}/docs-website.git`
  const cloneOptions = [`--branch=${branch}`, '--single-branch']

  return git.clone(url, repoPath, cloneOptions)
}

/**
 * Creates a branch in your local `docs-website` fork
 * That follows the pattern `add-node-<new agent version>`
 *
 * @param {string} filePath path to the `docs-website` fork
 * @param {string} version newest version of agent
 * @param {boolean} dryRun skip branch creation
 */
async function createBranch(filePath, version, dryRun) {
  filePath = path.resolve(filePath)
  console.log(`Changing to ${filePath}`)
  process.chdir(filePath)
  const branchName = `add-node-${version}`
  if (dryRun) {
    console.log(`Dry run indicated (--dry-run), not creating branch ${branchName}`)
  } else {
    console.log('Creating and checking out new branch: ', branchName)
    await git.checkout(BASE_BRANCH)
    await git.checkoutNewBranch(branchName)
  }

  return branchName
}

/**
 * Formats the .mdx to adhere to the docs team standards for
 * release notes.
 *
 * @param {string} releaseDate date the release was created
 * @param {string} version version number
 * @param {string} body list of changes
 * @returns {string} appropriately formatted release notes
 */
function formatReleaseNotes(releaseDate, version, body) {
  const releaseNotesBody = [
    '---',
    'subject: Node.js agent',
    `releaseDate: '${releaseDate}'`,
    `version: ${version.substr(1)}`, // remove the `v` from start of version
    `downloadLink: 'https://www.npmjs.com/package/monisagent'`,
    '---',
    '',
    '## Notes',
    '',
    body
  ].join('\n')

  console.log(`Release Notes Body \n${releaseNotesBody}`)
  return releaseNotesBody
}

/**
 * Writes the contents of the release notes to the docs-website fork
 *
 * @param {string} body contents of the .mdx
 * @param {string} version version number
 */
function addReleaseNotesFile(body, version) {
  const FILE = getFileName(version)
  return new Promise((resolve, reject) => {
    fs.writeFile(FILE, body, 'utf8', (writeErr) => {
      if (writeErr) {
        reject(writeErr)
      }

      console.log(`Added new release notes ${FILE}`)
      resolve()
    })
  })
}

function getFileName(version) {
  // change `v0.0.0` to `0-0-0`
  version = version.substr(1).replace(/\./g, '-')
  const FILE = `node-agent-${version}.mdx`
  return `${RELEASE_NOTES_PATH}/${FILE}`
}

/**
 * Commits release notes to the local fork and pushes to proper branch.
 *
 * @param {string} version version number
 * @param {string} remote github remote
 * @param {string} branch github branch
 * @param {boolean} dryRun whether or not we should actually update the repo
 */
async function commitReleaseNotes(version, remote, branch, dryRun) {
  if (dryRun) {
    console.log('Dry run indicated (--dry-run), skipping committing release notes.')
    return
  }
  const GITHUB_ACTOR = process.env.GITHUB_ACTOR
  const GITHUB_EMAIL = `gh-actions-${GITHUB_ACTOR}@github.com`
  await git.setUser(GITHUB_ACTOR, GITHUB_EMAIL)

  console.log(`Adding release notes for ${version}`)
  const files = [getFileName(version)]
  await git.addFiles(files)
  await git.commit(`chore: Adds Node.js agent ${version} release notes.`)
  console.log(`Pushing branch to remote ${remote}`)
  await git.pushToRemote(remote, branch)
}

/**
 * Creates a PR to the monisagent/docs-website with new release notes
 *
 * @param {string} username fork owner's github username
 * @param {string} version version number
 * @param {string} branch github branch
 * @param {boolean} dryRun whether or not we should actually create the PR
 * @param {string} repoOwner Owner of the docs-website repo, if targeting a fork instead of monisagent
 */
async function createPR(username, version, branch, dryRun, repoOwner) {
  if (!process.env.GITHUB_TOKEN) {
    console.log('GITHUB_TOKEN required to create a pull request')
    stopOnError()
  }

  const github = new Github(repoOwner, 'docs-website')
  const title = `Node.js Agent ${version} Release Notes`
  const prOptions = {
    head: `${username}:${branch}`,
    base: BASE_BRANCH,
    title,
    body: title
  }

  console.log(`Creating PR with following options: ${JSON.stringify(prOptions)}\n\n`)

  if (dryRun) {
    console.log('Dry run indicated (--dry-run), skipping creating pull request.')
    return
  }

  return await github.createPR(prOptions)
}

/**
 * Logs error and exits script on failure
 *
 * @param {Error} err If present, an error that occurred during script execution
 */
function stopOnError(err) {
  if (err) {
    console.error(err)
  }

  console.log('Halting execution with exit code: 1')
  process.exit(1)
}

/**
 * Logs formatted msg
 *
 * @param {string} step the current step of the script
 */
function logStep(step) {
  console.log(`\n ----- [Step]: ${step} -----\n`)
}

createReleaseNotesPr()
