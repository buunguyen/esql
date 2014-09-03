var _ = require('lodash')
  , slice = Array.prototype.slice

module.exports = function(parsed) {
  var args = slice.call(arguments, 1)
  if (!args && !args.length) return parsed
  walk(parsed, args, args.length)
  return parsed
}

function walk(obj, args, remained) {
  if (remained === 0 || !(_.isArray(obj) || _.isObject(obj))) return

  _.each(obj, function (v, i) {
    if (v && _.isNumber(v.$param)) {
      obj[i] = args[v.$param - 1]
      remained--
    }
    else walk(v, args, remained)
  })
}
