try {
  if(!window) {
    window = {};
    //exports.console = console;
  }
} catch(e) {
  window = {};
  exports.console = console;
}

var persistence = (window && window.persistence) ? window.persistence : {}; 

if(!persistence.store) {
  persistence.store = {};
}

persistence.store.memory = {};

persistence.store.memory.config = function(persistence) {
  var argspec = persistence.argspec;

  var allObjects = {}; // entityName -> LocalQueryCollection

  var defaultAdd = persistence.add;

  persistence.add = function(obj) {
    defaultAdd.call(this, obj);
    var entityName = obj._type;
    if(!allObjects[entityName]) {
      allObjects[entityName] = new persistence.LocalQueryCollection();
      allObjects[entityName]._session = persistence;
    }
    allObjects[entityName].add(obj);
    return this;
  };

  var defaultRemove = persistence.remove;

  persistence.remove = function(obj) {
    defaultRemove.call(this, obj);
    var entityName = obj._type;
    allObjects[entityName].remove(obj);
  };

  persistence.schemaSync = function (tx, callback, emulate) {
    var args = argspec.getArgs(arguments, [
        { name: "tx", optional: true, check: persistence.isTransaction, defaultValue: null },
        { name: "callback", optional: true, check: argspec.isCallback(), defaultValue: function(){} },
        { name: "emulate", optional: true, check: argspec.hasType('boolean') }
      ]);

    args.callback();
  };

  persistence.flush = function (tx, callback) {
    var args = argspec.getArgs(arguments, [
        { name: "tx", optional: true, check: persistence.isTransaction },
        { name: "callback", optional: true, check: argspec.isCallback(), defaultValue: function(){} }
      ]);

    args.callback();
  };

  persistence.transaction = function(callback) {
    callback({executeSql: function() {} });
  };

  /**
   * Remove all tables in the database (as defined by the model)
   */
  persistence.reset = function (tx, callback) {
    var args = argspec.getArgs(arguments, [
        { name: "tx", optional: true, check: persistence.isTransaction, defaultValue: null },
        { name: "callback", optional: true, check: argspec.isCallback(), defaultValue: function(){} }
      ]);
    tx = args.tx;
    callback = args.callback;

    allObjects = {};
    this.clean();
    callback();
  };


  // QueryCollection's list

  function makeLocalClone(otherColl) {
    var coll = allObjects[otherColl._entityName];
    if(!coll) {
      coll = new persistence.LocalQueryCollection();
    }
    coll = coll.clone();
    coll._filter = otherColl._filter;
    coll._prefetchFields = otherColl._prefetchFields;
    coll._orderColumns = otherColl._orderColumns;
    coll._limit = otherColl._limit;
    coll._skip = otherColl._skip;
    return coll;
  }
  /**
   * Asynchronous call to actually fetch the items in the collection
   * @param tx transaction to use
   * @param callback function to be called taking an array with 
   *   result objects as argument
   */
  persistence.DbQueryCollection.prototype.list = function (tx, callback) {
    var args = argspec.getArgs(arguments, [
        { name: 'tx', optional: true, check: persistence.isTransaction, defaultValue: null },
        { name: 'callback', optional: false, check: argspec.isCallback() }
      ]);
    tx = args.tx;
    callback = args.callback;

    var coll = makeLocalClone(this);
    coll.list(null, callback);
  };

  /**
   * Asynchronous call to remove all the items in the collection. 
   * Note: does not only remove the items from the collection, but
   * the items themselves.
   * @param tx transaction to use
   * @param callback function to be called when clearing has completed
   */
  persistence.DbQueryCollection.prototype.destroyAll = function (tx, callback) {
    var args = argspec.getArgs(arguments, [
        { name: 'tx', optional: true, check: persistence.isTransaction, defaultValue: null },
        { name: 'callback', optional: true, check: argspec.isCallback(), defaultValue: function(){} }
      ]);
    tx = args.tx;
    callback = args.callback;

    var coll = makeLocalClone(this);
    coll.destroyAll(null, callback);
  };

  /**
   * Asynchronous call to count the number of items in the collection.
   * @param tx transaction to use
   * @param callback function to be called when clearing has completed
   */
  persistence.DbQueryCollection.prototype.count = function (tx, callback) {
    var args = argspec.getArgs(arguments, [
        { name: 'tx', optional: true, check: persistence.isTransaction, defaultValue: null },
        { name: 'callback', optional: false, check: argspec.isCallback() }
      ]);
    tx = args.tx;
    callback = args.callback;

    var coll = makeLocalClone(this);
    coll.count(null, callback);
  };

  persistence.ManyToManyDbQueryCollection = function(session, entityName) {
    this.init(session, entityName, persistence.ManyToManyDbQueryCollection);
    this._items = [];
  };

  persistence.ManyToManyDbQueryCollection.prototype = new persistence.LocalQueryCollection();

  persistence.ManyToManyDbQueryCollection.prototype.initManyToMany = function(obj, coll) {
    this._obj = obj;
    this._coll = coll; // column name
  };

  persistence.ManyToManyDbQueryCollection.add = function(item) {
    persistence.LocalQueryCollection.prototype.add.call(this, item);
    // Let's find the inverse collection
    var meta = persistence.getMeta(this._obj._type);


  };
};

try {
  exports.config = persistence.store.memory.config;
} catch(e) {}
