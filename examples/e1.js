var esql = require('../lib/esql')

var dsl = esql('from org / documents with ("from": 20, size: 10) \
                filter expired == false, level == 3..5 \
                match name = "foo" (boost: 2), description = "bar"')

json(dsl)

function json(obj) { console.log(JSON.stringify(obj, null, 2)) }
