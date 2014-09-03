### ESQL (Elasticsearch Query Language)

Elasticsearch is powerful, so is its DSL. But like most things, power comes at a cost: complexity. Even the simplest DSL queries are verbose and difficult to write. EQL is the answer.

ESQL compiles queries written in SQL-like syntax to Elasticsearch DSL. By only supporting common features of the Elasticsearch DSL, ESQL queries can be kept very smiple.

Because the output of ESQL is a full-blown Elasticsearch DSL tree, you can augment the tree however you like. For example, you can modify the tree to add behaviors not supported by ESQL. Therefore, you are not locked in to only the features supported by ESQL.

### Getting started
Install ESQL
```
npm install esql
```

Build DSL tree
```javascript
var esql = require('esql')
var query = 'esql query'
var dsl = esql(query)
```

Consume DSL tree with [elasticsearch-js](https://github.com/elasticsearch/elasticsearch-js)
```javascript
var es = require('elasticsearch')
var client = new es.Client({...})
client.search(dsl).then(callback, errback)
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

### Example

```
esql('from org / documents with ("from": 20, size: 10) \
      filter expired == false, level == 3..5 \
      match name = "foo" (boost: 2), description = "bar"')
```
results in the following DSL:
```json
{
  "body": {
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
                "description": "bar"
              }
            }
          ]
        }
      }
    }
  },
  "index": "org",
  "type": "documents",
  "from": 20,
  "size": 10
}
```


### Syntax Reference

* ESQL is case insensitive
* All clauses are optional
* `=` is mapped to DSL `should`
* `==` is mapped to DSL `must`
* `!=` is mapped to DSL `must_not`
* Data types: boolean, number, string, arrays, null
* Range filters and queries are supported with range syntax:
 * from..to => from `from` to `to` inclusively
 * from...to => from `from` to `to` exclusively
 * Either `from` or `to` can be optional


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

Use the `filter` clause to create filters and filtered queries.

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

Use the `filter` clause to create queries.

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
