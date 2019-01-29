'use strict'

const AttributeFilter = require('../../../lib/config/attribute-filter')
const {makeAttributeFilterConfig} = require('../../lib/agent_helper')
const {expect} = require('chai')

const DESTS = AttributeFilter.DESTINATIONS


describe('AttributeFilter', function() {
  describe('constructor', function() {
    it('should require a config object', function() {
      expect(function() {
        return new AttributeFilter()
      }).to.throw()

      expect(function() {
        return new AttributeFilter(makeAttributeFilterConfig())
      }).to.not.throw()
    })
  })

  describe('#filter', function() {
    it('should respect the rules', function() {
      var filter = new AttributeFilter(makeAttributeFilterConfig({
        attributes: {
          enabled: true,
          include_enabled: true,
          include: ['a'],
          exclude: ['a*']
        },
        transaction_events: {
          attributes: {
            enabled: true,
            include: ['ab', 'bcd*', 'b*'],
            exclude: ['bc*']
          }
        }
      }))

      makeAssertions(filter)
    })

    it('should not add include rules when they are disabled', function() {
      var filter = new AttributeFilter(makeAttributeFilterConfig({
        attributes: {
          enabled: true,
          include_enabled: false,
          include: ['a'],
          exclude: ['ab']
        },
        transaction_events: {
          attributes: {
            enabled: true,
            include: ['ab', 'bcd*', 'b*'],
            exclude: ['bc*']
          }
        }
      }))

      expect(filter.filter(DESTS.COMMON, 'a')).to.equal(DESTS.COMMON)
      expect(filter.filter(DESTS.COMMON, 'ab')).to.equal(DESTS.NONE)
      expect(filter.filter(DESTS.COMMON, '')).to.equal(DESTS.COMMON)
      expect(filter.filter(DESTS.COMMON, 'b')).to.equal(DESTS.COMMON)
      expect(filter.filter(DESTS.COMMON, 'bc')).to.equal(DESTS.COMMON ^ DESTS.TRANS_EVENT)
    })

    it('should not matter the order of the rules', function() {
      var filter = new AttributeFilter(makeAttributeFilterConfig({
        attributes: {
          enabled: true,
          include_enabled: true,
          include: ['a'],
          exclude: ['a*']
        },
        transaction_events: {
          attributes: {
            enabled: true,
            include: ['b*', 'bcd*', 'ab'],
            exclude: ['bc*']
          }
        }
      }))

      makeAssertions(filter)
    })

    it('should match `*` to anything', function() {
      var filter = new AttributeFilter(makeAttributeFilterConfig({
        attributes: {
          enabled: true,
          include_enabled: true,
          include: ['a*'],
          exclude: ['*']
        }
      }))

      expect(filter.filter(DESTS.COMMON, 'a')).to.equal(DESTS.ALL ^ DESTS.BROWSER_EVENT)
      expect(filter.filter(DESTS.COMMON, 'ab')).to.equal(DESTS.ALL ^ DESTS.BROWSER_EVENT)
      expect(filter.filter(DESTS.COMMON, '')).to.equal(DESTS.NONE)
      expect(filter.filter(DESTS.COMMON, 'b')).to.equal(DESTS.NONE)
      expect(filter.filter(DESTS.COMMON, 'bc')).to.equal(DESTS.NONE)
    })

    it('should parse dot rules correctly', function() {
      var filter = new AttributeFilter(makeAttributeFilterConfig({
        attributes: {
          enabled: true,
          include_enabled: true,
          include: ['a.c'],
          exclude: ['ab*']
        }
      }))

      expect(filter.filter(DESTS.COMMON, 'a.c')).to.equal(DESTS.ALL ^ DESTS.BROWSER_EVENT)
      expect(filter.filter(DESTS.COMMON, 'abc')).to.equal(DESTS.NONE)

      expect(filter.filter(DESTS.NONE, 'a.c')).to.equal(DESTS.ALL ^ DESTS.BROWSER_EVENT)
      expect(filter.filter(DESTS.NONE, 'abc')).to.equal(DESTS.NONE)
    })

    function makeAssertions(filter) {
      const NOT_BROWSER = DESTS.COMMON | DESTS.SPAN_EVENT | DESTS.TRANS_SEGMENT
      // Filters down from global rules
      expect(filter.filter(DESTS.ALL, 'a'), 'a -> common').to.equal(NOT_BROWSER)
      expect(filter.filter(DESTS.ALL, 'ab'), 'ab -> common')
        .to.equal(DESTS.TRANS_EVENT)
      expect(filter.filter(DESTS.ALL, 'abc'), 'abc -> common').to.equal(DESTS.NONE)

      // Filters down from destination rules.
      expect(filter.filter(DESTS.ALL, 'b'), 'b -> common').to.equal(NOT_BROWSER)
      expect(filter.filter(DESTS.ALL, 'bc'), 'bc -> common')
        .to.equal(NOT_BROWSER & ~DESTS.TRANS_EVENT)
      expect(filter.filter(DESTS.ALL, 'bcd'), 'bcd -> common').to.equal(NOT_BROWSER)
      expect(filter.filter(DESTS.ALL, 'bcde'), 'bcde -> common').to.equal(NOT_BROWSER)

      // Adds destinations on top of defaults.
      expect(filter.filter(DESTS.NONE, 'a'), 'a -> none').to.equal(NOT_BROWSER)
      expect(filter.filter(DESTS.NONE, 'ab'), 'ab -> none').to.equal(DESTS.TRANS_EVENT)
    }
  })
})
