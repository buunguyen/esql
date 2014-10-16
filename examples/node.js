var esql = require('esql')

var dsl = esql('from org / documents with ("from": 20, size: 10) \
                filter expired == false, level == 3..5 \
                match name = "foo" (boost: 2), description = "foo bar" (operator: "and") with (minimum_should_match: 1) \
                sort name asc, description')

console.log(JSON.stringify(dsl, null, 2))
