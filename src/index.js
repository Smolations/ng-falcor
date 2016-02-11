// See mit-license.txt for license info

import SyncModel from 'falcor-sync-model';
import HttpDataSource from 'falcor-http-datasource';

function create(origOpts = {}) {

  function factory($rootScope) {

    // Called whenever model changes.
    const onChange = () => { $rootScope.$evalAsync(); };

    // Central cache of data shared by all ngf consumers.
    let model;

    // no-op callback since Falcor responses are lazy
    var thcb = () => {};

    // Retrieve a value. Path must reference a single node in the graph.
    const ngf = function(...path) {
      path = pathify(path);
      return model.getValueSync(path);
    };

    ngf.reconfigure = function(newOpts = {}) {
      const opts = ngf._config;
      const headers = newOpts.headers === undefined || newOpts.headers
        ? Object.assign({}, opts.headers, newOpts.headers)
        : undefined;
      const cache = newOpts.cache || undefined;
      let router, timeout, source;
      if (newOpts.router !== undefined) { router = router || undefined; }
      else { router = opts.router; }
      if (newOpts.timeout !== undefined) { timeout = timeout || undefined; }
      else { timeout = opts.timeout; }
      if (newOpts.source !== undefined) { source = source || undefined; }
      else { source = opts.source; }
      const finalOpts = { headers, cache, router, timeout, source };
      ngf.configure(finalOpts);
    };

    ngf.configure = function({ source, router, timeout, headers, cache } = {}) {
      ngf._config = arguments[0];
      delete ngf._config.cache;
      if (!source && router) {
        source = new HttpDataSource(router, { timeout, headers });
      }
      ngf._config._source = source;
      model = new SyncModel({ source, onChange, cache }).batch();
      $rootScope.$evalAsync();
    };

    ngf.configure(origOpts);

    // proxy the model on this object
    for (const [ srcName, destName ] of [
      [ 'get', 'get' ],
      [ 'getValue', 'getValue' ],
      [ 'set', 'set' ],
      [ 'call', 'callModel' ],
      [ 'invalidate', 'invalidate' ],
      [ 'withoutDataSource', 'withoutDataSource' ],
      [ 'getCache', 'getCache' ]
    ]) {
      ngf[destName] = function(...args) {
        return model[srcName](...args);
      };
    }

    // Two-way binding helper.
    ngf.twoWay = function(path) {
      path = pathify(path);
      return function(value) {
        const isSet = arguments.length > 0;
        if (isSet) {
          ngf.set({ path, value }).then(thcb);
        } else {
          return model.getValueSync(path);
        }
      };
    };

    // helper for listing listable things in falcor
    ngf.range = function(lo, hi) {
      const result = [];
      if (lo < hi) {
        for (var i=lo; i<=hi; i++) { result.push(i); }
      } else if (hi < lo) {
        for (var i=lo; i>=hi; i--) { result.push(i); }
      }
      return result;
    };

    // All done.
    return ngf;
  }

  factory.$inject = ['$rootScope'];
  return factory;
}

function pathify(...path) {
  if (Array.isArray(path[0])) {
    path = path[0];
  }
  return path;
}

module.exports = { create };
