### ESQL (Elasticsearch Query Language)

Elasticsearch is powerful, so is its Query DSL. But Elasticsearch Query DSL's power comes at a cost: complexity. Even the simplest queries can be verbose and difficult to write. ESQL simplifies the construction of Query DSL by compiling queries written in an SQL-like language to Elasticsearch DSL. By only supporting essential features of the Query DSL, ESQL queries can be kept very simple.

The output of ESQL can be used directly as the search argument of [elasticsearch-js](https://github.com/elasticsearch/elasticsearch-js). However, you may pick different portions should you use another mechanism to connect to Elasticsearch. You can also augment the output however you like. Therefore, you are not locked in to only the features supported by ESQL.

ESQL can be used in both Node and browser environments.

#### Features

* Scope: specify indices, types and options
* Filter: `term`, `terms`, `range`
* Query: `match`, `multi_match`, `range`
* Filter/query group: `must`, `should`, `must_not`
* Sort: `sort`, `asc`, `desc`
* Data types: `boolean`, `number`, `string`/`date`, `array`, `null`
* Options can be specified at each level of granularity
* Query parameterization and precompilation
* More to come...

**Note:** this is an early release of ESQL, expect the language itself and possibly the API to change. Oh yes, and bugs too. Bug reports and pull requests are very welcome.


### Getting started
Install ESQL from NPM or Bower
```
npm install --save esql
```

```
bower install --save esql
```

Import `esql` object in Node
```javascript
var esql = require('esql')
```

Import `esql` object in browser (after referencing `browser/esql.min.js`)

```javascript
var esql = window.esql
```

Build DSL query
```javascript
var query = 'ESQL QUERY HERE'
var dsl = esql(query)
```

Parameterize queries
```javascript
var dsl = esql('match name = $1, age = $2', name, age)
```

Precompile queries
```javascript
var fn = esql.prepare('match name = $1, age = $2')
var dsl = fn(name, age)
```

Consume DSL query with [elasticsearch-js](https://github.com/elasticsearch/elasticsearch-js)
```javascript
var client = new es.Client({...})
client.search(dsl).then(callback, errback)
```

#### Example

```javascript
var dsl = esql(
  'from org / documents with ("from": 20, size: 10) \
   filter expired == false, level == 3..5 \
   match name = "foo" (boost: 2), description = "foo bar" (operator: "and") with (minimum_should_match: 1) \
   sort name asc, description')
```

The resulting `dsl` object is:

```json
{
  "body": {
    "query": {
      "filtered": {
        "filter": {
          "bool": {
            "must": [
              {
                "term": {
                  "expired": false
                }
              },
              {
                "range": {
                  "level": {
                    "gte": 3,
                    "lte": 5
                  }
                }
              }
            ]
          }
        },
        "query": {
          "bool": {
            "minimum_should_match": 1,
            "should": [
              {
                "match": {
                  "name": {
                    "boost": 2,
                    "query": "foo"
                  }
                }
              },
              {
                "match": {
                  "description": {
                    "operator": "and",
                    "query": "foo bar"
                  }
                }
              }
            ]
          }
        }
      }
    },
    "sort": [
      {
        "name": {
          "order": "asc"
        }
      },
      {
        "description": {
          "order": null
        }
      }
    ]
  },
  "index": "org",
  "type": "documents",
  "from": 20,
  "size": 10
}
```

The `dsl` object can be fed directly to [elasticsearch-js](https://github.com/elasticsearch/elasticsearch-js). Or you can just use its `body` property as POST data for your own Elasticsearch query mechanism.


### Syntax Reference

#### Basics

ESQL is case insensitive. Spaces and newlines are skipped so you can have as many of them. All clauses are optional although if specified, they must follow this order: `from`, `filter`, `query`, `sort`.

Filter/query groups are made possible with these mappings:

* `=` is mapped to `should`
* `==` is mapped to `must`
* `!=` is mapped to `must_not`

Range filters and queries are supported with range syntax:

* from..to => from `from` to `to` inclusively
* from...to => from `from` to `to` exclusively
* Either `from` or `to` can be optional

Options can be specified for each filter, match, sort condition or the entire group. Option names and values are not type-checked or validated in anyway whatsoever. This makes the language simple and flexible but requires you to learn about the available options.


#### FROM clause

Use the `from` clause to specify indices, types and general query options.

Example 1: index only
```
from index1
```

Example 2: index and type
```
from index1 / type1
```

Example 3: multiple indices and types (including wildcard match)
```
from [index1, index2] / [type1, type2, moretype*]
```

Example 4: query options, note that `from` option needs escaping
```
from index / type with ('from': 10, size: 100)
```

#### FILTER clause

Use the `filter` clause to create filters.

Example 1: term search
```
filter tags = 'foo'
```

Example 2: terms search
```
filter tags = ['foo', 'bar']
```

Example 3: multiple filters
```
filter tags = 'foo', expired = false
```


#### MATCH clause

Use the `match` clause to create queries.

Example 1: single match
```
match name = 'foo' // => match
```

Example 2: multi-match
```
match [name, description] = 'foo' // => multi_match
```

Example 3: multiple matches with options
```
match name = 'foo' (boost: 2), description = 'foo bar' (minimum_should_match: 1)
```


#### SORT clause

Use the `sort` clause to specify sort fields and directions

Example
```
sort name asc, age desc
```
