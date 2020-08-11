# dd-stores - 钉钉小程序多状态管理

## 前言
随着应用复杂度增加，以及产品经理放飞自我的神奇脑洞，[dd-store](https://github.com/linjc/dd-store)应对起来已经不是那么友好。同事也反馈，有些页面越来越复杂，store变得越来越臃肿，想用拆分store的方式嘛，又挺繁琐的，而且这种中转的方式，感觉也不是很舒爽。之后我细想了一下，其实主要原因是dd-store是以页面为维度，一个页面对应一个store，页面间共享的状态只能提到全局store上，或者两个页面共用同一个store，这样其实很不灵活，而且一堆互不相关的状态集合到一起，会使全局或共用的store臃肿杂乱。如果页面/组件支持多store，那我们就可以将之前臃肿的store拆分出各种各样的独立的store，然后在页面/组件使用的时候，只需按需引入对应store即可，这样就很好解决了现在的问题。

dd-stores支持页面/组件引入多个store。相比dd-store，配置和使用更简单，store定义更加灵活，拓展和维护更加便利。而且页面、组件与store完全解耦，几乎零侵入性。

## 安装
``` js
npm i dd-stores --save
```

## API

* create.Page(stores, option) 创建页面
* create.Component(stores, option) 创建组件
* this.update() 更新页面或组件，在页面、组件、store内使用
* store.update() 其他js文件中使用，需要引入相应的store

## 使用

#### 创建store

store其实是一个包含data属性的对象，可以使用任意方式来定义该对象。
注：计算属性中的this指向store.data对象。
``` js
class Store {

  data = {
    title: '小程序多状态管理',
    language: "zh_cn",
    userName: '李狗蛋',
    deptName: '化肥质检部门',
    corpName: '富土康化肥厂',
    // 函数属性 - 可直接绑定到视图上
    description() {
      return `我是${this.userName}，我在${this.corpName}工作`
    },
    a: {
      b: {
        // 深层嵌套也支持函数属性
        c() {
          return this.language + this.description
        }
      }
    }
  }

  onChangeLang() {
    if(this.data.language === 'zh_cn') {
      this.data.language = 'en_US'
    } else {
      this.data.language = 'zh_cn'
    }
    this.update()
  }
}

export default new Store()
``` 

#### 创建页面

使用create.Page(stores, option)创建页面。其中stores是一个对象，用来绑定对应的store，以及定义该store在axml视图上使用的字段名，注意：该字段名在axml视图上使用时，并不是指向store，而是指向store.data。另外定义该字段名注意不要和现有的私有变量同名。

``` js
import create from 'dd-stores'
import globalStore from '/stores/globalStore'
import indexStore from '/stores/indexStore'

// 字段名可随意命名，但注意不要和页面data内的私有变量同名
const stores = {
  '$index': indexStore, // axml视图上使用$index.xxx即对应indexStore.data.xxx的值。
  '$data': globalStore, // 同上
}

create.Page(stores, {
  onLoad() {},
  data: {},
  handleChangeTitle() {
    globalStore.data.title = '新标题'
    this.update()
  },
  handleChangeName() {
    indexStore.changeName() // 如果changeName方法内调用了update方法，此处可以省去调用this.update()
  }
});
```

#### 创建组件

使用create.Component(stores, option)创建组件。使用和create.Page一样。


``` js
import create from 'dd-stores'
import globalStore from '/stores/globalStore'
import indexStore from '/stores/indexStore'

const stores = {
  '$index': indexStore,
  '$data': globalStore,
}

create.Component(stores, {
  didMount() {},
  data: {},
  methods: {
    handleChangeTitle() {
      globalStore.data.title = '新标题'
      this.update()
    },
    handleChangeName() {
      indexStore.changeName()
    }
  }
});
```

#### axml视图上使用
简单示例：
``` js
<view>
  <view>{{$index.title}}</view>
  <view>{{$index.a.b}}</view>
  <view>{{$data.language}}</view>
  <view>{{$data.description}}</view>
</view>
```

#### 更新状态

直接更改对应store.data内的值，最后调用this.upadte()即可，非常人性化。

``` js
// 页面、组件内使用
store.data.language = 'zh_cn'
store.data.userName = '李狗蛋'
store.data.userList[0].name = '张三疯'
this.update() // 或使用store.update()
```
``` js
// store内使用
this.data.language = 'zh_cn'
this.data.userName = '李狗蛋'
this.data.userList[0].name = '张三疯'
this.update()
```
``` js
// 其他js文件使用
import store from '/stores/store'
store.data.language = 'zh_cn'
store.data.userName = '李狗蛋'
store.data.userList[0].name = '张三疯'
store.update()
```


## 快捷链接

- [Example示例](https://github.com/linjc/dd-stores/tree/master/example)
- [Github仓库](https://github.com/linjc/dd-stores)
- [Gitee仓库](https://gitee.com/l2j2c3/dd-stores)
- [Issues反馈](https://github.com/linjc/dd-stores/issues)



在使用过程中如果遇到问题或有什么建议可以随时在[Issues](https://github.com/linjc/dd-stores/issues)进行反馈，或钉钉联系我：linjinchun
