import {Router} from '../src/Router'

const statem = Router.create({
  routeName: 'statem',
  props: {globalA: 1},
  routes: [{routeName: 'stack', routes: [{routeName: 'a1'}, {routeName: 'b1'}]}, {routeName: 'a'}, {routeName: 'b'}, {routeName: 'c', props: {a: 1}}]
})

it('correct index', () => {
  expect(statem.index).toEqual(0)
})

it('correct current', () => {
  expect(statem.current.routeName).toEqual('stack')
})
it('correct isFocused for root', () => {
  expect(statem.isFocused()).toEqual(true)
})
it('correct isFocused for stack', () => {
  expect(statem.routesByName.stack.isFocused()).toEqual(true)
})
it('jump 3', () => {
  statem.jump(3)
  expect(statem.index).toEqual(3)
  expect(statem.routesByName.stack.isFocused()).toEqual(false)
  expect(statem.routesByName.c.isFocused()).toEqual(true)
})
it('jump 2', () => {
  statem.jump(2)
  expect(statem.index).toEqual(2)
  expect(statem.routesByName.stack.isFocused()).toEqual(false)
  expect(statem.routesByName.c.isFocused()).toEqual(false)
  expect(statem.routesByName.b.isFocused()).toEqual(true)
})
it('push', () => {
  statem.push({routeName: 'd'})
  expect(statem.index).toEqual(4)
  expect(statem.routesByName.stack.isFocused()).toEqual(false)
  expect(statem.routesByName.c.isFocused()).toEqual(false)
  expect(statem.routesByName.b.isFocused()).toEqual(false)
  expect(statem.routesByName.d.isFocused()).toEqual(true)
})
it('replace', () => {
  statem.replace({routeName: 'e'})
  expect(statem.index).toEqual(4)
  expect(statem.routesByName.stack.isFocused()).toEqual(false)
  expect(statem.routesByName.c.isFocused()).toEqual(false)
  expect(statem.routesByName.b.isFocused()).toEqual(false)
  expect(statem.routesByName.d).toEqual(undefined)
  expect(statem.routesByName.e.isFocused()).toEqual(true)
})

it('replace', () => {
  expect(statem.pop()).toEqual(true)
  expect(statem.index).toEqual(3)
  expect(statem.routesByName.stack.isFocused()).toEqual(false)
  expect(statem.routesByName.b.isFocused()).toEqual(false)
  expect(statem.routesByName.d).toEqual(undefined)
  expect(statem.routesByName.e).toEqual(undefined)
  expect(statem.routesByName.c.isFocused()).toEqual(true)
})
