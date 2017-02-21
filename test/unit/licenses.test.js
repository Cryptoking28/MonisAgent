'use strict'

var a = require('async')
var expect = require('chai').expect
var fs = require('fs')
var licenses = require('./licenses')
var path = require('path')
var pkg = require('../../package')
var semver = require('semver')


var MODULE_DIR = path.resolve(__dirname, '../../node_modules')

// This package doesn't support Node <0.12 so it wont be found.
if (semver.satisfies(process.version, '<0.12')) {
  delete licenses['@monisagent/native-metrics']
  delete pkg.optionalDependencies['@monisagent/native-metrics']
}


describe('Agent licenses', function() {
  this.timeout(5000)
  it('should all be accounted for in LICENSES object', function(done) {
    if (semver.satisfies(process.version, '<=0.8')) {
      this.skip()
    }

    var deps = Object.keys(pkg.dependencies || {})
    deps.push.apply(deps, Object.keys(pkg.optionalDependencies || {}))
    a.map(deps, function(dep, cb) {
      a.waterfall([
        function(cb) {
          fs.readFile(path.join(MODULE_DIR, dep, 'package.json'), {encoding: 'utf8'}, cb)
        },
        function(depPackage, cb) {
          try {
            var parsedPackage = JSON.parse(depPackage)
            var license = parsedPackage.license || parsedPackage.licenses
            setImmediate(function() {
              cb(null, [dep, license])
            })
          } catch (e) {
            cb(e)
          }
        }
      ], cb)
    }, function(err, depLicensesArray) {
      expect(err).to.not.exist()
      var depLicenses = depLicensesArray.reduce(function(obj, dep) {
        obj[dep[0]] = dep[1]
        return obj
      }, {})

      expect(depLicenses).to.deep.equal(licenses)
      done()
    })
  })
})
