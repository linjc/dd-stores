import create from 'dd-stores'
import helloStore from '/stores/helloStore'
import globalStore from '/stores/globalStore'

const stores = {
  'hello': helloStore,
  '$data': globalStore
}

create.Page(stores, {

  data: {},

  onLoad() { },
  
  handleChangeTitle() {
    helloStore.onChangeTitle()
  },

  goBack() {
    dd.navigateBack()
  }
});
