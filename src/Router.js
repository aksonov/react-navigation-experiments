import {types, getParent, destroy, getRoot, detach, IModelType, IType, isStateTreeNode, IExtendedObservableMap, getSnapshot, hasParent} from 'mobx-state-tree'
import {IObservableArray, reaction} from 'mobx'
import * as _ from 'lodash'

const COMPLETE_TRANSITION = 'Navigation/COMPLETE_TRANSITION'
export const STACK_TYPE = 'stack'

const dontInheritKeys = ['getComponent', 'ref', 'options']
let uniqueBaseId = `id-${Date.now()}`
let uuidCount = 0

function generateKey() {
  return `${uniqueBaseId}-${uuidCount++}`
}
function isEqual(snapshot, route) {
  const res = _.cloneDeep(getSnapshot(route))
  delete res.key
  delete res.type
  return _.isEqual(snapshot, res)
}

function getRouteNames(routeName, routes = []) {
  return [routeName].concat(_.flatMap(routes, ({routeName, children}) => getRouteNames(routeName, children)))
}

export const Router = types
  .model('Router', {
    key: types.optional(types.identifier(types.string), () => generateKey()),
    routeName: types.string,
    props: types.optional(types.map(types.frozen), {}),
    type: STACK_TYPE,
    index: types.maybe(types.number),
    routes: types.maybe(types.array(types.late(() => Router))),
    isTransitioning: false
  })
  .volatile(self => ({
    handlers: {
      onEnter: () => console.log('Enter state: ' + self.key + ' ' + self.routeName),
      onExit: () => console.log('Exit state: ' + self.key + ' ' + self.routeName)
    },
    descriptor: {},
    initialized: false,
    children: {},
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
      return {...parentDescriptor, ...self.descriptor}
    },
    get descriptors() {
      const map = {}

      self.routes.forEach(obj => (map[obj.key] = {navigation: obj.snapshot, ...self.inheritedDescriptor, ...obj.descriptor}))
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
        self.children[child.routeName] = child
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
          .filter(key => typeof props[key] === 'function' || ['wrapBy', 'getComponent', 'options'].includes(key))
          .forEach(key => (self.descriptor[key] = props[key]))
        if (self.descriptor.wrapBy) {
          if (!self.descriptor.getComponent) {
            throw 'No getComponent is defined'
          }
          const Wrapper = self.descriptor.wrapBy(self, self.descriptor.getComponent())
          self.descriptor.getComponent = () => Wrapper
        }
        if (children) {
          // TODO store children as map <routeName, obj>
          // set only first route for stack
          self.routes = children.map(createScene)
          children.forEach(child => self.addChild(createScene(child)))
          self.index = index || 0
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
              console.log('HANDLERS:', focused + ' ' + self.routeName)
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
        const snapshot = _.cloneDeep(s)
        if (!snapshot.props) {
          snapshot.props = {}
        }
        // don't add action with the same props
        if (!self.routes.find(r => r.key === snapshot.key || isEqual(snapshot, r))) {
          self.routes.push(this.createScene(snapshot))
          self.index = self.routes.length - 1
          self.isTransitioning = true
          return true
          if (hasParent(self)) {
            self.parent.navigate(self.routeName)
          }
        } else {
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
    navigate: (routeName, props = {}) => {
      const index = self.routes ? self.routes.findIndex(r => r.routeName === routeName) : -1
      if (index !== -1) {
        self.jump(index)
        return true
      } else {
        if (!self.routes) {
          return getRoot(self).navigate(routeName, props)
        }
        for (let i = 0; i < self.routes.length; i++) {
          if (self.routes[i].navigate(routeName, props)) {
            // make current node active too
            console.log('SUCCESS NAVIGATE TO:', routeName, self.routeName)
            return true
          }
        }
        throw `Cannot find ${routeName} scene`
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
        setParams: self.setParams,
        descriptor: self.inheritedDescriptor,
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
