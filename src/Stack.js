import {types, getParent, destroy, getType, clone, getRoot, detach, IModelType, IType, isStateTreeNode, IExtendedObservableMap, getSnapshot, hasParent} from 'mobx-state-tree'
import {Container} from './Container'

export const Stack = Container.named('Stack')
