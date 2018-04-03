import {types, getParent, destroy, getType, clone, getRoot, detach, IModelType, IType, isStateTreeNode, IExtendedObservableMap, getSnapshot, hasParent} from 'mobx-state-tree'
import {IObservableArray, reaction} from 'mobx'
import * as _ from 'lodash'

import {Node} from './Node'
import {Stack} from './Stack'
import {Tabs} from './Tabs'
import {Drawer} from './Drawer'

export const COMPLETE_TRANSITION = 'Navigation/COMPLETE_TRANSITION'
export const BACK = 'Navigation/BACK'
export const INIT = 'Navigation/INIT'
export const NAVIGATE = 'Navigation/NAVIGATE'
export const POP = 'Navigation/POP'
export const POP_TO_TOP = 'Navigation/POP_TO_TOP'
export const PUSH = 'Navigation/PUSH'
export const RESET = 'Navigation/RESET'
export const REPLACE = 'Navigation/REPLACE'
export const SET_PARAMS = 'Navigation/SET_PARAMS'
export const URI = 'Navigation/URI'
export const OPEN_DRAWER = 'Navigation/OPEN_DRAWER'
export const CLOSE_DRAWER = 'Navigation/CLOSE_DRAWER'
export const TOGGLE_DRAWER = 'Navigation/TOGGLE_DRAWER'

export const Route = types.union(
  s => {
    if (s.tabs) {
      return Tabs
    } else if (s.isDrawerOpen) {
      return Drawer
    } else if (s.children) {
      return Stack
    } else {
      return Node
    }
  },
  Node,
  Stack,
  Tabs,
  Drawer
)

function getRouteNames(routeName, children = []) {
  return [routeName].concat(_.flatMap(children, ({routeName, children}) => getRouteNames(routeName, children)))
}

export function create(scenes) {
  const routeNames = getRouteNames(scenes.routeName, scenes.children)
  const typeMap = {
    pop: {type: POP},
    navigate: {type: NAVIGATE},
    refresh: {type: SET_PARAMS},
    popToTop: {type: POP_TO_TOP},
    openDrawer: {type: OPEN_DRAWER},
    closeDrawer: {type: CLOSE_DRAWER},
    toggleDrawer: {type: TOGGLE_DRAWER}
  }
  routeNames.forEach(routeName => (typeMap[routeName] = {type: NAVIGATE, routeName}))
  return new Proxy(createScene(scenes), {
    get: function(obj, prop) {
      if (typeMap[prop]) {
        if (prop === 'navigate') {
          return (routeName, props = {}) => obj.dispatch({routeName, type: NAVIGATE, ...props})
        }
        return props => obj.dispatch({...typeMap[prop], ...props})
      }
      return obj[prop]
    }
  })
}
export function createScene(scene) {
  const res = Route.create(scene)
  res.init(scene)
  return res
}
