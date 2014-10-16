var expect = require('chai').expect
  , assert = require('chai').assert
  , eql = require('../lib/esql')

describe('esql', function (){
  it('returns empty object if empty query is supplied', function () {
    var expected = { body: { query: {} } }
    expect(eql()).to.deep.equal(expected)
    expect(eql('')).to.deep.equal(expected)
    expect(eql('   \n   ')).to.deep.equal(expected)
  })

  describe('FROM clause', function () {
    it('parses index', function () {
      var res = eql('from index')
      expect(res.index).to.equal('index')
    })

    it('parses index and type', function () {
      var res = eql('from index / type')
      expect(res.index).to.equal('index')
      expect(res.type).to.equal('type')
    })

    it('parses multiple indices and types', function () {
      var res = eql('from [index1, index*] / [type1, type*]')
      expect(res.index).to.deep.equal(['index1', 'index*'])
      expect(res.type).to.deep.equal(['type1', 'type*'])
    })

    it('parses general options', function () {
      var res = eql('from _ with ("from": 10, size: 20)')
      expect(res.from).to.equal(10)
      expect(res.size).to.equal(20)
    })
  })

  describe('FILTER and MATCH clause', function () {
    ['filter', 'match'].forEach(function (clause) {
      it('parses a single condition', function () {
        var res = eql(clause + ' a = true')
        expect(bool(res).should[term()].a).to.be.true
      })

      it('parses nested field', function () {
        var res = eql(clause + ' a.b = true')
        expect(bool(res).should[term()]['a.b']).to.be.true
      })

      it('parses number', function () {
        var res = eql(clause + ' a = 1.2')
        expect(bool(res).should[term()].a).to.equal(1.2)
      })

      it('parses string', function () {
        var res = eql(clause + ' a = "foo"')
        expect(bool(res).should[term()].a).to.equal('foo')

        var res = eql(clause + ' a = \'foo\'')
        expect(bool(res).should[term()].a).to.equal('foo')
      })
      
      it('parses inclusive range', function () {
        var res = eql(clause + ' a = 1..2')
        expect(bool(res).should.range).to.deep.equal({
          a: {
            gte: 1,
            lte: 2
          }
        })
      })
      
      it('parses exclusive range', function () {
        var res = eql(clause + ' a = "date1"..."date2"')
        expect(bool(res).should.range).to.deep.equal({
          a: {
            gte: "date1",
            lt: "date2"
          }
        })
      })

      it('parses multiple conditions', function () {
        var res = eql(clause + ' a = true, b = true')
        expect(bool(res).should.length).to.equal(2)
        expect(bool(res).should[0][term()].a).to.equal(true)
        expect(bool(res).should[1][term()].b).to.equal(true)
      })

      it('distinguishes among operators', function () {
        var res = eql(clause + ' a = 1, b == 2, c != 3, d != 4')
        expect(bool(res).should[term()].a).to.equal(1)
        expect(bool(res).must[term()].b).to.equal(2)
        expect(bool(res).must_not[0][term()].c).to.equal(3)
        expect(bool(res).must_not[1][term()].d).to.equal(4)
      })

      function term() { 
        return clause === 'filter' ? 'term' : 'match' 
      }
      
      function bool(res) {
        return clause === 'filter' ? res.body.query.filtered.filter.bool : res.body.query.bool
      }
    })
  })

  describe('FILTER clause special', function () {
    it('parses multiple filters (shortcut)', function () {
      var res = eql('filter [a, b] = true')
      expect(bool(res).should.length).to.equal(2)
      expect(bool(res).should[0].term.a).to.equal(true)
      expect(bool(res).should[1].term.b).to.equal(true)
    })   

    it('parses terms', function () {
      var res = eql('filter a = [1, 2]')
      expect(bool(res).should.terms.a).to.deep.equal([1, 2])
    })

    it('parses with options', function () {
      var res = eql('filter a = true (o: 1), b = true (o: 2) with (o: 3)')
      expect(bool(res).should[0].term.o).to.equal(1)
      expect(bool(res).should[1].term.o).to.equal(2)
      expect(bool(res).o).to.equal(3)
    })

    function bool(res) {
      return res.body.query.filtered.filter.bool
    }
  })

  describe('MATCH clause special', function () {
    it('parses with options', function () {
      var res = eql('match a = true (o: 1), b = true (o: 2) with (o: 3)')
      expect(res.body.query).to.deep.equal({
        bool: {
          should: [
            { match: { a: { query: true, o: 1 } } },
            { match: { b: { query: true, o: 2 } } }
          ],
          o: 3
        }
      })
    })

    it('parses multi_match', function () {
      var res = eql('match [a, b] = true (type: "most_fields")')
      expect(res.body.query.bool.should.multi_match).to.deep.equal({
        fields : ['a', 'b'],
        query  : true,
        type   : 'most_fields'
      })
    })
    
    it('parses filtered query', function () {
      var res = eql('filter a = 1 match b = 2')
      expect(res.body.query.filtered.query.bool.should.match.b).to.equal(2)
    })
  })

  describe('SORT clause', function () {
    it('parses multiple sorts', function () {
      var res = eql('sort offer.price asc (mode: "avg"), name')
      expect(res.body.sort).to.deep.equal([
        { 'offer.price': {
            order : 'asc',
            mode  : 'avg'
          }
        },
        { name: {
            order : null
          }
        }
      ])
    })
  })

  describe('Parameterization', function () {
    it('allows parameterize queries', function () {
      var res = eql('filter a = $1 match b = $2 (boost: $3)', true, 'foo', 2)
      expect(res.body.query.filtered.filter.bool.should.term.a).to.equal(true)
      expect(res.body.query.filtered.query.bool.should.match.b.query).to.equal('foo')
      expect(res.body.query.filtered.query.bool.should.match.b.boost).to.equal(2)
    })

    it('allows parameterize array elements', function () {
      var res = eql('filter a = [1, $1]', 2)
      expect(res.body.query.filtered.filter.bool.should.terms.a).to.deep.equal([1, 2])
    })
  })

  describe('Precompilation', function () {
    it('precompiles for reuse', function () {
      var fn = eql.prepare('filter a = true')
      var res = fn()
      expect(res.body.query.filtered.filter.bool.should.term.a).to.equal(true)
    })

    it('precompiles queries with parameters', function () {
      var fn = eql.prepare('filter a = $1')
      
      var res = fn(true)
      expect(res.body.query.filtered.filter.bool.should.term.a).to.equal(true)

      var res = fn(false)
      expect(res.body.query.filtered.filter.bool.should.term.a).to.equal(false)
    })
  })

  function json(obj) { console.log(JSON.stringify(obj, null, 2)) }
})
