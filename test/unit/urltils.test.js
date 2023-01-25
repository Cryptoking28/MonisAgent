/*
 * Copyright 2020 Monis Agent Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

// TODO: convert to normal tap style.
// Below allows use of mocha DSL with tap runner.
require('tap').mochaGlobals()

const expect = require('chai').expect
const urltils = require('../../lib/util/urltils.js')
const url = require('url')

describe('NR URL utilities', function () {
  describe('scrubbing URLs', function () {
    it('should return "/" if there\'s no leading slash on the path', function () {
      expect(urltils.scrub('?t_u=http://some.com/o/p')).equal('/')
    })
  })

  describe('parsing parameters', function () {
    it('should find empty object of params in url lacking query', function () {
      expect(urltils.parseParameters('/favicon.ico')).deep.equal({})
    })

    it('should find v param in url containing ?v with no value', function () {
      expect(urltils.parseParameters('/status?v')).deep.equal({ v: true })
    })

    it('should find v param with value in url containing ?v=1', function () {
      expect(urltils.parseParameters('/status?v=1')).deep.equal({ v: '1' })
    })

    it('should find v param when passing in an object', function () {
      expect(urltils.parseParameters(url.parse('/status?v=1', true))).deep.equal({ v: '1' })
    })
  })

  describe('determining whether an HTTP status code is an error', function () {
    let config = { error_collector: { ignore_status_codes: [] } }

    it('should not throw when called with no params', function () {
      expect(function () {
        urltils.isError()
      }).not.throws()
    })

    it('should not throw when called with no code', function () {
      expect(function () {
        urltils.isError(config)
      }).not.throws()
    })

    it('should not throw when config is missing', function () {
      expect(function () {
        urltils.isError(null, 200)
      }).not.throws()
    })

    it('should NOT mark an OK request as an error', function () {
      return expect(urltils.isError(config, 200)).false
    })

    it('should NOT mark a permanent redirect as an error', function () {
      return expect(urltils.isError(config, 301)).false
    })

    it('should NOT mark a temporary redirect as an error', function () {
      return expect(urltils.isError(config, 303)).false
    })

    it('should mark a bad request as an error', function () {
      return expect(urltils.isError(config, 400)).true
    })

    it('should mark an unauthorized request as an error', function () {
      return expect(urltils.isError(config, 401)).true
    })

    it('should mark a "payment required" request as an error', function () {
      return expect(urltils.isError(config, 402)).true
    })

    it('should mark a forbidden request as an error', function () {
      return expect(urltils.isError(config, 403)).true
    })

    it('should mark a not found request as an error', function () {
      return expect(urltils.isError(config, 404)).true
    })

    it('should mark a request with too long a URI as an error', function () {
      return expect(urltils.isError(config, 414)).true
    })

    it('should mark a method not allowed request as an error', function () {
      return expect(urltils.isError(config, 405)).true
    })

    it('should mark a request with unacceptable types as an error', function () {
      return expect(urltils.isError(config, 406)).true
    })

    it('should mark a request requiring proxy auth as an error', function () {
      return expect(urltils.isError(config, 407)).true
    })

    it('should mark a timed out request as an error', function () {
      return expect(urltils.isError(config, 408)).true
    })

    it('should mark a conflicted request as an error', function () {
      return expect(urltils.isError(config, 409)).true
    })

    it('should mark a request for a disappeared resource as an error', function () {
      return expect(urltils.isError(config, 410)).true
    })

    it('should mark a request with a missing length as an error', function () {
      return expect(urltils.isError(config, 411)).true
    })

    it('should mark a request with a failed precondition as an error', function () {
      return expect(urltils.isError(config, 412)).true
    })

    it('should mark a too-large request as an error', function () {
      return expect(urltils.isError(config, 413)).true
    })

    it('should mark a request for an unsupported media type as an error', function () {
      return expect(urltils.isError(config, 415)).true
    })

    it('should mark a request for an unsatisfiable range as an error', function () {
      return expect(urltils.isError(config, 416)).true
    })

    it('should mark a request with a failed expectation as an error', function () {
      return expect(urltils.isError(config, 417)).true
    })

    it('should mark a request asserting teapotness as an error', function () {
      return expect(urltils.isError(config, 418)).true
    })

    it('should mark a request with timed-out auth as an error', function () {
      return expect(urltils.isError(config, 419)).true
    })

    it('should mark a request for enhanced calm (brah) as an error', function () {
      return expect(urltils.isError(config, 420)).true
    })

    it('should work with strings', function () {
      config = { error_collector: { ignore_status_codes: [403] } }
      expect(urltils.isError(config, '200')).to.be.false
      expect(urltils.isError(config, '403')).to.be.false
      expect(urltils.isError(config, '404')).to.be.true
    })
  })

  describe('isIgnoredError', function () {
    const config = { error_collector: { ignore_status_codes: [] } }

    it('returns true if the status code is an HTTP error in the ignored list', () => {
      const errorCodes = [
        400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417,
        418, 419, 420, 500, 503
      ]

      errorCodes.forEach((code) => {
        expect(urltils.isIgnoredError(config, code)).equal(false)
        config.error_collector.ignore_status_codes = [code]
        expect(urltils.isIgnoredError(config, code)).equal(true)
      })
    })

    it('returns false if the status code is NOT an HTTP error', function () {
      const statusCodes = [200]
      statusCodes.forEach((code) => {
        expect(urltils.isIgnoredError(config, code)).equal(false)
        config.error_collector.ignore_status_codes = [code]
        expect(urltils.isIgnoredError(config, code)).equal(false)
      })
    })
  })

  describe('copying parameters from a query hash', function () {
    let source
    let dest

    beforeEach(function () {
      source = {}
      dest = {}
    })

    it('shouldn not throw on missing configuration', function () {
      expect(function () {
        urltils.copyParameters(null, source, dest)
      }).not.throws()
    })

    it('should not throw on missing source', function () {
      expect(function () {
        urltils.copyParameters(null, dest)
      }).not.throws()
    })

    it('should not throw on missing destination', function () {
      expect(function () {
        urltils.copyParameters(source, null)
      }).not.throws()
    })

    it('should copy parameters from source to destination', function () {
      dest.existing = 'here'
      source.firstNew = 'present'
      source.secondNew = 'accounted for'

      expect(function () {
        urltils.copyParameters(source, dest)
      }).not.throws()

      expect(dest).eql({
        existing: 'here',
        firstNew: 'present',
        secondNew: 'accounted for'
      })
    })

    it('should not overwrite existing parameters in destination', function () {
      dest.existing = 'here'
      dest.firstNew = 'already around'
      source.firstNew = 'present'
      source.secondNew = 'accounted for'

      urltils.copyParameters(source, dest)

      expect(dest).eql({
        existing: 'here',
        firstNew: 'already around',
        secondNew: 'accounted for'
      })
    })

    it('should not overwrite null parameters in destination', function () {
      dest.existing = 'here'
      dest.firstNew = null
      source.firstNew = 'present'

      urltils.copyParameters(source, dest)

      expect(dest).eql({
        existing: 'here',
        firstNew: null
      })
    })

    it('should not overwrite undefined parameters in destination', function () {
      dest.existing = 'here'
      dest.firstNew = undefined
      source.firstNew = 'present'

      urltils.copyParameters(source, dest)

      expect(dest).eql({
        existing: 'here',
        firstNew: undefined
      })
    })
  })

  describe('obfuscates path by regex', function () {
    let config
    let path

    beforeEach(function () {
      config = {
        url_obfuscation: {
          enabled: false,
          regex: {
            pattern: null,
            flags: null,
            replacement: null
          }
        }
      }
      path = '/foo/123/bar/456/baz/789'
    })

    it('should not obfuscate path by default', function () {
      expect(urltils.obfuscatePath(config, path)).equal(path)
    })

    it('should not obfuscate if obfuscation is enabled but pattern is not set', function () {
      config.url_obfuscation.enabled = true
      expect(urltils.obfuscatePath(config, path)).equal(path)
    })

    it('should not obfuscate if obfuscation is enabled but pattern is invalid', function () {
      config.url_obfuscation.enabled = true
      config.url_obfuscation.regex.pattern = '/foo/bar/baz/[0-9]+'
      expect(urltils.obfuscatePath(config, path)).equal(path)
    })

    it('should obfuscate with empty string `` if replacement is not set and pattern is set', function () {
      config.url_obfuscation.enabled = true
      config.url_obfuscation.regex.pattern = '/foo/[0-9]+/bar/[0-9]+/baz/[0-9]+'
      expect(urltils.obfuscatePath(config, path)).equal('/')
    })

    it('should obfuscate with replacement if replacement is set and pattern is set', function () {
      config.url_obfuscation.enabled = true
      config.url_obfuscation.regex.pattern = '/foo/[0-9]+/bar/[0-9]+/baz/[0-9]+'
      config.url_obfuscation.regex.replacement = '***'
      expect(urltils.obfuscatePath(config, path)).equal('/***')
    })

    it('should obfuscate as expected with capture groups pattern over strings', function () {
      config.url_obfuscation.enabled = true
      config.url_obfuscation.regex.pattern = '(/foo/)(.*)(/bar/)(.*)(/baz/)(.*)'
      config.url_obfuscation.regex.replacement = '$1***$3***$5***'
      expect(urltils.obfuscatePath(config, path)).equal('//foo/***/bar/***/baz/***')
    })

    it('shoould obfuscate as expected with regex patterns and flags', function () {
      config.url_obfuscation.enabled = true
      config.url_obfuscation.regex.pattern = '/[0-9]+'
      config.url_obfuscation.regex.flags = 'g'
      config.url_obfuscation.regex.replacement = '***'
      expect(urltils.obfuscatePath(config, path)).equal('/foo/***/bar/***/baz/***')
    })
  })
})
