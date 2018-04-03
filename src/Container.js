import {types, getParent, destroy, getType, clone, getRoot, detach, IModelType, IType, isStateTreeNode, IExtendedObservableMap, getSnapshot, hasParent} from 'mobx-state-tree'
import {IObservableArray, reaction} from 'mobx'
import * as _ from 'lodash'
import {Node} from './Node'
import {createScene, Route, POP, RESET, PUSH, REPLACE, NAVIGATE} from './Route'

function isEqual(a, b) {
  return _.isEqual(a, b)
}

export const Container = types.compose(
  Node,
  types
    .model({
      index: 0,
      routes: types.maybe(types.array(types.late(() => Route))),
      scenes: types.optional(types.map(types.late(() => Route)), {})
    })
    .volatile(self => ({
      detached: []
    }))
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
      }
    }))
    .actions(self => {
      const {dispatch, init} = self // get base methods

      return {
        addChild: child => {
          self.scenes.set(child.routeName, createScene(child))
        },
        navigate: (routeName, props = {}) => {},
        init: ({children, initialRouteName, ...props}) => {
          init(props)
          self.routes = children.filter((scene, i) => self.tabs || self.index >= i).map(createScene)
          children.forEach(self.addChild)
          if (initialRouteName) {
            self.index = self.routes.findIndex(route => route.routeName === initialRouteName)
            if (self.index === -1) {
              throw `Cannot find route with name ${initialRouteName}`
            }
          }
        },
        dispatch: ({type, key, routeName, ...props}) => {
          let res = dispatch({type, key, routeName, ...props})
          self.routes.forEach(route => (res = res || route.dispatch({type, key, routeName, ...props})))
          if (type === PUSH) {
            if (self.scenes.get(routeName)) {
              res = self.push({key, routeName, props})
            } else {
              return false
            }
          } else if (type === REPLACE) {
            res = self.replace({key, routeName, props})
          } else if (type === POP) {
            res = self.pop(props)
          } else if (type === RESET) {
            res = self.reset({key, routeName, props})
          }
          return res
        },
        push: s => {
          // don't add action with the same props or key
          if (!self.routes.find(r => r.key === s.key || (s.routeName === r.routeName && isEqual(s.props || {}, getSnapshot(r.props))))) {
            self.routes.push(isStateTreeNode(s) ? s : createScene(s))
            self.index = self.routes.length - 1
            self.isTransitioning = true
            if (hasParent(self)) {
              self.parent.navigate(self.routeName)
            }
            return true
          } else {
            console.log('DUPLICATE! IGNORE PUSH')
            return false
          }
        },
        replace: snapshot => {
          self.pop()
          self.push(snapshot)
        },
        reset: snapshot => {
          self.routes.clear()
          self.push(snapshot)
        },
        pop: () => {
          if (self.index === 0) {
            return false
          }
          self.detached.push(self.routes[self.index])
          detach(self.routes[self.index])
          self.index--
          self.isTransitioning = true
          return true
        }
      }
    })
)
