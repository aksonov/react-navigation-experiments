import {types, getParent, destroy, getType, clone, getRoot, detach, IModelType, IType, isStateTreeNode, IExtendedObservableMap, getSnapshot, hasParent} from 'mobx-state-tree'
import {IObservableArray, reaction} from 'mobx'
import * as _ from 'lodash'

const COMPLETE_TRANSITION = 'Navigation/COMPLETE_TRANSITION'

const dontInheritKeys = ['getComponent', 'ref']
let uniqueBaseId = `id-${Date.now()}`
let uuidCount = 0

function generateKey() {
  return `${uniqueBaseId}-${uuidCount++}`
}
function isEqual(a, b) {
  console.log('IS EQUAL:', a, b, _.isEqual(a, b))
  return _.isEqual(a, b)
}
function getRouteNames(routeName, routes = []) {
  return [routeName].concat(_.flatMap(routes, ({routeName, children}) => getRouteNames(routeName, children)))
}

// export const LeafScene = types.model('LeafScene', {
//   key: types.optional(types.identifier(types.string), () => generateKey()),
//   props: types.optional(types.map(types.frozen), {}),
//   routeName: types.string,
//   isTransitioning: false
// })

// export const ContainerScene = LeafScene.props({
//   index: 0,
//   routes: types.array(types.late(() => Scene))
// }).named('ContainerScene')

// export const Scene = types.union(LeafScene, ContainerScene)

// export const LeafRoute = types.model('LeafRoute', {
//   routeName: types.identifier(types.string),
//   scenes: types.optional(types.map(Scene), {}),
//   props: types.optional(types.map(types.frozen), {})
// })

// export const ContainerRoute = LeafRoute.props({
//   children: types.map(types.late(() => Route)),
//   tabs: false
// })

// export const Route = types.union(LeafRoute, ContainerRoute)

