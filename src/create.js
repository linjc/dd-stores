const TYPE_ARRAY = '[object Array]'
const TYPE_OBJECT = '[object Object]'
const TYPE_FUNCTION = '[object Function]'
const __Page = Page
const __Component = Component
const __instances = {}

export default {
  Page: createPage,
  Component: createComponent
}

function initStores(stores, option) {
  option.data = option.data || {}
  Object.keys(stores).forEach(key => {
    const store = stores[key]
    store.data = store.data || {}
    store.update = updateState
    if (!store.__isReadyComputed) {
      setComputed(store.data, store.data)
      store.__isReadyComputed = true
    }
    option.data[key] = deepCopy(store.data)
  })
}

export function createPage(stores, option) {
  initStores(stores, option)

  const onLoad = option.onLoad
  option.onLoad = function (query) {
    this.update = updateState
    __instances[this.route] = __instances[this.route] || []
    Object.keys(stores).forEach(key => __instances[this.route].push({ key, vm: this, store: stores[key] }))
    onLoad && onLoad.call(this, query)
  }

  const onShow = option.onShow
  option.onShow = function (query) {
    this.update(this.route)
    onShow && onShow.call(this, query)
  }

  const onUnload = option.onUnload
  option.onUnload = function (query) {
    onUnload && onUnload.call(this, query)
    __instances[this.route].length = 0
  }

  __Page(option)
}

export function createComponent(stores, option) {
  initStores(stores, option)

  const _onMount = option.didMount
  option.didMount = function (query) {
    this.update = updateState
    this._page = this.$page || getPage()
    Object.keys(stores).forEach(key => __instances[this._page.route].push({ key, vm: this, store: stores[key] }))
    this.update(this._page.route)
    _onMount && _onMount.call(this, query)
  }

  const _onUnmount = option.didUnmount
  option.didUnmount = function (query) {
    _onUnmount && _onUnmount.call(this, query)
    const route = this._page.route
    __instances[route] = __instances[route].filter(f => f.vm !== this)
  }

  __Component(option)
}

function setComputed(storeData, value, obj, key) {
  const type = getType(value)
  if (type === TYPE_FUNCTION) {
    Object.defineProperty(obj, key, {
      enumerable: true,
      get: function () {
        return value.call(storeData)
      },
      set: function () {
        console.warn('计算属性不支持重新赋值')
      }
    })
  } else if (type === TYPE_OBJECT) {
    Object.keys(value).forEach(subKey => {
      setComputed(storeData, value[subKey], value, subKey)
    })
  } else if (type === TYPE_ARRAY) {
    value.forEach((item, index) => {
      setComputed(storeData, item, value, index)
    })
  }
}

function deepCopy(data) {
  const type = getType(data)
  if (type === TYPE_OBJECT) {
    const obj = {}
    Object.keys(data).forEach(key => obj[key] = deepCopy(data[key]))
    return obj
  }
  if (type === TYPE_ARRAY) {
    const arr = []
    data.forEach((item, index) => arr[index] = deepCopy(item))
    return arr
  }
  return data
}

function getPage() {
  const pages = getCurrentPages()
  return pages[pages.length - 1] || {}
}

function updateState(route) {
  const instances = __instances[route || getPage().route] || []
  return Promise.all(instances.map(f => setState(f.vm, { [f.key]: f.store.data })))
}

function setState(vm, data) {
  vm._new_data = vm._new_data || {}
  Object.assign(vm._new_data, data)
  return new Promise(resolve => {
    setTimeout(() => {
      if (Object.keys(vm._new_data).length > 0) {
        const diffState = getDiffState(vm._new_data, vm.data)
        vm._new_data = {}
        vm.setData(diffState, resolve)
      } else {
        resolve()
      }
    }, 0)
  })
}

function getDiffState(state, preState) {
  const newState = {}
  stateDiff(deepCopy(state), preState, '', newState)
  return newState
}

function getType(obj) {
  return Object.prototype.toString.call(obj)
}

function addDiffState(newState, key, val) {
  key !== '' && (newState[key] = val)
}

function stateDiff(state, preState, path, newState) {
  if (state === preState) return
  const stateType = getType(state)
  const preStateType = getType(preState)
  if (stateType === TYPE_OBJECT) {
    const stateKeys = Object.keys(state)
    const preStateKeys = Object.keys(preState || {})
    const stateLen = stateKeys.length
    const preStateLen = preStateKeys.length
    if (path !== '') {
      if (preStateType !== TYPE_OBJECT || stateLen < preStateLen || stateLen === 0 || preStateLen === 0) {
        addDiffState(newState, path, state)
        return
      }
      preStateKeys.forEach(key => {
        state[key] === undefined && (state[key] = null) // 已删除的属性设置为null
      })
    }
    stateKeys.forEach(key => {
      const subPath = path === '' ? key : path + '.' + key
      stateDiff(state[key], preState[key], subPath, newState)
    })
    return
  }
  if (stateType === TYPE_ARRAY) {
    if (preStateType !== TYPE_ARRAY || state.length < preState.length || state.length === 0 || preState.length === 0) {
      addDiffState(newState, path, state)
      return
    }
    preState.forEach((item, index) => {
      state[index] === undefined && (state[index] = null) // 已删除的属性设置为null
    })
    state.forEach((item, index) => stateDiff(item, preState[index], path + '[' + index + ']', newState))
    return
  }
  addDiffState(newState, path, state)
}