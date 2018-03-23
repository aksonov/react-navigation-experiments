import {types, getParent, destroy, getType, clone, getRoot, detach, IModelType, IType, isStateTreeNode, IExtendedObservableMap, getSnapshot, hasParent} from 'mobx-state-tree'
import {Container} from './Container'

export const Drawer = types
  .compose(
    Container,
    types.model({
      isDrawerOpen: types.boolean
    })
  )
  .named('Drawer')
  .actions(self => {
    const dispatch = self.dispatch
    return {
      dispatch: () => {}
    }
  })
