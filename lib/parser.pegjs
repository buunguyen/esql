{
	//==================== params handling 
	var params = []

	function addParam(num) {
		params.push(num)
	}

	function checkParams() {
		params.sort()
		for (var i = 0; i < params.length-1; i++)
			if ((params[i] + 1) !== params[i + 1])
				throw new Error('Missing parameter $' + (params[i] + 1))
	}
}

start
	= _ e:esql _ { checkParams(); return e }

esql 
	= i:(i:from 	___ { return i } )?
		f:(f:filter ___ { return f } )?
		m:(m:match 	___ { return m } )?
		s:(s:sort 	___ { return s } )? {
			var parsed = {}
			for (var k in i) parsed[k] = i[k]
			parsed.filter = f
			parsed.match = m
			parsed.sort = s
			return parsed
 		}

//==================== from
from 'from' 
	= t_from __ s:scope o:(_ t_with _ o:options { return o })? {
  		s.options = o
  		return s
    }

scope 'scope' 
	= i:refs t:( _ '/' _ t:refs { return t })? { 
			return { index: i, type: t } 
		}

//==================== filter, match
filter 'filter'
	= t_filter __ c:conditions o:(_ t_with _ o:options { return o })? { 
			return {
				filters : c,
				options : o
			}
		}

match 'match' 
	= t_match __ c:conditions o:(_ t_with _ o:options { return o })? { 
			return {
				matches : c,
				options : o
			}
		}

conditions 'conditions' 
	= first:condition rest:(_ ',' _ c:condition { return c })* { 
  		return [first].concat(rest)
		}

condition 'condition' 
	= id:refs _ op:op _ v:value o:(_ o:options { return o })? {
  		return { id: id, op: op, value: v, options: o }
   	}

op 'operator' 
	= '==' { return 'must' }
	/ '!=' { return 'must_not' } 
	/ '='  { return 'should' }

//==================== sort
sort 'sort'
	= t_sort __ s:orders o:(_ t_with _ o:options { return o })? { 
			return {
				sorts   : s,
				options : o
			}
		}

orders 'orders'
	= first:order rest:(_ ',' _ s:order { return s })* { 
  		return [first].concat(rest)
   	}

order 'order'
	= id:ref d:(__ d:direction { return d })? o:(_ o:options { return o })? { 
			return { id: id, order: d, options: o } 
		}

direction 'direction' = t_asc / t_desc

//==================== references
refs 'references(s)' 
	= ref 
	/ '[' _ first:ref rest:( _ ',' _ r:ref { return r })* _ ']' { 
			return [first].concat(rest) 
		}

ref 'references' 
	= !reserved    start:ref_start parts:ref_part*              { return start + parts.join('') }
	/ single_quote start:ref_start parts:ref_part* single_quote { return start + parts.join('') }
	/ double_quote start:ref_start parts:ref_part* double_quote { return start + parts.join('') }

ref_start 'id start symbol'		 
	= [a-zA-Z] / '*' / '_'

ref_part 'id symbol'
	= [a-zA-Z0-9] / '*' / '_' / '^' / '.'

//==================== options
options 'options' 
	= '(' _ first:option rest:(_ ',' _ o:option { return o })* _ ')' { 
			var arr = [first].concat(rest)
			for (var i = 0, obj = {}; i < arr.length; i++) {
				obj[arr[i].key] = arr[i].value
			}
			return obj
		}

option 'option'
	= n:opt _ ':' _ v:value { return { key: n, value: v } } 

opt 'option name'
	= !reserved    chars:opt_part+              { return chars.join('') }
	/ single_quote chars:opt_part+ single_quote { return chars.join('') }
	/ double_quote chars:opt_part+ double_quote { return chars.join('') }

opt_part 'option symbol'
  = [a-zA-Z] / '_'

//==================== reserved
t_from      = 'from'i   !ref_part { return text() }
t_filter    = 'filter'i !ref_part { return text() }
t_match     = 'match'i  !ref_part { return text() }
t_sort      = 'sort'i   !ref_part { return text() }
t_with      = 'with'i   !ref_part { return text() }
t_asc       = 'asc'i    !ref_part { return text() }
t_desc      = 'desc'i   !ref_part { return text() }
t_false     = 'false'i  !ref_part { return false }
t_true      = 'true'i   !ref_part { return true }
t_null      = 'null'i   !ref_part { return null }

reserved 
	= t_from
	/ t_filter
	/ t_match
  / t_sort
  / t_with
	/ t_asc
	/ t_desc
	/ t_true
	/ t_false
	/ t_null

//==================== value
value
  = range
  / array
  / primitive

primitive
  = t_false
  / t_true
  / t_null
  / number
  / string
  / param

//==================== param
param
	= '$' d:digit1_9 (digit)? { 
      var paramNum = parseInt(text().substr(1))
			addParam(paramNum)
      return { $param: paramNum }
		}

//==================== array
array 'array'
  = '[' _
    v:(
      first:primitive
      rest:(_ ',' _ v:primitive { return v })*
      { return [first].concat(rest) }
    )?
    _ ']'
    { return v || [] }

//==================== range
range 'range' 
	= v1:number o:to v2:number { return { start: v1, end: v2, op: o } }
	/ v1:number o:to  				 { return { start: v1 				, op: o } }
	/ 					o:to v2:number { return { 					 end: v2, op: o } }
	/ v1:string o:to v2:string { return { start: v1, end: v2, op: o } }
	/ v1:string o:to  				 { return { start: v1 				, op: o } }
	/ 					o:to v2:string { return { 					 end: v2, op: o } }
to         = (to_exclude / to_include)
to_include = '..'
to_exclude = '...'

//==================== number
number 'number' = minus? int frac? exp? { return parseFloat(text()) }
int 						= zero / (digit1_9 digit*)
decimal_point   = '.'
digit           = [0-9]
digit1_9        = [1-9]
e               = [eE]
exp             = e (minus / plus)? digit+
frac            = decimal_point digit+
minus           = '-'
plus            = '+'
zero            = '0'

//==================== string
string 'string' 
	= single_quote chars:single_char* single_quote { return chars.join('') }
	/ double_quote chars:double_char* double_quote { return chars.join('') }

single_quote    = '\''
double_quote    = '"'

single_char
  = !(single_quote / '\\' / nl) . { return text() }
  / '\\' s:escape_sequence { return s }

double_char
  = !(double_quote / '\\' / nl) . { return text() }
  / '\\' s:escape_sequence { return s }

escape_sequence
  = char_escape_sequence
  / '0' !digit { return '\0' }

char_escape_sequence
  = single_escape_character
  / non_escape_character

single_escape_character
  = "'"
  / '"'
  / '\\'
  / 'b'  { return '\b' }
  / 'f'  { return '\f' }
  / 'n'  { return '\n' }
  / 'r'  { return '\r' }
  / 't'  { return '\t' }
  / 'v'  { return '\v' }

non_escape_character
  = !(escape_character / nl) . { return text() }

escape_character
  = single_escape_character
  / digit

//==================== space
ws 'whitespace' = [ \t\n\r\u00A0\uFEFF]
nl 'newline'    = [\n\r\u2028\u2029] / '\r\n'
_               = (ws / nl)*
__              = (ws / nl)+
___             = __ / EOI
EOI 						= !.
