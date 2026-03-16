'use strict';

module.exports = exports = require('./lib');
 == env.type) {
  throw new Error('Unknown environment');
}

module.exports =
  env.isNode ? require('./node') :
    env.isMongo ? require('./collection') :
      require('./collection');

