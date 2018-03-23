import {types, getParent, destroy, getType, clone, getRoot, detach, IModelType, IType, isStateTreeNode, IExtendedObservableMap, getSnapshot, hasParent} from 'mobx-state-tree'
import {IObservableArray, reaction} from 'mobx'

import {Node} from './Node'
import {Stack} from './Stack'
import {Tabs} from './Tabs'
import {Drawer} from './Drawer'

export const Route = types.union(
  s => {
    if (s.tabs) {
      return Tabs
    } else if (s.isDrawerOpen) {
      return Drawer
    } else if (s.routes) {
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
export function create(scene) {
  const res = Route.create(scene)
  res.init(scene)
  return res
}
const route = create({routeName: 'a', tabs: true, routes: [{routeName: 'b'}]})
console.log(JSON.stringify(route))
