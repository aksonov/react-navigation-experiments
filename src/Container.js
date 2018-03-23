import {types, getParent, destroy, getType, clone, getRoot, detach, IModelType, IType, isStateTreeNode, IExtendedObservableMap, getSnapshot, hasParent} from 'mobx-state-tree'
import {IObservableArray, reaction} from 'mobx'
import * as _ from 'lodash'
import {Route} from './Route'
import {Node} from './Node'

export const Container = types.compose(
  Node,
  types
    .model({
      index: 0,
      routes: types.array(types.late(() => Route))
    })
    .views(self => ({
      get currentScene() {
        return self.routes[self.index].currentScene
      },
      get current() {
        return self.routes[self.index]
      },
      get descriptors() {
        const map = {}
        self.routes.forEach(obj => (map[obj.key] = {navigation: obj.snapshot, ...obj.inheritedDescriptor}))
        return map
      },
      get routesByName() {
        const res = {[self.routeName]: self}
        self.routes.forEach(route => Object.assign(res, route.routesByName))
        return res
      },
      get scenesByName() {
        const res = {[self.routeName]: self}
        self.scenes.keys().forEach(key => Object.assign(res, self.scenes.get(key).scenesByName))
        return res
      },

      get snapshot() {
        return {
          goBack: self.goBack,
          navigate: self.navigate,
          push: self.parent.push,
          pop: self.parent.pop,
          props: self.props,
          refresh: self.refresh,
          allProps: self.allProps,
          descriptor: self.inheritedDescriptor,
          descriptors: self.descriptors,
          setDescriptor: self.setDescriptor,
          routeName: self.routeName,
          dispatch: self.dispatch,
          state: getSnapshot(self)
        }
      }
    }))
    .actions(self => {
      const dispatch = self.dispatch
      return {dispatch}
    })
)
