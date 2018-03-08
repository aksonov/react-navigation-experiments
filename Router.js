import {
  types,
  getParent,
  IModelType,
  IType,
  isStateTreeNode,
  IExtendedObservableMap,
  getSnapshot,
  hasParent
} from 'mobx-state-tree';
import { IObservableArray } from 'mobx';
import * as _ from 'lodash';

let uniqueBaseId = `id-${Date.now()}`;
let uuidCount = 0;

function generateKey() {
  return `${uniqueBaseId}-${uuidCount++}`;
}
function removeKey(snapshot) {
  const res = _.cloneDeep(snapshot);
  delete res.key;
  return res;
}
export const Node = types
  .model('Node', {
    key: types.optional(types.identifier(types.string), () => generateKey()),
    routeName: types.string,
    props: types.optional(types.map(types.frozen), {}),
    type: types.maybe(types.string),
    index: types.maybe(types.number),
    routes: types.maybe(types.array(types.late(() => Node)))
  })
  .volatile(self => ({
    isActive: false
  }))
  .views(self => ({
    get routesByName() {
      return !self.routes
        ? {}
        : self.routes.reduce((map, obj) => {
            map[obj.routeName] = obj;
            return map;
          }, {});
    }
  }))
  .views(self => ({
    get allProps() {
      if (hasParent(self)) {
        let parent = getParent(self);
        while (parent && !parent.key) {
          parent = getParent(parent);
        }
        return { ...parent.allProps, ...self.props.toJS() };
      } else {
        return self.props.toJS();
      }
    },
    get current() {
      return self.routes ? self.routes[self.index].current : self;
    },
    get state() {
      return getSnapshot(self);
    }
  }))
  // .preProcessSnapshot((snapshot: any) => {
  //   _.cloneDeep(snapshot)
  //   return snapshot
  // })
  .actions(self => ({
    postProcessSnapshot: snapshot => {
      const result = {};
      Object.keys(snapshot).forEach(key => {
        if (snapshot[key] !== null) {
          result[key] = snapshot[key];
        }
      });
      return result;
    },
    afterCreate: () => {
      if (self.routes && self.index === null) {
        self.index = 0;
      }
      self.current.setActive(true);
    },
    setActive: value => {
      self.isActive = value;
    },
    setParams: (props = {}) => {
      Object.keys(props).forEach(key => self.props.set(key, props[key]));
    },
    jump: index => {
      if (index >= self.routes.length) {
        throw 'Invalid index for jump';
      }
      self.routes[self.index].setActive(false);
      self.index = index;
      self.routes[index].setActive(true);
    },
    push: s => {
      const snapshot = _.cloneDeep(s);
      if (!snapshot.props) {
        snapshot.props = {};
      }
      if (
        !self.routes.find(
          r =>
            r.key === snapshot.key ||
            _.isEqual(snapshot, removeKey(getSnapshot(r)))
        )
      ) {
        self.routes.push(Node.create(snapshot));
        self.routes[self.index].setActive(false);
        self.index = self.routes.length - 1;
        self.routes[self.index].setActive(true);
        // alert(JSON.stringify(self.routes));
        return true;
      } else {
        return false;
      }
    },
    pop: () => {
      if (self.index === 0) {
        return false;
      }
      self.routes[self.index].setActive(false);
      self.routes.splice(self.index, 1);
      self.index--;
      self.routes[self.index].setActive(true);
      return true;
    }
  }))
  .actions(self => ({
    goBack: () => {
      self.pop();
      console.log('STATE:', JSON.stringify(self.state));
    },
    replace: snapshot => {
      self.pop();
      self.push(snapshot);
    },
    reset: snapshot => {
      self.routes[self.index].setActive(false);
      self.routes.clear();
      self.push(snapshot);
    }
  }));

// const stack = Stack.create({props: {d: 2}, routeName: 'stack', routes: [{routeName: 'first', props: {data: 2}}]})
// stack.current.setParams({a: 3, b: 4, d: undefined})
// const statem = Node.create({
//   routeName: 'statem',
//   props: { globalA: 1 },
//   routes: [
//     { routeName: 'stack', routes: [{ routeName: 'a1' }] },
//     { routeName: 'a' },
//     { routeName: 'b' },
//     { routeName: 'c', props: { a: 1 } }
//   ]
// });
// statem.jump(3);

// console.log(JSON.stringify(statem.routesByName.c.isActive));
// statem.jump(2);
// console.log(JSON.stringify(statem.routesByName.c.isActive));
// console.log(JSON.stringify(statem.routesByName.c.allProps));
// statem.routesByName.stack.push({ key: '1', routeName: 'b1' });
// statem.routesByName.stack.push({ key: '1', routeName: 'b1' });
// statem.routesByName.stack.push({ key: '1', routeName: 'b1' });
// statem.routesByName.stack.push({ key: '1', routeName: 'b1' });
// statem.routesByName.stack.push({ key: '1', routeName: 'b1' });
// statem.routesByName.stack.push({ key: '1', routeName: 'b1' });
// statem.routesByName.stack.push({ key: '1', routeName: 'b1' });
// statem.routesByName.stack.push({ key: '1', routeName: 'b1' });
// statem.routesByName.stack.push({ key: '1', routeName: 'b1' });
// statem.routesByName.stack.push({ routeName: 'b1' });
// console.log(JSON.stringify(statem.routesByName.stack));
// console.log(JSON.stringify(statem));