export const Router = types
  .model('Router', {
    key: types.optional(types.string, () => generateKey()),
    routeName: types.string,
    props: types.optional(types.map(types.frozen), {}),
    tabs: false,
    index: types.maybe(types.number),
    routes: types.maybe(types.array(types.late(() => Router))),
    scenes: types.maybe(types.map(types.late(() => Router))),
    isTransitioning: false
  })
  .volatile(self => ({
    handlers: {
      onEnter: () => console.log('Enter state: ' + self.key + ' ' + self.routeName),
      onExit: () => console.log('Exit state: ' + self.key + ' ' + self.routeName)
    },
    descriptor: {options: {}},
    initialized: false,
    detached: []
  }))
  .views(self => ({
    get isFocused() {
      if (!self.initialized) {
        return false
      }
      return hasParent(self) ? self.parent.current === self && self.parent.isFocused : true
    },
    get routesByName() {
      const res = {[self.routeName]: self}
      self.routes && self.routes.forEach(route => Object.assign(res, route.routesByName))
      return res
    },
    get scenesByName() {
      const res = {[self.routeName]: self}
      self.scenes && self.scenes.keys().forEach(key => Object.assign(res, self.scenes.get(key).scenesByName))
      return res
    },
    get parent() {
      return hasParent(self) ? getParent(getParent(self)) : {}
    }
  }))
  .views(self => ({
    get allProps() {
      return {...self.parent.allProps, ...self.props.toJS()}
    },
    get inheritedDescriptor() {
      const parentDescriptor = {...self.parent.inheritedDescriptor}
      dontInheritKeys.forEach(key => delete parentDescriptor[key])
      const res = {}
      _.merge(res, parentDescriptor)
      _.merge(res, self.descriptor)
      console.log('MERGED DESC:', self.routeName, res)
      return res
    },
    get descriptors() {
      const map = {}
      self.routes && self.routes.forEach(obj => (map[obj.key] = {navigation: obj.snapshot, ...obj.inheritedDescriptor}))
      return map
    },
    get currentScene() {
      return self.routes && self.index !== null ? self.routes[self.index].currentScene : self
    },
    get current() {
      return self.routes && self.index !== null ? self.routes[self.index] : self
    }
  }))
  // .preProcessSnapshot((snapshot: any) => {
  //   _.cloneDeep(snapshot)
  //   return snapshot
  // })
  .actions(self => {
    return {
      addChild: child => {
        self.scenes.set(child.routeName, createScene(child))
      },
      postProcessSnapshot: snapshot => {
        const result = {}
        Object.keys(snapshot).forEach(key => {
          if (snapshot[key] !== null) {
            result[key] = snapshot[key]
          }
        })
        delete result.isTransitioning
        return result
      },
      init: ({children, index, initialRouteName, ...props}) => {
        self.initialized = true
        Object.keys(props)
          .filter(key => ['onEnter', 'onExit', 'success', 'failure'].includes(key))
          .forEach(key => (self.handlers[key] = props[key]))
        Object.keys(props)
          .filter(key => typeof props[key] === 'function' || key === 'options')
          .forEach(key => (self.descriptor[key] = props[key]))

        if (children) {
          self.scenes = {}
          self.index = index || 0
          self.routes = children.filter((scene, i) => self.tabs || self.index >= i).map(createScene)
          children.forEach(self.addChild)
          if (initialRouteName) {
            self.index = self.routes.findIndex(route => route.routeName === initialRouteName)
            if (self.index === -1) {
              throw `Cannot find route with name ${initialRouteName}`
            }
          }
        }
      },
      afterCreate: () => {
        if (self.routes && self.index === null) {
          self.index = 0
        }
        handler = reaction(
          () => self.isFocused,
          async focused => {
            try {
              let res = focused ? self.handlers.onEnter(self.props) : self.handlers.onExit(self.props)
              if (res instanceof Promise) {
                res = await res
              }
              if (focused) {
                if (res && self.handlers.success) {
                  self.navigate(self.handlers.success)
                } else {
                  if (self.handlers.failure) {
                    self.navigate(self.handlers.failure)
                  }
                }
              }
            } catch (e) {
              console.error('ERROR running handler', e)
            }
          }
        )
      },
      beforeDetach: () => {
        handler()
        self.handlers.onExit(self.props)
      },
      refresh: (props = {}) => {
        Object.keys(props).forEach(key => self.props.set(key, props[key]))
      },
      setDescriptor: (descriptor = {}) => {
        self.descriptor = {...self.descriptor, ...descriptor}
      },
      jump: index => {
        if (index >= self.routes.length) {
          throw 'Invalid index for jump'
        }
        if (hasParent(self)) {
          self.parent.navigate(self.routeName)
        }
        self.index = index
      },
      push: s => {
        // don't add action with the same props or key
        if (!self.routes.find(r => r.key === s.key || (s.routeName === r.routeName && isEqual(s.props || {}, getSnapshot(r.props))))) {
          self.routes.push(isStateTreeNode(s) ? s : this.createScene(s))
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
      completeTransition: () => {
        self.isTransitioning = false
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
  .actions(self => ({
    goBack: () => {
      self.pop()
      console.log('STATE:', JSON.stringify(self.state))
    },
    dispatch: ({type, key, ...props}) => {
      console.log('DISPATCH', type, key)
      if (type === COMPLETE_TRANSITION) {
        console.log('COMPLETE TRANSITION', key, self.key)
        self.completeTransition()
      }
    },
    clone: (scene, props) => {
      const node = getType(scene).create({...getSnapshot(scene), key: undefined})
      node.init({...scene.handlers, ...scene.descriptor})
      node.refresh(props)
      console.log('CLONE:', getSnapshot(node), getSnapshot(scene))
      return node
    },
    navigate: (routeName, props = {}) => {
      if (self.scenes && self.scenes.get(routeName)) {
        const scene = self.scenes.get(routeName)
        if (self.tabs) {
          self.jump(self.routes.findIndex(r => r.routeName === routeName))
        } else {
          if (!self.routes.find(r => r.key === scene.key || (scene.routeName === r.routeName && isEqual({...getSnapshot(scene.props), ...props}, getSnapshot(r.props))))) {
            self.push(self.clone(scene, props))
          }
        }
      } else {
        const root = getRoot(self)
        if (!root.scenesByName[routeName]) {
          throw `Cannot find ${routeName} scene`
        }
        const parentName = root.scenesByName[routeName].parent.routeName
        root.routesByName[parentName].navigate(routeName, props)
      }
    },
    replace: snapshot => {
      self.pop()
      self.push(snapshot)
    },
    reset: snapshot => {
      self.routes.clear()
      self.push(snapshot)
    }
  }))
  .views(self => ({
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

export function create(scenes) {
  const routeNames = getRouteNames(scenes.routeName, scenes.children)
  // this.ExtendedRouter = this.Router.actions(self => {
  //   const actions = {}
  //   getRouteNames(scenes.routeName, scenes.children).forEach(routeName => {
  //     actions[routeName] = props => {
  //       return self.navigate(routeName, props)
  //     }
  //   })
  //   return actions
  // })
  return new Proxy(createScene(scenes), {
    get: function(obj, prop) {
      if (routeNames.indexOf(prop) !== -1) {
        return props => obj.navigate(prop, props)
      }
      return obj[prop]
    }
  })
}

export function createScene(props) {
  const res = Router.create(props)
  res.init(props)
  return res
}
