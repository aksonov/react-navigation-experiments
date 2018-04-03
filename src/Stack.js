import {types, getParent, destroy, getType, clone, getRoot, detach, IModelType, IType, isStateTreeNode, IExtendedObservableMap, getSnapshot, hasParent} from 'mobx-state-tree'
import {Container} from './Container'
import {NAVIGATE} from './Route'

export const Stack = types
  .compose(types.model({}), Container)
  .named('Stack')
  .actions(self => {
    const {dispatch, init} = self
    return {
      init: ({routes, ...props}) => {
        init({routes, ...props})
        // remove extra routes
        self.routes.splice(self.index + 1, self.routes.length - self.index - 1)
      },
      dispatch: ({type, key, routeName, ...props}) => {
        let res = dispatch({type, key, routeName, ...props})
        if (type === NAVIGATE) {
          if (self.scenes.get(routeName)) {
            res = self.push({key, routeName, props})
          }
        }
      }
    }
  })
