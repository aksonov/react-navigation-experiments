import {
  types,
  getParent,
  isAlive,
  destroy,
  getType,
  clone,
  getRoot,
  detach,
  IModelType,
  IType,
  isStateTreeNode,
  IExtendedObservableMap,
  getSnapshot,
  hasParent
} from 'mobx-state-tree'
import {IObservableArray, reaction} from 'mobx'
import * as _ from 'lodash'
import {COMPLETE_TRANSITION, SET_PARAMS, NAVIGATE} from './Route'

const dontInheritKeys = ['getComponent', 'ref']
let uniqueBaseId = `id-${Date.now()}`
let uuidCount = 0

function generateKey() {
  return `${uniqueBaseId}-${uuidCount++}`
}

export const Node = types
  .model('Node', {
    key: types.optional(types.string, () => generateKey()),
    routeName: types.string,
    props: types.optional(types.map(types.frozen), {}),
    isTransitioning: false
  })
  .volatile(self => ({
    handlers: {
      onEnter: () => console.log('Enter state: ' + self.key + ' ' + self.routeName),
      onExit: () => console.log('Exit state: ' + self.key + ' ' + self.routeName)
    },
    descriptor: {options: {}},
    initialized: false
  }))
  .views(self => ({
    get isFocused() {
      if (!self.initialized) {
        return false
      }
      return hasParent(self) ? self.parent.current === self && self.parent.isFocused : true
    },
    get routesByName() {
      return {[self.routeName]: self}
    },
    get scenesByName() {
      return {[self.routeName]: self}
    },
    get parent() {
      return hasParent(self) ? getParent(getParent(self)) : {}
    },
    get allProps() {
      return {...self.parent.allProps, ...getSnapshot(self.props)}
    },
    get inheritedDescriptor() {
      const parentDescriptor = {...self.parent.inheritedDescriptor}
      dontInheritKeys.forEach(key => delete parentDescriptor[key])
      const res = {}
      _.merge(res, parentDescriptor)
      _.merge(res, self.descriptor)
      //console.log('MERGED DESC:', self.routeName, res)
      return res
    },
    get currentScene() {
      return self
    },
    get current() {
      return self
    },
    get snapshot() {
      return {
        goBack: self.pop,
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
    return {
      init: props => {
        self.initialized = true
        Object.keys(props)
          .filter(key => ['onEnter', 'onExit', 'success', 'failure'].includes(key))
          .forEach(key => (self.handlers[key] = props[key]))
        Object.keys(props)
          .filter(key => typeof props[key] === 'function' || key === 'options')
          .forEach(key => (self.descriptor[key] = props[key]))
      },
      startTransition: () => {
        self.isTransitioning = true
      },
      completeTransition: () => {
        self.isTransitioning = false
      },
      refresh: (props = {}) => {
        Object.keys(props).forEach(key => self.props.set(key, props[key]))
      },
      setDescriptor: (descriptor = {}) => {
        self.descriptor = {...self.descriptor, ...descriptor}
      },
      dispatch: ({type, key, routeName, ...props}) => {
        console.log('NODE DISPATCH', self.routeName, routeName, props)
        if (key && key !== self.key) {
          return false
        }
        if (routeName && routeName !== self.routeName) {
          return false
        }
        if (type === COMPLETE_TRANSITION) {
          self.completeTransition()
        } else if (type === SET_PARAMS) {
          // if no key and routeName is specified and it is not current scene, return
          if (!key && !routeName && getRoot(self).currentScene.key !== self.key) {
            return false
          }
          self.refresh(props)
        }
      },
      afterCreate: () => {
        handler = reaction(
          () => isAlive(self) && self.isFocused,
          async focused => {
            try {
              let res = focused ? self.handlers.onEnter(self.props) : self.handlers.onExit(self.props)
              if (res instanceof Promise) {
                res = await res
              }
              if (focused) {
                if (res && self.handlers.success) {
                  getRoot(self).dispatch({type: NAVIGATE, routeName: self.handlers.success})
                } else {
                  if (self.handlers.failure) {
                    getRoot(self).dispatch({type: NAVIGATE, routeName: self.handlers.success})
                  }
                }
              }
            } catch (e) {
              console.error('ERROR running handler', e)
            }
          }
        )
      }
    }
  })
