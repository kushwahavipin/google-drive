/**
 * Export lib/mongoose
 *
 */

'use strict';

const mongoose = require('./lib/');

module.exports = mongoose;
module.exports.default = mongoose;
module.exports.mongoose = mongoose;

// Re-export for ESM support
module.exports.cast = mongoose.cast;
module.exports.STATES = mongoose.STATES;
module.exports.setDriver = mongoose.setDriver;
module.exports.set = mongoose.set;
module.exports.get = mongoose.get;
module.exports.createConnection = mongoose.createConnection;
module.exports.connect = mongoose.connect;
module.exports.disconnect = mongoose.disconnect;
module.exports.startSession = mongoose.startSession;
module.exports.pluralize = mongoose.pluralize;
module.exports.model = mongoose.model;
module.exports.deleteModel = mongoose.deleteModel;
module.exports.modelNames = mongoose.modelNames;
module.exports.plugin = mongoose.plugin;
module.exports.connections = mongoose.connections;
module.exports.version = mongoose.version;
module.exports.Aggregate = mongoose.Aggregate;
module.exports.Mongoose = mongoose.Mongoose;
module.exports.Schema = mongoose.Schema;
module.exports.SchemaType = mongoose.SchemaType;
module.exports.SchemaTypes = mongoose.SchemaTypes;
module.exports.VirtualType = mongoose.VirtualType;
module.exports.Types = mongoose.Types;
module.exports.Query = mongoose.Query;
module.exports.Model = mongoose.Model;
module.exports.Document = mongoose.Document;
module.exports.ObjectId = mongoose.ObjectId;
module.exports.isValidObjectId = mongoose.isValidObjectId;
module.exports.isObjectIdOrHexString = mongoose.isObjectIdOrHexString;
module.exports.syncIndexes = mongoose.syncIndexes;
module.exports.Decimal128 = mongoose.Decimal128;
module.exports.Mixed = mongoose.Mixed;
module.exports.Date = mongoose.Date;
module.exports.Number = mongoose.Number;
module.exports.Error = mongoose.Error;
module.exports.MongooseError = mongoose.MongooseError;
module.exports.now = mongoose.now;
module.exports.CastError = mongoose.CastError;
module.exports.SchemaTypeOptions = mongoose.SchemaTypeOptions;
module.exports.mongo = mongoose.mongo;
module.exports.mquery = mongoose.mquery;
module.exports.sanitizeFilter = mongoose.sanitizeFilter;
module.exports.trusted = mongoose.trusted;
module.exports.skipMiddlewareFunction = mongoose.skipMiddlewareFunction;
module.exports.overwriteMiddlewareResult = mongoose.overwriteMiddlewareResult;

// The following properties are not exported using ESM because `setDriver()` can mutate these
// module.exports.connection = mongoose.connection;
// module.exports.Collection = mongoose.Collection;
// module.exports.Connection = mongoose.Connection;
m[part];
    }

    if (!obj) return map(obj);
  }

  return map(obj);
};

/**
 * Returns true if `in` returns true for every piece of the path
 *
 * @param {String} path
 * @param {Object} o
 */

exports.has = function(path, o) {
  var parts = typeof path === 'string' ?
    stringToParts(path) :
    path;

  if (!Array.isArray(parts)) {
    throw new TypeError('Invalid `path`. Must be either string or array');
  }

  var len = parts.length;
  var cur = o;
  for (var i = 0; i < len; ++i) {
    if (typeof parts[i] !== 'string' && typeof parts[i] !== 'number') {
      throw new TypeError('Each segment of path to `has()` must be a string or number, got ' + typeof parts[i]);
    }
    if (cur == null || typeof cur !== 'object' || !(parts[i] in cur)) {
      return false;
    }
    cur = cur[parts[i]];
  }

  return true;
};

/**
 * Deletes the last piece of `path`
 *
 * @param {String} path
 * @param {Object} o
 */

exports.unset = function(path, o) {
  var parts = typeof path === 'string' ?
    stringToParts(path) :
    path;

  if (!Array.isArray(parts)) {
    throw new TypeError('Invalid `path`. Must be either string or array');
  }

  var len = parts.length;
  var cur = o;
  for (var i = 0; i < len; ++i) {
    if (cur == null || typeof cur !== 'object' || !(parts[i] in cur)) {
      return false;
    }
    if (typeof parts[i] !== 'string' && typeof parts[i] !== 'number') {
      throw new TypeError('Each segment of path to `unset()` must be a string or number, got ' + typeof parts[i]);
    }
    // Disallow any updates to __proto__ or special properties.
    if (ignoreProperties.indexOf(parts[i]) !== -1) {
      return false;
    }
    if (i === len - 1) {
      delete cur[parts[i]];
      return true;
    }
    cur = cur instanceof Map ? cur.get(parts[i]) : cur[parts[i]];
  }

  return true;
};

