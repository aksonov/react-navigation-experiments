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
      dispatch: ({type, key, ...props}) => {
        if (type === COMPLETE_TRANSITION) {
          console.log('COMPLETE TRANSITION', key, self.key)
          self.completeTransition()
        }
      },
      afterCreate: () => {
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
      }
    }
  })
