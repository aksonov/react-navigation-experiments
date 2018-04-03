import {types, getParent, destroy, getType, clone, getRoot, detach, IModelType, IType, isStateTreeNode, IExtendedObservableMap, getSnapshot, hasParent} from 'mobx-state-tree'
import {Container} from './Container'
import {NAVIGATE} from './Route'

export const Tabs = types
  .compose(
    types.model({}).volatile(self => ({
      tabs: true
    })),
    Container
  )
  .named('Tabs')
  .actions(self => {
    const {dispatch, init} = self
    return {
      jump: index => {
        if (index >= self.routes.length) {
          throw 'Invalid index for jump'
        }
        if (hasParent(self)) {
          self.parent.dispatch({type: NAVIGATE, routeName: self.routeName})
        }
        self.index = index
      },
      navigate: (routeName, props) => {
        const index = self.routes.findIndex(r => r.routeName === routeName)
        if (index !== -1) {
          self.jump(index)
          return true
        } else {
          return false
        }
      },
      dispatch: ({type, key, routeName, ...props}) => {
        let res = dispatch({type, key, routeName, ...props})
        if (type === NAVIGATE) {
          res = self.navigate(routeName, props)
        }
        return res
      }
    }
  })