/**
 * Sets the `val` at the given `path` of object `o`.
 *
 * @param {String} path
 * @param {Anything} val
 * @param {Object} o
 * @param {String} [special] When this property name is present on any object in the path, walking will continue on the value of this property.
 * @param {Function} [map] Optional function which is passed each individual value before setting it. The value returned from `map` is used in the original values place.
 */

exports.set = function(path, val, o, special, map, _copying) {
  var lookup;

  if ('function' == typeof special) {
    if (special.length < 2) {
      map = special;
      special = undefined;
    } else {
      lookup = special;
      special = undefined;
    }
  }

  map || (map = K);

  var parts = 'string' == typeof path
    ? stringToParts(path)
    : path;

  if (!Array.isArray(parts)) {
    throw new TypeError('Invalid `path`. Must be either string or array');
  }

  if (null == o) return;

  for (var i = 0; i < parts.length; ++i) {
    if (typeof parts[i] !== 'string' && typeof parts[i] !== 'number') {
      throw new TypeError('Each segment of path to `set()` must be a string or number, got ' + typeof parts[i]);
    }
    // Silently ignore any updates to `__proto__`, these are potentially
    // dangerous if using mpath with unsanitized data.
    if (ignoreProperties.indexOf(parts[i]) !== -1) {
      return;
    }
  }

  // the existance of $ in a path tells us if the user desires
  // the copying of an array instead of setting each value of
  // the array to the one by one to matching positions of the
  // current array. Unless the user explicitly opted out by passing
  // false, see Automattic/mongoose#6273
  var copy = _copying || (/\$/.test(path) && _copying !== false),
      obj = o,
      part;

  for (var i = 0, len = parts.length - 1; i < len; ++i) {
    part = parts[i];

    if ('$' == part) {
      if (i == len - 1) {
        break;
      } else {
        continue;
      }
    }

    if (Array.isArray(obj) && !/^\d+$/.test(part)) {
      var paths = parts.slice(i);
      if (!copy && Array.isArray(val)) {
        for (var j = 0; j < obj.length && j < val.length; ++j) {
          // assignment of single values of array
          exports.set(paths, val[j], obj[j], special || lookup, map, copy);
        }
      } else {
        for (var j = 0; j < obj.length; ++j) {
          // assignment of entire value
          exports.set(paths, val, obj[j], special || lookup, map, copy);
        }
      }
      return;
    }

    if (lookup) {
      obj = lookup(obj, part);
    } else {
      var _to = special && obj[special] ? obj[special] : obj;
      obj = _to instanceof Map ?
        _to.get(part) :
        _to[part];
    }

    if (!obj) return;
  }

  // process the last property of the path

  part = parts[len];

  // use the special property if exists
  if (special && obj[special]) {
    obj = obj[special];
  }

  // set the value on the last branch
  if (Array.isArray(obj) && !/^\d+$/.test(part)) {
    if (!copy && Array.isArray(val)) {
      _setArray(obj, val, part, lookup, special, map);
    } else {
      for (var j = 0; j < obj.length; ++j) {
        var item = obj[j];
        if (item) {
          if (lookup) {
            lookup(item, part, map(val));
          } else {
            if (item[special]) item = item[special];
            item[part] = map(val);
          }
        }
      }
    }
  } else {
    if (lookup) {
      lookup(obj, part, map(val));
    } else if (obj instanceof Map) {
      obj.set(part, map(val));
    } else {
      obj[part] = map(val);
    }
  }
};

/*!
 * Split a string path into components delimited by '.' or
 * '[\d+]'
 *
 * #### Example:
 *     stringToParts('foo[0].bar.1'); // ['foo', '0', 'bar', '1']
 */

exports.stringToParts = stringToParts;

/*!
 * Recursively set nested arrays
 */

function _setArray(obj, val, part, lookup, special, map) {
  for (var item, j = 0; j < obj.length && j < val.length; ++j) {
    item = obj[j];
    if (Array.isArray(item) && Array.isArray(val[j])) {
      _setArray(item, val[j], part, lookup, special, map);
    } else if (item) {
      if (lookup) {
        lookup(item, part, map(val[j]));
      } else {
        if (item[special]) item = item[special];
        item[part] = map(val[j]);
      }
    }
  }
}

/*!
 * Returns the value passed to it.
 */

function K(v) {
  return v;
}
