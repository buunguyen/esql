var _ = require('lodash')
  , parse = require('./parser').parse
  , walk = require('./walk')
  , emit = require('./emit')
  , slice = Array.prototype.slice

module.exports = compile
compile.prepare = prepare

function compile(eq) {
  var parsed = parse(eq || '')
  return generate(parsed, slice.call(arguments, 1))
}

function prepare(eq) {
  var parsed = parse(eq || '')
  return function() {
    var clone = _.cloneDeep(parsed)
    return generate(clone, slice.call(arguments))
  }
}

function generate(parsed, args) {
  return emit(walk.apply(null, [parsed].concat(args)))
}
