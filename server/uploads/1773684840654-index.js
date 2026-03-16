/*!
 * Module dependencies.
 */

'use strict';

const mongooseArrayMethods = require('./methods');

const arrayAtomicsSymbol = require('../../helpers/symbols').arrayAtomicsSymbol;
const arrayAtomicsBackupSymbol = require('../../helpers/symbols').arrayAtomicsBackupSymbol;
const arrayParentSymbol = require('../../helpers/symbols').arrayParentSymbol;
const arrayPathSymbol = require('../../helpers/symbols').arrayPathSymbol;
const arraySchemaSymbol = require('../../helpers/symbols').arraySchemaSymbol;

/**
 * Mongoose Array constructor.
 *
 * #### Note:
 *
 * _Values always have to be passed to the constructor to initialize, otherwise `MongooseArray#push` will mark the array as modified._
 *
 * @param {Array} values
 * @param {String} path
 * @param {Document} doc parent document
 * @api private
 * @inherits Array https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array
 * @see https://bit.ly/f6CnZU
 */
const _basePush = Array.prototype.push;
const numberRE = /^\d+$/;

function MongooseArray(values, path, doc, schematype) {
  let __array;

  if (Array.isArray(values)) {
    const len = values.length;

    // Perf optimizations for small arrays: much faster to use `...` than `for` + `push`,
    // but large arrays may cause stack overflows. And for arrays of length 0/1, just
    // modifying the array is faster. Seems small, but adds up when you have a document
    // with thousands of nested arrays.
    if (len === 0) {
      __array = new Array();
    } else if (len === 1) {
      __array = new Array(1);
      __array[0] = values[0];
    } else if (len < 10000) {
      __array = new Array();
      _basePush.apply(__array, values);
    } else {
      __array = new Array();
      for (let i = 0; i < len; ++i) {
        _basePush.call(__array, values[i]);
      }
    }
  } else {
    __array = [];
  }

  const internals = {
    [arrayAtomicsSymbol]: {},
    [arrayAtomicsBackupSymbol]: void 0,
    [arrayPathSymbol]: path,
    [arraySchemaSymbol]: schematype,
    [arrayParentSymbol]: void 0,
    isMongooseArray: true,
    isMongooseArrayProxy: true,
    __array: __array
  };

  if (values && values[arrayAtomicsSymbol] != null) {
    internals[arrayAtomicsSymbol] = values[arrayAtomicsSymbol];
  }

  if (doc != null && doc.$__) {
    internals[arrayParentSymbol] = doc;
    internals[arraySchemaSymbol] = schematype || doc.schema.path(path);
  }

  const proxy = new Proxy(__array, {
    get: function(target, prop) {
      if (internals.hasOwnProperty(prop)) {
        return internals[prop];
      }
      if (mongooseArrayMethods.hasOwnProperty(prop)) {
        return mongooseArrayMethods[prop];
      }
      if (schematype && schematype.virtuals && schematype.virtuals.hasOwnProperty(prop)) {
        return schematype.virtuals[prop].applyGetters(undefined, target);
      }
      if (typeof prop === 'string' && numberRE.test(prop) && schematype?.$embeddedSchemaType != null) {
        return schematype.$embeddedSchemaType.applyGetters(__array[prop], doc);
      }

      return __array[prop];
    },
    set: function(target, prop, value) {
      if (typeof prop === 'string' && numberRE.test(prop)) {
        mongooseArrayMethods.set.call(proxy, prop, value, false);
      } else if (internals.hasOwnProperty(prop)) {
        internals[prop] = value;
      } else if (schematype && schematype.virtuals && schematype.virtuals.hasOwnProperty(prop)) {
        schematype.virtuals[prop].applySetters(value, target);
      } else {
        __array[prop] = value;
      }

      return true;
    }
  });

  return proxy;
}

/*!
 * Module exports.
 */

