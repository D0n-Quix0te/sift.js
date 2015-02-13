/*
 * Sift
 *
 * Copryright 2011, Craig Condon
 * Licensed under MIT
 *
 * Inspired by mongodb's query language
 */

(function() {

  /**
   */

  function _convertDotToSubObject(keyParts, value) {

    var subObject    = {};
    var currentValue = subObject;

    for (var i = 0, n = keyParts.length - 1; i < n; i++) {
      currentValue = currentValue[keyParts[i]] = {};
    }

    currentValue[keyParts[i]] = value;

    return subObject;
  }

  /**
   */

  function QueryParser() {

    /**
     * tests against data
     */

    var test = this.test = function(statement, data) {

      var exprs    = statement.exprs;

      //generally, expressions are ordered from least efficient, to most efficient.
      for (var i = 0, n = exprs.length; i < n; i++) {

        var expr = exprs[i];

        if (!expr.e(expr.v, _comparable(data), data)) return false;

      }

      return true;
    };

    /**
     * parses a statement into something evaluable
     */

    var parse = this.parse = function(statement, key) {

      //fixes sift(null, []) issue
      if (!statement) statement = { $eq: statement };

      var testers = [];

      //if the statement is an object, then we're looking at something like: { key: match }
      if (statement && statement.constructor === Object) {

        for (var k in statement) {

          //find the apropriate operator. If one doesn't exist and the key does not start
          //with a $ character, then it's a property, which means we create a new statement
          //(traversing)
          var operator;
          if (!!_testers[k]) {
            operator = k;
          } else if (k.substr(0, 1) !== "$") {
            operator = "$trav";
          } else {
            throw new Error("Unknown operator " + k + ".");
          }

          //value of given statement (the match)
          var value = statement[k];

          //default = match
          var exprValue = value;

          //if we're working with a traversable operator, then set the expr value
          if (TRAV_OP[operator]) {

            //using dot notation? convert into a sub-object
            if (~k.indexOf(".")) {
              var keyParts = k.split(".");
              k = keyParts.shift(); //we're using the first key, so remove it

              exprValue = value = _convertDotToSubObject(keyParts, value);
            }

            //*if* the value is an array, then we're dealing with something like: $or, $and
            if (value instanceof Array) {

              exprValue = [];

              for (var i = value.length; i--;) {
                exprValue.push(parse(value[i]));
              }

            //otherwise we're dealing with $trav
            } else {
              exprValue = parse(value, k);
            }
          }

          testers.push(_getExpr(operator, k, exprValue));
        }

      //otherwise we're comparing a particular value, so set to eq
      } else {
        testers.push(_getExpr("$eq", key, statement));
      }

      var stmt =  {
        exprs: testers,
        k: key,
        test: function(value) {
          return test(stmt, value);
        }
      };

      return stmt;
    };

    //traversable statements
    var TRAV_OP = this.traversable = {
      $and  : true,
      $or   : true,
      $nor  : true,
      $trav : true,
      $not  : true
    };

    function _comparable(value) {
      if (value instanceof Date) {
        return value.getTime();
      } else if (value instanceof Array) {
        return value.map(_comparable);
      } else {
        return value;
      }
    }

    var _testers = this.testers =  {

      /**
       */

      $eq: function(a, b) {
        return a.test(b);
      },

      /**
       */

      $ne: function(a, b) {
        return !a.test(b);
      },

      /**
       */

      $lt: function(a, b) {
        return a > b;
      },

      /**
       */

      $gt: function(a, b) {
        return a < b;
      },

      /**
       */

      $lte: function(a, b) {
        return a >= b;
      },

      /**
       */

      $gte: function(a, b) {
        return a <= b;
      },

      /**
       */

      $exists: function(a, b) {
        return a === (b != null);
      },

      /**
       */

      $in: function(a, b) {

        //intersecting an array
        if (b instanceof Array) {

          for (var i = b.length; i--;) {
            if (~a.indexOf(b[i])) return true;
          }

        } else {
          return ~a.indexOf(b);
        }

        return false;
      },

      /**
       */

      $not: function(a, b) {
        if (!a.test) throw new Error("$not test should include an expression, not a value. Use $ne instead.");
        return !a.test(b);
      },

      /**
       */

      $type: function(a, b, org) {
        //instanceof doesn't work for strings / boolean. instanceof works with inheritance
        return org != null ? org instanceof a || org.constructor == a : false;
      },

      /**
       */

      $nin: function(a, b) {
        return !_testers.$in(a, b);
      },

      /**
       */

      $mod: function(a, b) {
        return b % a[0] == a[1];
      },

      /**
       */

      $all: function(a, b) {
        if (!b) b = [];
        for (var i = a.length; i--;) {
          var a1 = a[i];
          var indexInB = ~b.indexOf(a1);
          if (!indexInB) return false;
        }

        return true;
      },

      /**
       */

      $size: function(a, b) {
        return b ? a === b.length : false;
      },

      /**
       */

      $or: function(a, b) {

        var i = a.length;
        var n = i;

        for (; i--;) {
          if (test(a[i], b)) {
            return true;
          }
        }

        return n === 0;
      },

      /**
       */

      $nor: function(a, b) {

        var i = a.length;

        for (; i--;) {
          if (test(a[i], b)) {
            return false;
          }
        }

        return true;
      },

      /**
       */

      $and: function(a, b) {

        for (var i = a.length; i--;) {
          if (!test(a[i], b)) {
            return false;
          }
        }

        return true;
      },

      /**
       */

      $trav: function(a, b) {

        if (b instanceof Array) {

          for (var i = b.length; i--;) {
            var subb = b[i];
            if (subb[a.k] && test(a, subb[a.k])) return true;
          }

          return false;
        }

        //continue to traverse even if there isn't a value - this is needed for
        //something like name:{$exists:false}
        return test(a, b ? b[a.k] : void 0);
      },

      /**
       */

      $regex: function(a, b) {
        var aRE = new RegExp(a);
        return aRE.test(b);
      },

      /**
       */

      $where: function(a, b) {
        return a.call(b);
      }
    };

    var _prepare = {

      /**
       */

      $eq: function(a) {

        var fn;

        if (a instanceof RegExp) {
          return a;
        } else if (a instanceof Function) {
          fn = a;
        } else {
          fn = function(b) {
            if (b instanceof Array) {
              return ~b.indexOf(a);
            } else {
              return a === b;
            }
          };
        }

        return {
          test: fn
        };
      },

      /**
       */

      $ne: function(a) {
        return _prepare.$eq(a);
      },

       /**
        */

      $where: function(a) {

        if (typeof a === "string") {
          return new Function("return " + a);
        }

        return a;
      }
    };

    function _getExpr(type, key, value) {

      var v = _comparable(value);

      return {

        //k key
        k: key,

        //v value
        v: _prepare[type] ? _prepare[type](v) : v,

        //e eval
        e: _testers[type]
      };
    }
  }

  var _queryParser = new QueryParser();

  var getSelector = function(selector) {

    if (!selector) {

      return function(value) {
        return value;
      };

    } else if (typeof selector == "function") {
      return selector;
    }

    throw new Error("Unknown sift selector " + selector);
  };

  function createSifter(query, selector) {

    //build the filter for the sifter
    var filter = _queryParser.parse(query);

    //the function used to sift through the given array
    var self = function(target) {

      var sifted  = [];
      var testValue;
      var value;

      //I'll typically start from the end, but in this case we need to keep the order
      //of the array the same.
      for (var i = 0, n = target.length; i < n; i++) {

        value = target[i];
        testValue = selector(value);

        if (filter.test(testValue)) sifted.push(value);
      }

      return sifted;
    };

    //set the test function incase the sifter isn't needed
    self.test   = filter.test;
    self.query  = query;

    return self;
  }

  /**
   * sifts the given function
   * @param query the mongodb query
   * @param target the target array
   * @param rawSelector the selector for plucking data from the given target
   */

  function sift(query, target, rawSelector) {

    //must be an array
    if (typeof target != "object") {
      rawSelector = target;
      target = void 0;
    }

    var sft  = createSifter(query, getSelector(rawSelector));

    //target given? sift through it and return the filtered result
    if (target) return sft(target);

    //otherwise return the sifter func
    return sft;
  }

  sift.use = function(options) {
    if (options.operators) sift.useOperators(options.operators);
    if (typeof options === "function") options(sift);
  };

  sift.useOperators = function(operators) {
    for (var key in operators) {
      sift.useOperator(key, operators[key]);
    }
  };

  sift.useOperator = function(operator, optionsOrFn) {

    var options = {};

    if (typeof optionsOrFn == "object") {
      options = optionsOrFn;
    } else {
      options = { test: optionsOrFn };
    }

    var key = "$" + operator;
    _queryParser.testers[key] = options.test;

    if (options.traversable || options.traverse) {
      _queryParser.traversable[key] = true;
    }
  };

  //node.js?
  if ((typeof module != "undefined") && (typeof module.exports != "undefined")) {
    module.exports = sift;
  } else

  //browser?
  if (typeof window != "undefined") {
    window.sift = sift;
  }
})();
