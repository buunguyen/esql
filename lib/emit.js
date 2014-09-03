var _ = require('lodash')

module.exports = function (parsed) {
  var query = { body: { query: {} } }
  _.each([from, filter, match, sort], function (f) { f(query, parsed) })
  return query
}

function from(query, parsed) {
  if (parsed.index) query.index = parsed.index
  if (parsed.type) query.type = parsed.type
  _.each(parsed.options, function (v, k) { query[k] = v })
}

function filter(query, parsed) {
  if (!parsed.filter) return

  var filters  = parsed.filter.filters
    , options  = parsed.filter.options
    , groups   = _.groupBy(filters, function (f) { return f.op })
    , bool     = (query.body.query.filtered = { filter: { bool: {} } }).filter.bool
    
  _.extend(bool, options)
  _.each(groups, function (conds, op) {
    conds = esConds(expandMulti(conds))
    bool[op] = conds.length > 1 ? conds : conds[0]
  })
  
  // [a, b = 1] -> a = 1, b = 1
  function expandMulti(conds) {
    return _.flatten(_.map(conds, function (c) {
      if (_.isArray(c.id)) {
        return _.map(c.id, function (id) {
          return _.extend({}, c, { id: id })
        })
      }
      else return c
    }))
  }

  function esConds(conds) {
    return _.map(conds, function (c) {
      var esCond = {}
        , range  = getRange(c.value)
        , type   = range ? 'range' : _.isArray(c.value) ? 'terms' : 'term'
      
      esCond[type] = {}
      esCond[type][c.id] = range || c.value
      _.extend(esCond[type], c.options)
      return esCond
    })
  }
}

function match(query, parsed) {
  if (!parsed.match) return 

  var matches = parsed.match.matches
    , options = parsed.match.options
    , groups  = _.groupBy(matches, function (f) { return f.op })
    , bool

  if (parsed.filter) query.body.query.filtered.query = { bool: bool = {} }
  else query.body.query = { bool: bool = {} }
 
  _.extend(bool, options)
  _.each(groups, function (conds, op) {
    conds = esConds(conds)
    bool[op] = conds.length > 1 ? conds : conds[0]
  })

  function esConds(conds) {
    return _.map(conds, function (c) {
      var esCond = {}

      if (_.isArray(c.id)) {
        esCond.multi_match = { // jshint ignore:line
          fields : c.id,
          query  : c.value
        }
        _.extend(esCond.multi_match, c.options) // jshint ignore:line
      }
      
      else {
        var range = getRange(c.value)
          , value = range || c.value
          , type = range ? 'range' : 'match'

        esCond[type] = {}
        esCond[type][c.id] = c.options 
          ? _.extend({}, c.options, { query : value })
          : value
      }

      return esCond
    })
  }
}

function sort(query, parsed) {
  if (!parsed.sort) return

  query.body.sort = _.map(parsed.sort.sorts, function (s) {
    var res = {}
    res[s.id] = { order: s.order }
    _.extend(res[s.id], s.options)
    return res
  })

  // TODO: use parsed.sort.options?
}

function getRange(v) {
  if (_.isPlainObject(v) && v.op && (v.start || v.end)) {
    var range = {}
    if (v.start) range.gte = v.start
    if (v.end) range[v.op === '..' ? 'lte' : 'lt'] = v.end
    return range
  }
}
