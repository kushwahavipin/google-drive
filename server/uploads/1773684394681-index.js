'use strict'
/* eslint-env mocha */
/* eslint no-proto: 0 */
var assert = require('assert')
var setPrototypeOf = require('..')

describe('setProtoOf(obj, proto)', function () {
  it('should merge objects', function () {
    var obj = { a: 1, b: 2 }
    var proto = { b: 3, c: 4 }
    var mergeObj = setPrototypeOf(obj, proto)

    if (Object.getPrototypeOf) {
      assert.strictEqual(Object.getPrototypeOf(obj), proto)
    } else if ({ __proto__: [] } instanceof Array) {
      assert.strictEqual(obj.__proto__, proto)
    } else {
      assert.strictEqual(obj.a, 1)
      assert.strictEqual(obj.b, 2)
      assert.strictEqual(obj.c, 4)
    }
    assert.strictEqual(mergeObj, obj)
  })
})
tent value noops');

		st.end();
	});

	t.test('has', function (st) {
		var channel = getSideChannel();
		/** @type {unknown[]} */ var o = [];

		st.equal(channel.has(o), false, 'nonexistent value yields false');

		channel.set(o, 'foo');
		st.equal(channel.has(o), true, 'existent value yields true');

		st.equal(channel.has('abc'), false, 'non object value non existent yields false');

		channel.set('abc', 'foo');
		st.equal(channel.has('abc'), true, 'non object value that exists yields true');

		st.end();
	});

	t.test('get', function (st) {
		var channel = getSideChannel();
		var o = {};
		st.equal(channel.get(o), undefined, 'nonexistent value yields undefined');

		var data = {};
		channel.set(o, data);
		st.equal(channel.get(o), data, '"get" yields data set by "set"');

		st.end();
	});

	t.test('set', function (st) {
		var channel = getSideChannel();
		var o = function () {};
		st.equal(channel.get(o), undefined, 'value not set');

		channel.set(o, 42);
		st.equal(channel.get(o), 42, 'value was set');

		channel.set(o, Infinity);
		st.equal(channel.get(o), Infinity, 'value was set again');

		var o2 = {};
		channel.set(o2, 17);
		st.equal(channel.get(o), Infinity, 'o is not modified');
		st.equal(channel.get(o2), 17, 'o2 is set');

		channel.set(o, 14);
		st.equal(channel.get(o), 14, 'o is modified');
		st.equal(channel.get(o2), 17, 'o2 is not modified');

		st.end();
	});

	t.test('delete', function (st) {
		var channel = getSideChannel();
		var o = {};
		st.equal(channel['delete']({}), false, 'nonexistent value yields false');

		channel.set(o, 42);
		st.equal(channel.has(o), true, 'value is set');

		st.equal(channel['delete']({}), false, 'nonexistent value still yields false');

		st.equal(channel['delete'](o), true, 'deleted value yields true');

		st.equal(channel.has(o), false, 'value is no longer set');

		st.end();
	});

	t.end();
});