module.exports = exports = MongooseArray;
dedDocument|null} the subdocument or null if not found.
   * @param {ObjectId|String|Number|Buffer} id
   * @method id
   * @api public
   * @memberOf MongooseDocumentArray
   */

  id(id) {
    if (id == null) {
      return null;
    }

    const schemaType = this[arraySchemaSymbol];
    let idSchemaType = null;

    if (schemaType && schemaType.schema) {
      idSchemaType = schemaType.schema.path('_id');
    } else if (schemaType && schemaType.casterConstructor && schemaType.casterConstructor.schema) {
      idSchemaType = schemaType.casterConstructor.schema.path('_id');
    }

    let castedId = null;
    if (idSchemaType) {
      try {
        castedId = idSchemaType.cast(id);
      } catch (_err) {}
    }

    let _id;

    for (const val of this) {
      if (!val) {
        continue;
      }

      _id = val.get('_id');

      if (_id == null) {
        continue;
      } else if (_id instanceof Document) {
        _id = _id.get('_id');
        if (castedId != null && utils.deepEqual(castedId, _id)) {
          return val;
        } else if (castedId == null && (id == _id || utils.deepEqual(id, _id))) {
          // Backwards compat: compare user-specified param to _id using loose equality
          return val;
        }
      } else if (castedId != null && utils.deepEqual(castedId, _id)) {
        return val;
      } else if (castedId == null && (_id == id || utils.deepEqual(id, _id))) {
        // Backwards compat: compare user-specified param to _id using loose equality
        return val;
      }
    }

    return null;
  },

  /**
   * Returns a native js Array of plain js objects
   *
   * #### Note:
   *
   * _Each sub-document is converted to a plain object by calling its `#toObject` method._
   *
   * @param {Object} [options] optional options to pass to each documents `toObject` method call during conversion
   * @return {Array}
   * @method toObject
   * @api public
   * @memberOf MongooseDocumentArray
   */

  toObject(options) {
    // `[].concat` coerces the return value into a vanilla JS array, rather
    // than a Mongoose array.
    return [].concat(this.map(function(doc) {
      if (doc == null) {
        return null;
      }
      if (typeof doc.toObject !== 'function') {
        return doc;
      }
      return doc.toObject(options);
    }));
  },

  $toObject() {
    return this.constructor.prototype.toObject.apply(this, arguments);
  },

  /**
   * Wraps [`Array#push`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/push) with proper change tracking.
   *
   * @param {...Object} [args]
   * @api public
   * @method push
   * @memberOf MongooseDocumentArray
   */

  push() {
    const ret = ArrayMethods.push.apply(this, arguments);

    _updateParentPopulated(this);

    return ret;
  },

  /**
   * Pulls items from the array atomically.
   *
   * @param {...Object} [args]
   * @api public
   * @method pull
   * @memberOf MongooseDocumentArray
   */

  pull() {
    const ret = ArrayMethods.pull.apply(this, arguments);

    _updateParentPopulated(this);

    return ret;
  },

  /**
   * Wraps [`Array#shift`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/unshift) with proper change tracking.
   * @api private
   */

  shift() {
    const ret = ArrayMethods.shift.apply(this, arguments);

    _updateParentPopulated(this);

    return ret;
  },

  /**
   * Wraps [`Array#splice`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/splice) with proper change tracking and casting.
   * @api private
   */

  splice() {
    const ret = ArrayMethods.splice.apply(this, arguments);

    _updateParentPopulated(this);

    return ret;
  },

  /**
   * Helper for console.log
   *
   * @method inspect
   * @api public
   * @memberOf MongooseDocumentArray
   */

  inspect() {
    return this.toObject();
  },

  /**
   * Creates a subdocument casted to this schema.
   *
   * This is the same subdocument constructor used for casting.
   *
   * @param {Object} obj the value to cast to this arrays SubDocument schema
   * @method create
   * @api public
   * @memberOf MongooseDocumentArray
   */

  create(obj) {
    let Constructor = this[arraySchemaSymbol].casterConstructor;
    if (obj &&
        Constructor.discriminators &&
        Constructor.schema &&
        Constructor.schema.options &&
        Constructor.schema.options.discriminatorKey) {
      if (typeof obj[Constructor.schema.options.discriminatorKey] === 'string' &&
          Constructor.discriminators[obj[Constructor.schema.options.discriminatorKey]]) {
        Constructor = Constructor.discriminators[obj[Constructor.schema.options.discriminatorKey]];
      } else {
        const constructorByValue = getDiscriminatorByValue(Constructor.discriminators, obj[Constructor.schema.options.discriminatorKey]);
        if (constructorByValue) {
          Constructor = constructorByValue;
        }
      }
    }

    return new Constructor(obj, this);
  },

  /*!
   * ignore
   */

  notify(event) {
    const _this = this;
    return function notify(val, _arr) {
      _arr = _arr || _this;
      let i = _arr.length;
      while (i--) {
        if (_arr[i] == null) {
          continue;
        }
        switch (event) {
          // only swap for save event for now, we may change this to all event types later
          case 'save':
            val = _this[i];
            break;
          default:
            // NO-OP
            break;
        }

        if (utils.isMongooseArray(_arr[i])) {
          notify(val, _arr[i]);
        } else if (_arr[i]) {
          _arr[i].emit(event, val);
        }
      }
    };
  },

  set(i, val, skipModified) {
    const arr = this.__array;
    if (skipModified) {
      arr[i] = val;
      return this;
    }
    const value = methods._cast.call(this, val, i);
    methods._markModified.call(this, i);
    arr[i] = value;
    return this;
  },

  _markModified(elem, embeddedPath) {
    const parent = this[arrayParentSymbol];
    let dirtyPath;

    if (parent) {
      dirtyPath = this[arrayPathSymbol];

      if (arguments.length) {
        if (embeddedPath != null) {
          // an embedded doc bubbled up the change
          const index = elem.__index;
          dirtyPath = dirtyPath + '.' + index + '.' + embeddedPath;
        } else {
          // directly set an index
          dirtyPath = dirtyPath + '.' + elem;
        }
      }

      if (dirtyPath != null && dirtyPath.endsWith('.$')) {
        return this;
      }

      parent.markModified(dirtyPath, arguments.length !== 0 ? elem : parent);
    }

    return this;
  }
};

module.exports = methods;

/**
 * If this is a document array, each element may contain single
 * populated paths, so we need to modify the top-level document's
 * populated cache. See gh-8247, gh-8265.
 * @param {Array} arr
 * @api private
 */

function _updateParentPopulated(arr) {
  const parent = arr[arrayParentSymbol];
  if (!parent || parent.$__.populated == null) return;

  const populatedPaths = Object.keys(parent.$__.populated).
    filter(p => p.startsWith(arr[arrayPathSymbol] + '.'));

  for (const path of populatedPaths) {
    const remnant = path.slice((arr[arrayPathSymbol] + '.').length);
    if (!Array.isArray(parent.$__.populated[path].value)) {
      continue;
    }

    parent.$__.populated[path].value = arr.map(val => val.$populated(remnant));
  }
}
