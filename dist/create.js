'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createPage = createPage;
exports.createComponent = createComponent;

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var TYPE_ARRAY = '[object Array]';
var TYPE_OBJECT = '[object Object]';
var TYPE_FUNCTION = '[object Function]';
var __Page = Page;
var __Component = Component;
var __instances = {};

exports.default = {
  Page: createPage,
  Component: createComponent
};


function initStores(stores, option) {
  option.data = option.data || {};
  Object.keys(stores).forEach(function (key) {
    var store = stores[key];
    store.data = store.data || {};
    store.update = updateState;
    if (!store.__isReadyComputed) {
      setComputed(store.data, store.data);
      store.__isReadyComputed = true;
    }
    option.data[key] = deepCopy(store.data);
  });
}

function createPage(stores, option) {
  if (!option) {
    console.error('createPage第一个参数有误，请传入需要注入的stores对象');
    option = stores;
    stores = {};
  }
  initStores(stores, option);

  var onLoad = option.onLoad;
  option.onLoad = function (query) {
    var _this = this;

    this.update = updateState;
    __instances[this.route] = __instances[this.route] || [];
    Object.keys(stores).forEach(function (key) {
      return __instances[_this.route].push({ key: key, vm: _this, store: stores[key] });
    });
    onLoad && onLoad.call(this, query);
  };

  var onShow = option.onShow;
  option.onShow = function (query) {
    this.update(this.route);
    onShow && onShow.call(this, query);
  };

  var onUnload = option.onUnload;
  option.onUnload = function (query) {
    onUnload && onUnload.call(this, query);
    __instances[this.route].length = 0;
  };

  __Page(option);
}

function createComponent(stores, option) {
  if (!option) {
    console.error('createComponent第一个参数有误，请传入需要注入的stores对象');
    option = stores;
    stores = {};
  }
  initStores(stores, option);

  var _onMount = option.didMount;
  option.didMount = function (query) {
    var _this2 = this;

    this.update = updateState;
    this._page = this.$page || getPage();
    __instances[this._page.route] = __instances[this._page.route] || [];
    Object.keys(stores).forEach(function (key) {
      return __instances[_this2._page.route].push({ key: key, vm: _this2, store: stores[key] });
    });
    this.update(this._page.route);
    _onMount && _onMount.call(this, query);
  };

  var _onUnmount = option.didUnmount;
  option.didUnmount = function (query) {
    var _this3 = this;

    _onUnmount && _onUnmount.call(this, query);
    var route = this._page.route;
    __instances[route] = __instances[route].filter(function (f) {
      return f.vm !== _this3;
    });
  };

  __Component(option);
}

function setComputed(storeData, value, obj, key) {
  var type = getType(value);
  if (type === TYPE_FUNCTION) {
    Object.defineProperty(obj, key, {
      enumerable: true,
      get: function get() {
        return value.call(storeData);
      },
      set: function set() {
        console.warn('计算属性不支持重新赋值');
      }
    });
  } else if (type === TYPE_OBJECT) {
    Object.keys(value).forEach(function (subKey) {
      setComputed(storeData, value[subKey], value, subKey);
    });
  } else if (type === TYPE_ARRAY) {
    value.forEach(function (item, index) {
      setComputed(storeData, item, value, index);
    });
  }
}

function deepCopy(data) {
  var type = getType(data);
  if (type === TYPE_OBJECT) {
    var obj = {};
    Object.keys(data).forEach(function (key) {
      return obj[key] = deepCopy(data[key]);
    });
    return obj;
  }
  if (type === TYPE_ARRAY) {
    var arr = [];
    data.forEach(function (item, index) {
      return arr[index] = deepCopy(item);
    });
    return arr;
  }
  return data;
}

function getPage() {
  var pages = getCurrentPages();
  return pages[pages.length - 1] || {};
}

function updateState(route) {
  var instances = __instances[route || getPage().route] || [];
  return Promise.all(instances.map(function (f) {
    return setState(f.vm, _defineProperty({}, f.key, f.store.data));
  }));
}

function setState(vm, data) {
  vm._new_data = vm._new_data || {};
  Object.assign(vm._new_data, data);
  return new Promise(function (resolve) {
    setTimeout(function () {
      if (Object.keys(vm._new_data).length > 0) {
        var diffState = getDiffState(vm._new_data, vm.data);
        vm._new_data = {};
        vm.setData(diffState, resolve);
      } else {
        resolve();
      }
    }, 0);
  });
}

function getDiffState(state, preState) {
  var newState = {};
  stateDiff(deepCopy(state), preState, '', newState);
  return newState;
}

function getType(obj) {
  return Object.prototype.toString.call(obj);
}

function addDiffState(newState, key, val) {
  key !== '' && (newState[key] = val);
}

function stateDiff(state, preState, path, newState) {
  if (state === preState) return;
  var stateType = getType(state);
  var preStateType = getType(preState);
  if (stateType === TYPE_OBJECT) {
    var stateKeys = Object.keys(state);
    var preStateKeys = Object.keys(preState || {});
    var stateLen = stateKeys.length;
    var preStateLen = preStateKeys.length;
    if (path !== '') {
      if (preStateType !== TYPE_OBJECT || stateLen < preStateLen || stateLen === 0 || preStateLen === 0) {
        addDiffState(newState, path, state);
        return;
      }
      preStateKeys.forEach(function (key) {
        state[key] === undefined && (state[key] = null); // 已删除的属性设置为null
      });
    }
    stateKeys.forEach(function (key) {
      var subPath = path === '' ? key : path + '.' + key;
      stateDiff(state[key], preState[key], subPath, newState);
    });
    return;
  }
  if (stateType === TYPE_ARRAY) {
    if (preStateType !== TYPE_ARRAY || state.length < preState.length || state.length === 0 || preState.length === 0) {
      addDiffState(newState, path, state);
      return;
    }
    preState.forEach(function (item, index) {
      state[index] === undefined && (state[index] = null); // 已删除的属性设置为null
    });
    state.forEach(function (item, index) {
      return stateDiff(item, preState[index], path + '[' + index + ']', newState);
    });
    return;
  }
  addDiffState(newState, path, state);
}
