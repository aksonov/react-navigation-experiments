import {types, getParent, IModelType, IType, isStateTreeNode, IExtendedObservableMap, getSnapshot, hasParent} from 'mobx-state-tree'
import {IObservableArray} from 'mobx'
import * as _ from 'lodash'

let uniqueBaseId = `id-${Date.now()}`
let uuidCount = 0

function generateKey() {
  return `${uniqueBaseId}-${uuidCount++}`
}
function removeKey(snapshot) {
  const res = _.cloneDeep(snapshot)
  delete res.key
  return res
}
export const Router = types
  .model('Router', {
    key: types.optional(types.identifier(types.string), () => generateKey()),
    routeName: types.string,
    props: types.optional(types.map(types.frozen), {}),
    index: types.maybe(types.number),
    routes: types.maybe(types.array(types.late(() => Router)))
  })
  .volatile(self => ({
    isTransitioning: false
  }))
  .views(self => ({
    isFocused() {
      return hasParent(self) ? self.parent.current === self : true
    },
    get routesByName() {
      return !self.routes
        ? {}
        : self.routes.reduce((map, obj) => {
            map[obj.routeName] = obj
            return map
          }, {})
    },
    get parent() {
      return hasParent(self) ? getParent(getParent(self)) : {}
    }
  }))
  .views(self => ({
    get allProps() {
      return {...self.parent.allProps, ...self.props.toJS()}
    },
    get currentLeaf() {
      return self.routes ? self.routes[self.index].currentLeaf : self
    },
    get current() {
      return self.routes ? self.routes[self.index] : self
    },
    get state() {
      return getSnapshot(self)
    }
  }))
  // .preProcessSnapshot((snapshot: any) => {
  //   _.cloneDeep(snapshot)
  //   return snapshot
  // })
  .actions(self => ({
    postProcessSnapshot: snapshot => {
      const result = {}
      Object.keys(snapshot).forEach(key => {
        if (snapshot[key] !== null) {
          result[key] = snapshot[key]
        }
      })
      //delete result.isFocused
      return result
    },
    afterCreate: () => {
      if (self.routes && self.index === null) {
        self.index = 0
      }
    },
    addListener: (name, listener) => {},
    setParams: (props = {}) => {
      Object.keys(props).forEach(key => self.props.set(key, props[key]))
    },
    jump: index => {
      if (index >= self.routes.length) {
        throw 'Invalid index for jump'
      }
      self.index = index
    },
    push: s => {
      const snapshot = _.cloneDeep(s)
      if (!snapshot.props) {
        snapshot.props = {}
      }
      if (!self.routes.find(r => r.key === snapshot.key || _.isEqual(snapshot, removeKey(getSnapshot(r))))) {
        self.routes.push(Router.create(snapshot))
        self.index = self.routes.length - 1
        // alert(JSON.stringify(self.routes));
        return true
      } else {
        return false
      }
    },
    pop: () => {
      if (self.index === 0) {
        return false
      }
      self.routes.splice(self.index--, 1)
      return true
    }
  }))
  .actions(self => ({
    goBack: () => {
      self.pop()
      console.log('STATE:', JSON.stringify(self.state))
    },
    dispatch: (action, props) => {
      console.log('DISPATCH', action, props)
    },
    navigate: routeName => {
      console.log('NAVIGATE', routeName)
      const index = self.routes.findIndex(r => r.routeName === routeName)
      if (index !== -1) {
        self.jump(index)
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
        addListener: self.addListener,
        goBack: self.goBack,
        navigate: self.navigate,
        dispatch: self.dispatch,
        state: getSnapshot(self)
      }
    }
  }))
