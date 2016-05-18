'use strict'

var chai = require('chai')
var expect = chai.expect
var helper = require('../../lib/agent_helper')
var Shim = require('../../../lib/shim/shim')

describe('Shim', function() {
  var agent = null
  var shim = null
  var wrappable = null

  beforeEach(function () {
    agent = helper.loadMockedAgent()
    shim = new Shim(agent)
    wrappable = {
      name: 'this is a name',
      bar: function barsName() { return 'bar' },
      fiz: function fizsName() { return 'fiz' },
      anony: function() {},
      getActiveSegment: function() {
        return agent.tracer.getSegment()
      }
    }
  })

  afterEach(function () {
    helper.unloadAgent(agent)
    agent = null
    shim = null
  })

  describe('constructor', function() {
    it('should require an agent parameter', function() {
      expect(function() { new Shim() })
        .to.throw(Error, 'Shim must be initialized with an agent.')
    })
  })

  describe('.defineProperty', function() {
    describe('with a value', function() {
      it('should create a non-writable property', function() {
        var foo = {}
        Shim.defineProperty(foo, 'bar', 'foobar')
        expect(foo).to.have.property('bar', 'foobar')
        testNonWritable(foo, 'bar', 'foobar')
      })
    })

    describe('with a function', function() {
      it('should create a getter', function() {
        var foo = {}
        var getterCalled = false
        Shim.defineProperty(foo, 'bar', function() {
          getterCalled = true
          return 'foobar'
        })

        expect(getterCalled).to.be.false
        expect(foo.bar).to.equal('foobar')
        expect(getterCalled).to.be.true
      })
    })
  })

  describe('.defineProperties', function() {
    it('should create all the properties specified', function() {
      var foo = {}
      Shim.defineProperties(foo, {
        bar: 'foobar',
        fiz: function() { return 'bang' }
      })

      expect(foo).to.have.keys(['bar', 'fiz'])
    })
  })

  describe('#FIRST through #LAST', function() {
    var keys = ['FIRST', 'SECOND', 'THIRD', 'FOURTH', 'LAST']

    it('should be a non-writable property', function() {
      keys.forEach(function(k) {
        testNonWritable(shim, k)
      })
    })

    it('should be an array index value', function() {
      keys.forEach(function(k, i) {
        expect(shim).to.have.property(k, k === 'LAST' ? -1 : i)
      })
    })
  })

  describe('#WEB and #BG', function() {
    var keys = ['WEB', 'BG']

    it('should be a non-writable property', function() {
      keys.forEach(function(k) {
        testNonWritable(shim, k)
      })
    })

    it('should be transaction types', function() {
      keys.forEach(function(k, i) {
        expect(shim).to.have.property(k, k.toLowerCase())
      })
    })
  })

  describe('#agent', function() {
    it('should be a non-writable property', function() {
      testNonWritable(shim, 'agent', agent)
    })

    it('should be the agent handed to the constructor', function() {
      var foo = {}
      var s = new Shim(foo)
      expect(s.agent).to.equal(foo)
    })
  })

  describe('#tracer', function() {
    it('should be a non-writable property', function() {
      testNonWritable(shim, 'tracer', agent.tracer)
    })

    it('should be the tracer from the agent', function() {
      var foo = {tracer: {}}
      var s = new Shim(foo)
      expect(s.tracer).to.equal(foo.tracer)
    })
  })

  describe('#logger', function() {
    it('should be a non-writable property', function() {
      testNonWritable(shim, 'logger')
    })

    it('should be a logger to use with the shim', function() {
      expect(shim.logger).to.have.property('trace')
        .that.is.an.instanceof(Function)
      expect(shim.logger).to.have.property('debug')
        .that.is.an.instanceof(Function)
      expect(shim.logger).to.have.property('info')
        .that.is.an.instanceof(Function)
      expect(shim.logger).to.have.property('warn')
        .that.is.an.instanceof(Function)
      expect(shim.logger).to.have.property('error')
        .that.is.an.instanceof(Function)
    })
  })

  describe('#wrap', function() {
    it('should call the spec with the to-be-wrapped item', function() {
      shim.wrap(wrappable, function(_shim, toWrap, name) {
        expect(_shim).to.equal(shim)
        expect(toWrap).to.equal(wrappable)
        expect(name).to.equal(wrappable.name)
      })
    })

    it('should pass items in the `args` parameter to the spec', function() {
      shim.wrap(wrappable, function(_shim, toWrap, name, arg1, arg2, arg3) {
        expect(arguments.length).to.equal(6)
        expect(arg1).to.equal('a')
        expect(arg2).to.equal('b')
        expect(arg3).to.equal('c')
      }, ['a', 'b', 'c'])
    })

    describe('with no properties', function() {
      it('should wrap the first parameter', function() {
        shim.wrap(wrappable, function(_, toWrap) {
          expect(toWrap).to.equal(wrappable)
        })
      })

      it('should wrap the first parameter when properties is `null`', function() {
        shim.wrap(wrappable, null, function(_, toWrap) {
          expect(toWrap).to.equal(wrappable)
        })
      })

      it('should mark the first parameter as wrapped', function() {
        var wrapped = shim.wrap(wrappable, function(_, toWrap) {
          return {wrappable: toWrap}
        })

        expect(wrapped).to.not.equal(wrappable)
        expect(wrapped).to.have.property('wrappable', wrappable)
        expect(shim.isWrapped(wrapped)).to.be.true
      })
    })

    describe('with properties', function() {
      var barTestWrapper = null
      var ret = null

      beforeEach(function() {
        barTestWrapper = function() {}
        ret = shim.wrap(wrappable, 'bar', function(_, toWrap) {
          return barTestWrapper
        })
      })

      it('should accept a single property', function() {
        var original = wrappable.fiz
        shim.wrap(wrappable, 'fiz', function(_, toWrap, name) {
          expect(toWrap).to.equal(wrappable.fiz)
          expect(name).to.equal('fiz', 'should use property as name')
        })

        expect(ret).to.equal(wrappable)
        expect(wrappable.fiz).to.equal(original, 'should not replace unwrapped')
      })

      it('should accept an array of properties', function() {
        var specCalled = 0
        shim.wrap(wrappable, ['fiz', 'anony'], function(_, toWrap, name) {
          ++specCalled
          if (specCalled === 1) {
            expect(toWrap).to.equal(wrappable.fiz)
            expect(name).to.equal('fiz')
          } else if (specCalled === 2) {
            expect(toWrap).to.equal(wrappable.anony)
            expect(name).to.equal('anony')
          }
        })

        expect(specCalled).to.equal(2)
      })

      it('should replace wrapped properties on the original object', function() {
        expect(wrappable.bar).to.equal(barTestWrapper)
      })

      it('should mark wrapped properties as such', function() {
        expect(shim.isWrapped(wrappable, 'bar')).to.be.true
      })

      it('should not mark unwrapped properties as wrapped', function() {
        expect(shim.isWrapped(wrappable, 'fiz')).to.be.false
      })
    })
  })

  describe('#bindSegment', function() {
    var segment

    beforeEach(function() {
      segment = {
        started: false,
        touched: false,
        start: function() { this.started = true },
        touch: function() { this.touched = true }
      }
    })

    it('should not wrap non-functions', function() {
      shim.bindSegment(wrappable, 'name')
      expect(shim.isWrapped(wrappable, 'name')).to.be.false
    })

    it('should not error if `nodule` is `null`', function() {
      expect(function() {
        shim.bindSegment(null, 'foobar', segment)
      }).to.not.throw()
    })

    describe('with no property', function() {
      it('should wrap the first parameter if `property` is not given', function() {
        var wrapped = shim.bindSegment(wrappable.getActiveSegment, segment)

        expect(wrapped).to.not.equal(wrappable.getActiveSegment)
        expect(shim.isWrapped(wrapped)).to.be.true
        expect(shim.unwrap(wrapped)).to.equal(wrappable.getActiveSegment)
      })

      it('should wrap the first parameter if `property` is `null`', function() {
        var wrapped = shim.bindSegment(wrappable.getActiveSegment, null, segment)

        expect(wrapped).to.not.equal(wrappable.getActiveSegment)
        expect(shim.isWrapped(wrapped)).to.be.true
        expect(shim.unwrap(wrapped)).to.equal(wrappable.getActiveSegment)
      })
    })

    describe('wrapper', function() {
      var startingSegment

      beforeEach(function() {
        startingSegment = agent.tracer.getSegment()
      })

      it('should make the given segment active while executing', function() {
        expect(startingSegment).to.not.equal(segment, 'test should start in clean condition')

        shim.bindSegment(wrappable, 'getActiveSegment', segment)
        expect(agent.tracer.segment).to.equal(startingSegment)
        expect(wrappable.getActiveSegment()).to.equal(segment)
        expect(agent.tracer.segment).to.equal(startingSegment)
      })

      it('should default `full` to false', function() {
        shim.bindSegment(wrappable, 'getActiveSegment', segment)
        wrappable.getActiveSegment()

        expect(segment.started).to.be.false
        expect(segment.touched).to.be.false
      })

      it('should start and touch the segment if `full` is `true`', function() {
        shim.bindSegment(wrappable, 'getActiveSegment', segment, true)
        wrappable.getActiveSegment()

        expect(segment.started).to.be.true
        expect(segment.touched).to.be.true
      })

      it('should default to the current segment', function() {
        agent.tracer.segment = segment
        shim.bindSegment(wrappable, 'getActiveSegment')
        var activeSegment = wrappable.getActiveSegment()
        expect(activeSegment).to.equal(segment)
      })
    })
  })

  describe('#execute', function() {
  })

  describe('#wrapReturn', function() {
    it('should not wrap non-function objects', function() {
      shim.wrapReturn(wrappable, 'name', function() {})
      expect(shim.isWrapped(wrappable, 'name')).to.be.false
    })

    describe('with no properties', function() {
      it('should wrap the first parameter if no properties are given', function() {
        var wrapped = shim.wrapReturn(wrappable.bar, function() {})

        expect(wrapped).to.not.equal(wrappable.bar)
        expect(shim.isWrapped(wrapped)).to.be.true
        expect(shim.unwrap(wrapped)).to.equal(wrappable.bar)
      })

      it('should wrap the first parameter if `null` is given for properties', function() {
        var wrapped = shim.wrapReturn(wrappable.bar, null, function() {})

        expect(wrapped).to.not.equal(wrappable.bar)
        expect(shim.isWrapped(wrapped)).to.be.true
        expect(shim.unwrap(wrapped)).to.equal(wrappable.bar)
      })
    })

    describe('with properties', function() {
      it('should replace wrapped properties on the original object', function() {
        var original = wrappable.bar
        shim.wrapReturn(wrappable, 'bar', function() {})

        expect(wrappable.bar).to.not.equal(original)
        expect(shim.isWrapped(wrappable, 'bar')).to.be.true
        expect(shim.unwrap(wrappable.bar)).to.equal(original)
      })
    })

    describe('wrapper', function() {
      var executed
      var toWrap
      var returned

      beforeEach(function() {
        executed = false
        toWrap = {
          foo: function() {
            executed = true
            returned = {
              context: this,
              args: shim.toArray(arguments)
            }
            return returned
          }
        }
      })

      it('should execute the wrapped function', function() {
        shim.wrapReturn(toWrap, 'foo', function() {})
        var res = toWrap.foo('a', 'b', 'c')
        expect(executed).to.be.true
        expect(res.context).to.equal(toWrap)
        expect(res.args).to.eql(['a', 'b', 'c'])
      })

      it('should call the spec with returned value', function() {
        var specExecuted = false
        shim.wrapReturn(toWrap, 'foo', function(_, fn, name, ret) {
          specExecuted = true
          expect(ret).to.equal(returned)
        })

        toWrap.foo()
        expect(specExecuted).to.be.true
      })

      it('should invoke the spec in the context of the wrapped function', function() {
        shim.wrapReturn(toWrap, 'foo', function(_, fn, name, ret) {
          expect(this).to.equal(toWrap)
        })

        toWrap.foo()
      })

      it('should pass items in the `args` parameter to the spec', function() {
        shim.wrapReturn(toWrap, 'foo', function(_, fn, name, ret, a, b, c) {
          expect(arguments.length).to.equal(7)
          expect(a).to.equal('a')
          expect(b).to.equal('b')
          expect(c).to.equal('c')
        }, ['a', 'b', 'c'])

        toWrap.foo()
      })
    })
  })

  describe('#record', function() {
    it('should not wrap non-function objects', function() {
      var wrapped = shim.record(wrappable, function() {})
      expect(wrapped).to.equal(wrappable)
      expect(shim.isWrapped(wrapped)).to.be.false
    })

    describe('with no properties', function() {
      it('should wrap the first parameter if no properties are given', function() {
        var wrapped = shim.record(wrappable.bar, function() {})
        expect(wrapped).to.not.equal(wrappable.bar)
        expect(shim.isWrapped(wrapped)).to.be.true
        expect(shim.unwrap(wrapped)).to.equal(wrappable.bar)
      })

      it('should wrap the first parameter if `null` is given for properties', function() {
        var wrapped = shim.record(wrappable.bar, null, function() {})
        expect(wrapped).to.not.equal(wrappable.bar)
        expect(shim.isWrapped(wrapped)).to.be.true
        expect(shim.unwrap(wrapped)).to.equal(wrappable.bar)
      })
    })

    describe('with properties', function() {
      it('should replace wrapped properties on the original object', function() {
        var original = wrappable.bar
        shim.record(wrappable, 'bar', function() {})
        expect(wrappable.bar).to.not.equal(original)
        expect(shim.isWrapped(wrappable.bar)).to.be.true
        expect(shim.unwrap(wrappable.bar)).to.equal(original)
      })

      it('should not mark unwrapped properties as wrapped', function() {
        shim.record(wrappable, 'name', function() {})
        expect(shim.isWrapped(wrappable.name)).to.be.false
      })
    })

    describe('wrapper', function() {
      it('should create a segment', function() {
        shim.record(wrappable, 'getActiveSegment', function() {
          return {name: 'test segment'}
        })

        helper.runInTransaction(agent, function(tx) {
          var startingSegment = agent.tracer.getSegment()
          var segment = wrappable.getActiveSegment()
          expect(segment).to.not.equal(startingSegment)
          expect(segment.name).to.equal('test segment')
          expect(agent.tracer.getSegment()).to.equal(startingSegment)
        })
      })

      it('should execute the wrapped function', function() {
        var executed = false
        var toWrap = function() { executed = true }
        var wrapped = shim.record(toWrap, function() {
          return {name: 'test segment'}
        })

        expect(executed).to.be.false
        wrapped()
        expect(executed).to.be.true
      })

      it('should invoke the spec in the context of the wrapped function', function() {
        var original = wrappable.bar
        var executed = false
        shim.record(wrappable, 'bar', function(_, fn, name, args) {
          executed = true
          expect(fn).to.equal(original)
          expect(name).to.equal('bar')
          expect(this).to.equal(wrappable)
          expect(args).to.deep.equal(['a', 'b', 'c'])
        })

        wrappable.bar('a', 'b', 'c')
        expect(executed).to.be.true
      })

      it('should bind the callback if there is one', function() {
        var cb = function() {}
        var toWrap = function(wrappedCB) {
          expect(wrappedCB).to.not.equal(cb)
          expect(shim.isWrapped(wrappedCB)).to.be.true
          expect(shim.unwrap(wrappedCB)).to.equal(cb)

          expect(function() {
            wrappedCB()
          }).to.not.throw()
        }

        var wrapped = shim.record(toWrap, function() {
          return {name: 'test segment', callback: shim.LAST}
        })
        wrapped(cb)
      })
    })
  })

  describe('#isWrapped', function() {
    describe('without a property', function() {
      it('should return true if the object was wrapped', function() {
        var toWrap = function() {}
        expect(shim.isWrapped(toWrap)).to.be.false

        var wrapped = shim.wrap(toWrap, function() { return function() {} })
        expect(shim.isWrapped(wrapped)).to.be.true
      })

      it('should not error if the object is `null`', function() {
        expect(function() {
          shim.isWrapped(null)
        }).to.not.throw()

        expect(shim.isWrapped(null)).to.be.false
      })
    })

    describe('with a property', function() {
      it('should return true if the property was wrapped', function() {
        expect(shim.isWrapped(wrappable, 'bar')).to.be.false

        shim.wrap(wrappable, 'bar', function() { return function() {} })
        expect(shim.isWrapped(wrappable, 'bar')).to.be.true
      })

      it('should not error if the object is `null`', function() {
        expect(function() {
          shim.isWrapped(null, 'bar')
        }).to.not.throw()
        expect(shim.isWrapped(null, 'bar')).to.be.false
      })

      it('should not error if the property is `null`', function() {
        expect(function() {
          shim.isWrapped(wrappable, 'this does not exist')
        }).to.not.throw()
        expect(shim.isWrapped(wrappable, 'this does not exist')).to.be.false
      })
    })
  })

  describe('#unwrap', function() {
    var original
    var wrapped

    beforeEach(function() {
      original = function() {}
      wrapped = shim.wrap(original, function() { return function() {} })
      shim.wrap(wrappable, ['bar', 'fiz', 'getActiveSegment'], function() {
        return function() {}
      })
    })

    it('should not error if the item is not wrapped', function() {
      expect(function() {
        shim.unwrap(original)
      }).to.not.throw()
      expect(shim.unwrap(original)).to.equal(original)
    })

    it('should fully unwrap nested wrappers', function() {
      for (var i = 0; i < 10; ++i) {
        wrapped = shim.wrap(wrapped, function() { return function() {} })
      }

      expect(wrapped).to.not.equal(original)
      expect(wrapped.__NR_original).to.not.equal(original)
      expect(shim.unwrap(wrapped)).to.equal(original)
    })

    describe('with no properties', function() {
      it('should unwrap the first parameter', function() {
        expect(shim.unwrap(wrapped)).to.equal(original)
      })

      it('should not error if `nodule` is `null`', function() {
        expect(function() {
          shim.unwrap(null)
        }).to.not.throw()
      })
    })

    describe('with properties', function() {
      it('should accept a single property', function() {
        expect(shim.isWrapped(wrappable.bar)).to.be.true
        expect(function() {
          shim.unwrap(wrappable, 'bar')
        }).to.not.throw()
        expect(shim.isWrapped(wrappable.bar)).to.be.false
      })

      it('should accept an array of properties', function() {
        expect(shim.isWrapped(wrappable.bar)).to.be.true
        expect(shim.isWrapped(wrappable.fiz)).to.be.true
        expect(shim.isWrapped(wrappable.getActiveSegment)).to.be.true
        expect(function() {
          shim.unwrap(wrappable, ['bar', 'fiz', 'getActiveSegment'])
        }).to.not.throw()
        expect(shim.isWrapped(wrappable.bar)).to.be.false
        expect(shim.isWrapped(wrappable.fiz)).to.be.false
        expect(shim.isWrapped(wrappable.getActiveSegment)).to.be.false
      })

      it('should not error if a nodule is `null`', function() {
        expect(function() {
          shim.unwrap(null, 'bar')
        }).to.not.throw
      })

      it('should not error if a property is `null`', function() {
        expect(function() {
          shim.unwrap(wrappable, 'this does not exist')
        }).to.not.throw
      })
    })
  })

  describe('#getSegment', function() {
    it('should return the segment a function is bound to', function() {
      var segment = {}
      var bound = shim.bindSegment(function() {}, segment)
      expect(shim.getSegment(bound)).to.equal(segment)
    })

    it('should return the current segment if the function is not bound', function() {
      var segment = {}
      agent.tracer.segment = segment
      expect(shim.getSegment(function() {})).to.equal(segment)
    })

    it('should return the current segment if no object is provided', function() {
      var segment = {}
      agent.tracer.segment = segment
      expect(shim.getSegment()).to.equal(segment)
    })
  })

  describe('#storeSegment', function() {
    it('should set a non-enumerable property on the object', function() {
      var keys = Object.keys(wrappable)
      shim.storeSegment(wrappable, {})
      expect(Object.keys(wrappable)).to.deep.equal(keys)
    })

    it('should store the segment on the object', function() {
      var segment = {}
      shim.storeSegment(wrappable, segment)
      expect(shim.getSegment(wrappable)).to.equal(segment)
    })

    it('should default to the current segment', function() {
      var segment = {}
      agent.tracer.segment = segment
      shim.storeSegment(wrappable)
      expect(shim.getSegment(wrappable)).to.equal(segment)
    })

    it('should not fail if the object is `null`', function() {
      expect(function() {
        shim.storeSegment(null)
      }).to.not.throw()
    })
  })

  describe('#bindCreateTransaction', function() {
    it('should not wrap non-functions', function() {
      shim.bindCreateTransaction(wrappable, 'name', {type: shim.WEB})
      expect(shim.isWrapped(wrappable.name)).to.be.false
    })

    describe('with no properties', function() {
      it('should wrap the first parameter if no properties are given', function() {
        var wrapped = shim.bindCreateTransaction(wrappable.bar, {type: shim.WEB})
        expect(wrapped).to.not.equal(wrappable.bar)
        expect(shim.isWrapped(wrapped)).to.be.true
        expect(shim.unwrap(wrapped)).to.equal(wrappable.bar)
      })

      it('should wrap the first parameter if `null` is given for properties', function() {
        var wrapped = shim.bindCreateTransaction(wrappable.bar, null, {type: shim.WEB})
        expect(wrapped).to.not.equal(wrappable.bar)
        expect(shim.isWrapped(wrapped)).to.be.true
        expect(shim.unwrap(wrapped)).to.equal(wrappable.bar)
      })
    })

    describe('with properties', function() {
      it('should replace wrapped properties on the original object', function() {
        var original = wrappable.bar
        shim.bindCreateTransaction(wrappable, 'bar', {type: shim.WEB})
        expect(wrappable.bar).to.not.equal(original)
        expect(shim.isWrapped(wrappable, 'bar')).to.be.true
        expect(shim.unwrap(wrappable, 'bar')).to.equal(original)
      })
    })

    describe('wrapper', function() {
      it('should execute the wrapped function', function() {
        var executed = false
        var context = {}
        var value = {}
        var wrapped = shim.bindCreateTransaction(function(a, b, c) {
          executed = true
          expect(this).to.equal(context)
          expect(a).to.equal('a')
          expect(b).to.equal('b')
          expect(c).to.equal('c')
          return value
        }, {type: shim.WEB})

        expect(executed).to.be.false
        var ret = wrapped.call(context, 'a', 'b', 'c')
        expect(executed).to.be.true
        expect(ret).to.equal(value)
      })

      it('should create a transaction with the correct type', function() {
        shim.bindCreateTransaction(wrappable, 'getActiveSegment', {type: shim.WEB})
        var segment = wrappable.getActiveSegment()
        expect(segment)
          .to.exist()
          .and.have.property('transaction')
          .that.has.property('type', shim.WEB)

        shim.unwrap(wrappable, 'getActiveSegment')
        shim.bindCreateTransaction(wrappable, 'getActiveSegment', {type: shim.BG})
        var segment = wrappable.getActiveSegment()
        expect(segment)
          .to.exist()
          .and.have.property('transaction')
          .that.has.property('type', shim.BG)
      })

      describe('when `spec.nest` is false', function() {
        it('should not create a nested transaction', function() {
          var webTx = null
          var bgTx = null
          var webCalled = false
          var bgCalled = false
          var web = shim.bindCreateTransaction(function() {
            webCalled = true
            webTx = shim.getSegment().transaction
            bg()
          }, {type: shim.WEB})

          var bg = shim.bindCreateTransaction(function() {
            bgCalled = true
            bgTx = shim.getSegment().transaction
          }, {type: shim.BG})

          web()
          expect(webCalled).to.be.true
          expect(bgCalled).to.be.true
          expect(webTx).to.exist().and.equal(bgTx)
        })
      })

      describe('when `spec.nest` is `true`', function() {
        var transactions = null
        var web = null
        var bg = null

        beforeEach(function() {
          transactions = []
          web = shim.bindCreateTransaction(function(cb) {
            transactions.push(shim.getSegment().transaction)
            if (cb) {
              cb()
            }
          }, {type: shim.WEB, nest: true})

          bg = shim.bindCreateTransaction(function(cb) {
            transactions.push(shim.getSegment().transaction)
            if (cb) {
              cb()
            }
          }, {type: shim.BG, nest: true})
        })

        it('should create a nested transaction if the types differ', function() {
          web(bg)
          expect(transactions).to.have.lengthOf(2)
          expect(transactions[0]).to.not.equal(transactions[1])

          transactions = []
          bg(web)
          expect(transactions).to.have.lengthOf(2)
          expect(transactions[0]).to.not.equal(transactions[1])
        })

        it('should not create a nested transaction if the types are the same', function() {
          web(web)
          expect(transactions).to.have.lengthOf(2)
          expect(transactions[0]).to.equal(transactions[1])

          transactions = []
          bg(bg)
          expect(transactions).to.have.lengthOf(2)
          expect(transactions[0]).to.equal(transactions[1])
        })

        it('should create transactions if the types alternate', function() {
          web(bg.bind(null, web.bind(null, bg)))
          expect(transactions).to.have.lengthOf(4)
          for (var i = 0; i < transactions.length; ++i) {
            var tx1 = transactions[i]
            for (var j = i + 1; j < transactions.length; ++j) {
              var tx2 = transactions[j]
              expect(tx1).to.not.equal(tx2, 'tx ' + i + ' should not equal tx ' + j)
            }
          }
        })
      })
    })
  })

  describe('#bindCallbackSegment', function() {
    var cbCalled = false
    var cb = null

    beforeEach(function() {
      cbCalled = false
      cb = function() {
        cbCalled = true
      }
    })

    it('should wrap the callback in place', function() {
      var args = ['a', cb, 'b']
      shim.bindCallbackSegment(args, shim.SECOND)

      var wrapped = args[1]
      expect(wrapped)
        .to.be.an.instanceof(Function)
        .and.not.equal(cb)
      expect(args).to.deep.equal(['a', wrapped, 'b'])
      expect(shim.isWrapped(wrapped)).to.be.true
      expect(shim.unwrap(wrapped)).to.equal(cb)
    })

    it('should work with an array and numeric index', function() {
      var args = ['a', cb, 'b']
      shim.bindCallbackSegment(args, 1)
      expect(shim.isWrapped(args[1])).to.be.true
    })

    it('should work with an object and a string index', function() {
      var opts = {a: 'a', cb: cb, b: 'b'}
      shim.bindCallbackSegment(opts, 'cb')
      expect(shim.isWrapped(opts, 'cb')).to.be.true
    })

    it('should not error if `args` is `null`', function() {
      expect(function() {
        shim.bindCallbackSegment(null, 1)
      }).to.not.throw()
    })

    it('should not error if the callback does not exist', function() {
      expect(function() {
        var args = ['a']
        shim.bindCallbackSegment(args, 1)
      }).to.not.throw()
    })

    it('should not bind if the "callback" is not a function', function() {
      expect(function() {
        var args = ['a']
        shim.bindCallbackSegment(args, 0)
      }).to.not.throw()

      var args = ['a']
      shim.bindCallbackSegment(args, 0)
      expect(shim.isWrapped(args[0])).to.be.false
      expect(args[0]).to.equal('a')
    })

    describe('wrapper', function() {
      it('should execute the callback', function() {
        var args = ['a', 'b', cb]
        shim.bindCallbackSegment(args, shim.LAST)

        expect(cbCalled).to.be.false
        args[2]()
        expect(cbCalled).to.be.true
      })

      it('should create a new segment', function() {
        helper.runInTransaction(agent, function(tx) {
          var args = [wrappable.getActiveSegment]
          var segment = wrappable.getActiveSegment()
          var parent = shim.createSegment('test segment')
          shim.bindCallbackSegment(args, shim.LAST, parent)
          var cbSegment = args[0]()

          expect(cbSegment)
            .to.not.equal(segment)
            .and.not.equal(parent)
          expect(parent)
            .to.have.property('children')
            .that.deep.equals([cbSegment])
        })
      })

      it('should default the `parentSegment` to the current one', function() {
        helper.runInTransaction(agent, function(tx) {
          var args = [wrappable.getActiveSegment]
          var segment = wrappable.getActiveSegment()
          shim.bindCallbackSegment(args, shim.LAST)
          var cbSegment = args[0]()

          expect(cbSegment)
            .to.not.equal(segment)
          expect(segment)
            .to.have.property('children')
            .that.deep.equals([cbSegment])
        })
      })
    })
  })

  describe('#applySegment', function() {
    var segment

    beforeEach(function() {
      segment = {
        name: 'segment',
        started: false,
        touched: false,
        start: function() { this.started = true },
        touch: function() { this.touched = true }
      }
    })

    it('should call the function with the `context` and `args`', function() {
      var context = {name: 'context'}
      var value = {name: 'value'}
      var ret = shim.applySegment(function(a, b, c) {
        expect(this).to.equal(context)
        expect(arguments.length).to.equal(3)
        expect(a).to.equal('a')
        expect(b).to.equal('b')
        expect(c).to.equal('c')
        return value
      }, segment, false, context, ['a', 'b', 'c'])

      expect(ret).to.equal(value)
    })

    it('should make the segment active for the duration of execution', function() {
      var prevSegment = {name: 'prevSegment'}
      agent.tracer.segment = prevSegment
      var activeSegment = shim.applySegment(wrappable.getActiveSegment, segment)
      expect(agent.tracer.segment).to.equal(prevSegment)
      expect(activeSegment).to.equal(segment)
      expect(segment).to.have.property('touched', false)
      expect(segment).to.have.property('started', false)
    })

    it('should start and touch the segment if `full` is `true`', function() {
      shim.applySegment(wrappable.getActiveSegment, segment, true)
      expect(segment).to.have.property('touched', true)
      expect(segment).to.have.property('started', true)

    })

    it('should not change the active segment if `segment` is `null`', function() {
      agent.tracer.segment = segment
      var activeSegment = null
      expect(function() {
        activeSegment = shim.applySegment(wrappable.getActiveSegment, null)
      }).to.not.throw()
      expect(agent.tracer.segment).to.equal(segment)
      expect(activeSegment).to.equal(segment)
    })

    describe('when `func` throws an exception', function() {
      var func = null

      beforeEach(function() {
        func = function() {
          throw new Error('test error')
        }
      })

      it('should not swallow the exception', function() {
        expect(function() {
          shim.applySegment(func, segment)
        }).to.throw(Error, 'test error')
      })

      it('should still return the active segment to the previous one', function() {
        var prevSegment = {name: 'prevSegment'}
        agent.tracer.segment = prevSegment

        expect(function() {
          shim.applySegment(func, segment)
        }).to.throw(Error, 'test error')

        expect(agent.tracer.segment).to.equal(prevSegment)
      })
      it('should still touch the segment if `full` is `true`', function() {
        expect(function() {
          shim.applySegment(func, segment, true)
        }).to.throw(Error, 'test error')

        expect(segment).to.have.property('touched', true)
      })
    })
  })

  describe('#createSegment', function() {
    it('should create a segment with the correct name', function() {
      helper.runInTransaction(agent, function() {
        var segment = shim.createSegment('foobar')
        expect(segment).to.have.property('name', 'foobar')
      })
    })

    it('should allow `recorder` to be omitted', function() {
      helper.runInTransaction(agent, function() {
        var parent = shim.createSegment('parent')
        var child = shim.createSegment('child', parent)
        expect(child).to.have.property('name', 'child')
        expect(parent)
          .to.have.property('children')
          .that.deep.equals([child])
      })
    })

    it('should default to the current segment as the parent', function() {
      helper.runInTransaction(agent, function() {
        var parent = shim.getSegment()
        var child = shim.createSegment('child')
        expect(parent)
          .to.have.property('children')
          .that.deep.equals([child])
      })
    })

    it('should work with all parameters in an object', function() {
      helper.runInTransaction(agent, function() {
        var parent = shim.createSegment('parent')
        var child = shim.createSegment({name: 'child', parent: parent})
        expect(child).to.have.property('name', 'child')
        expect(parent)
          .to.have.property('children')
          .that.deep.equals([child])
      })
    })

    describe('when an `extras` object is provided', function() {
      var segment = null
      var extras = null

      beforeEach(function() {
        agent.config.capture_params = true
        helper.runInTransaction(agent, function() {
          extras = {
            host: 'my awesome host',
            port: 1234,
            foo: 'bar',
            fiz: 'bang'
          }

          segment = shim.createSegment({name: 'child', extras: extras})
        })
      })

      it('should copy parameters provided into `segment.parameters`', function() {
        expect(segment).to.have.property('parameters')

        expect(segment.parameters).to.have.property('foo', 'bar')
        expect(segment.parameters).to.have.property('fiz', 'bang')
      })

      it('should copy the `host` and `port` directly onto the segment', function() {
        expect(segment).to.have.property('host', 'my awesome host')
        expect(segment).to.have.property('port', 1234)
      })
    })
  })

  describe('#getName', function() {
    it('should return the `name` property of an object if it has one', function() {
      expect(shim.getName({name: 'foo'})).to.equal('foo')
      expect(shim.getName(function bar() {})).to.equal('bar')
    })

    it('should return "<anonymous>" if the object has no name', function() {
      expect(shim.getName({})).to.equal('<anonymous>')
      expect(shim.getName(function() {})).to.equal('<anonymous>')
    })
  })

  describe('#isObject', function() {
    it('should detect if an item is an object', function() {
      expect(shim.isObject({})).to.be.true
      expect(shim.isObject([])).to.be.true
      expect(shim.isObject(arguments)).to.be.true
      expect(shim.isObject(function() {})).to.be.true
      expect(shim.isObject(true)).to.be.false
      expect(shim.isObject(false)).to.be.false
      expect(shim.isObject('foobar')).to.be.false
      expect(shim.isObject(1234)).to.be.false
      expect(shim.isObject(null)).to.be.false
      expect(shim.isObject(undefined)).to.be.false
    })
  })

  describe('#isFunction', function() {
    it('should detect if an item is a function', function() {
      expect(shim.isFunction({})).to.be.false
      expect(shim.isFunction([])).to.be.false
      expect(shim.isFunction(arguments)).to.be.false
      expect(shim.isFunction(function() {})).to.be.true
      expect(shim.isFunction(true)).to.be.false
      expect(shim.isFunction(false)).to.be.false
      expect(shim.isFunction('foobar')).to.be.false
      expect(shim.isFunction(1234)).to.be.false
      expect(shim.isFunction(null)).to.be.false
      expect(shim.isFunction(undefined)).to.be.false
    })
  })

  describe('#isString', function() {
    it('should detect if an item is a string', function() {
      expect(shim.isString({})).to.be.false
      expect(shim.isString([])).to.be.false
      expect(shim.isString(arguments)).to.be.false
      expect(shim.isString(function() {})).to.be.false
      expect(shim.isString(true)).to.be.false
      expect(shim.isString(false)).to.be.false
      expect(shim.isString('foobar')).to.be.true
      expect(shim.isString(1234)).to.be.false
      expect(shim.isString(null)).to.be.false
      expect(shim.isString(undefined)).to.be.false
    })
  })

  describe('#isNumber', function() {
    it('should detect if an item is a number', function() {
      expect(shim.isNumber({})).to.be.false
      expect(shim.isNumber([])).to.be.false
      expect(shim.isNumber(arguments)).to.be.false
      expect(shim.isNumber(function() {})).to.be.false
      expect(shim.isNumber(true)).to.be.false
      expect(shim.isNumber(false)).to.be.false
      expect(shim.isNumber('foobar')).to.be.false
      expect(shim.isNumber(1234)).to.be.true
      expect(shim.isNumber(null)).to.be.false
      expect(shim.isNumber(undefined)).to.be.false
    })
  })

  describe('#isBoolean', function() {
    it('should detect if an item is a boolean', function() {
      expect(shim.isBoolean({})).to.be.false
      expect(shim.isBoolean([])).to.be.false
      expect(shim.isBoolean(arguments)).to.be.false
      expect(shim.isBoolean(function() {})).to.be.false
      expect(shim.isBoolean(true)).to.be.true
      expect(shim.isBoolean(false)).to.be.true
      expect(shim.isBoolean('foobar')).to.be.false
      expect(shim.isBoolean(1234)).to.be.false
      expect(shim.isBoolean(null)).to.be.false
      expect(shim.isBoolean(undefined)).to.be.false
    })
  })

  describe('#isArray', function() {
    it('should detect if an item is an array', function() {
      expect(shim.isArray({})).to.be.false
      expect(shim.isArray([])).to.be.true
      expect(shim.isArray(arguments)).to.be.false
      expect(shim.isArray(function() {})).to.be.false
      expect(shim.isArray(true)).to.be.false
      expect(shim.isArray(false)).to.be.false
      expect(shim.isArray('foobar')).to.be.false
      expect(shim.isArray(1234)).to.be.false
      expect(shim.isArray(null)).to.be.false
      expect(shim.isArray(undefined)).to.be.false
    })
  })

  describe('#toArray', function() {
    it('should convert array-like objects into arrays', function() {
      var res = ['a', 'b', 'c', 'd']
      expect(shim.toArray(res))
        .to.deep.equal(res)
        .and.be.an.instanceof(Array)

      expect(shim.toArray('abcd'))
        .to.deep.equal(res)
        .and.be.an.instanceof(Array)

      argumentsTest.apply(null, res)
      function argumentsTest() {
        expect(shim.toArray(arguments))
          .to.deep.equal(res)
          .and.be.an.instanceof(Array)
      }
    })
  })

  describe('#normalizeIndex', function() {
    var args = null

    beforeEach(function() {
      args = [1, 2, 3, 4]
    })

    it('should return the index if it is already normal', function() {
      expect(shim.normalizeIndex(args.length, 0)).to.equal(0)
      expect(shim.normalizeIndex(args.length, 1)).to.equal(1)
      expect(shim.normalizeIndex(args.length, 3)).to.equal(3)
    })

    it('should offset negative indexes from the end of the array', function() {
      expect(shim.normalizeIndex(args.length, -1)).to.equal(3)
      expect(shim.normalizeIndex(args.length, -2)).to.equal(2)
      expect(shim.normalizeIndex(args.length, -4)).to.equal(0)
    })

    it('should return `null` for invalid indexes', function() {
      expect(shim.normalizeIndex(args.length, 4)).to.be.null
      expect(shim.normalizeIndex(args.length, 10)).to.be.null
      expect(shim.normalizeIndex(args.length, -5)).to.be.null
      expect(shim.normalizeIndex(args.length, -10)).to.be.null
    })
  })

  describe('#setInternalProperty', function() {
    it('should create a writable, non-enumerable value property', function() {
      // Non enumerable
      var obj = {}
      shim.setInternalProperty(obj, 'foo', 'bar')
      expect(obj).to.have.property('foo', 'bar')
      expect(Object.keys(obj)).to.not.include('foo')

      // Writable
      expect(function() {
        obj.foo = 'fizbang'
      }).to.not.throw()
      expect(obj).to.have.property('foo', 'fizbang')
      expect(Object.keys(obj)).to.not.include('foo')
    })

    it('should not throw if the object has been frozen', function() {
      var obj = {}
      Object.freeze(obj)
      expect(function() {
        'use strict'
        obj.fiz = 'bang'
      }).to.throw()

      expect(function() {
        shim.setInternalProperty(obj, 'foo', 'bar')
      }).to.not.throw()
    })

    it('should not throw if the property has been sealed', function() {
      var obj = {}
      Object.seal(obj)
      expect(function() {
        'use strict'
        obj.fiz = 'bang'
      }).to.throw()

      expect(function() {
        shim.setInternalProperty(obj, 'foo', 'bar')
      }).to.not.throw()
    })
  })

  describe('#defineProperty', function() {
    it('should create an enumerable, configurable property', function() {
      var obj = {}
      shim.defineProperty(obj, 'foo', 'bar')
      var descriptor = Object.getOwnPropertyDescriptor(obj, 'foo')

      expect(descriptor).to.have.property('configurable', true)
      expect(descriptor).to.have.property('enumerable', true)
    })

    it('should create a non-writable property when `value` is not a function', function() {
      var obj = {}
      shim.defineProperty(obj, 'foo', 'bar')
      var descriptor = Object.getOwnPropertyDescriptor(obj, 'foo')

      expect(descriptor).to.have.property('writable', false)
      expect(descriptor).to.not.have.property('get')
      expect(descriptor).to.have.property('value', 'bar')
    })

    it('should create a getter when `value` is a function', function() {
      var obj = {}
      shim.defineProperty(obj, 'foo', function() { return 'bar' })
      var descriptor = Object.getOwnPropertyDescriptor(obj, 'foo')

      expect(descriptor).to.have.property('configurable', true)
      expect(descriptor).to.have.property('enumerable', true)
      expect(descriptor).to.have.property('get').that.is.an.instanceof(Function)
      expect(descriptor).to.not.have.property('value')
    })
  })

  describe('#defineProperties', function() {
    it('should create properties for each key on `props`', function() {
      var obj = {}
      var props = {foo: 'bar', fiz: 'bang'}
      shim.defineProperties(obj, props)

      expect(obj).to.have.property('foo', 'bar')
      expect(obj).to.have.property('fiz', 'bang')
    })
  })
})

function testNonWritable(obj, key, value) {
  // Skip this check on Node 0.8.x.
  if (/^v0\.8\./.test(process.version)) {
    return
  }

  expect(function() {
    obj[key] = 'testNonWritable test value'
  }).to.throw(
    TypeError,
    new RegExp('(read only property \'' + key + '\'|Cannot set property ' + key + ')')
  )

  if (value) {
    expect(obj).to.have.property(key, value)
  } else {
    expect(obj).to.have.property(key)
      .that.is.not.equal('testNonWritable test value')
  }
}
