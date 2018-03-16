import NavigationStore from '../src/Router'
import {when} from 'mobx'

async function waitFor(condition) {
  return new Promise((resolve, reject) => {
    when(
      () => {
        let res = false
        try {
          res = condition()
        } catch (e) {
          reject(e)
        }
        return res
      },
      () => {
        resolve()
      }
    )
  })
}
const navigation = new NavigationStore()
const statem = navigation.create({
  routeName: 'statem',
  props: {globalA: 1},
  type: 'tabs',
  children: [
    {routeName: 'stack', children: [{routeName: 'a1'}, {routeName: 'b1'}, {routeName: 'c1'}]},
    {routeName: 'a'},
    {
      routeName: 'b',
      success: 'a',
      onEnter: () => {
        console.log('ENTER B')
        return new Promise(resolve => setTimeout(() => resolve(true), 500))
      }
    },
    {routeName: 'c', children: [{routeName: 'a3'}, {routeName: 'b3'}], props: {a: 1}}
  ]
})
it('correct index', () => {
  expect(statem.index).toEqual(0)
})

it('correct current', () => {
  expect(statem.current.routeName).toEqual('stack')
})
it('correct isFocused for root', () => {
  expect(statem.isFocused).toEqual(true)
})
it('correct isFocused for stack', () => {
  expect(statem.routesByName.stack.isFocused).toEqual(true)
})
it('jump 3 using shortcut method', () => {
  statem.c()
  expect(statem.index).toEqual(3)
  expect(statem.routesByName.stack.isFocused).toEqual(false)
  expect(statem.routesByName.c.isFocused).toEqual(true)
})
it('jump to b1 using shortcut method', () => {
  statem.b1()
  expect(statem.index).toEqual(0)
  expect(statem.routesByName.c.isFocused).toEqual(false)
  expect(statem.routesByName.stack.isFocused).toEqual(true)
  expect(statem.routesByName.b1.isFocused).toEqual(true)
})
it('jump 2', () => {
  statem.navigate('b') // but it should redirect to 'a'
  expect(statem.index).toEqual(2)
  expect(statem.routesByName.stack.isFocused).toEqual(false)
  expect(statem.routesByName.c.isFocused).toEqual(false)
  expect(statem.routesByName.b.isFocused).toEqual(true)
})
it('wait for redirect', async () => {
  expect.assertions(2)
  await waitFor(() => statem.index === 1)
  expect(statem.routesByName.b.isFocused).toEqual(false)
  expect(statem.routesByName.a.isFocused).toEqual(true)
})
it('push', () => {
  statem.push({routeName: 'd', props: {data: 2}})
  expect(statem.index).toEqual(4)
  expect(statem.routesByName.stack.isFocused).toEqual(false)
  expect(statem.routesByName.c.isFocused).toEqual(false)
  expect(statem.routesByName.b.isFocused).toEqual(false)
  expect(statem.routesByName.d.isFocused).toEqual(true)
  expect(statem.routesByName.d.props.toJS()).toEqual({data: 2})
})
it('push the same', () => {
  statem.push({routeName: 'd', props: {data: 2}})
  expect(statem.index).toEqual(4)
  expect(statem.routesByName.stack.isFocused).toEqual(false)
  expect(statem.routesByName.c.isFocused).toEqual(false)
  expect(statem.routesByName.b.isFocused).toEqual(false)
  expect(statem.routesByName.d.isFocused).toEqual(true)
})
it('replace', () => {
  statem.replace({routeName: 'e'})
  expect(statem.index).toEqual(4)
  expect(statem.routesByName.stack.isFocused).toEqual(false)
  expect(statem.routesByName.c.isFocused).toEqual(false)
  expect(statem.routesByName.b.isFocused).toEqual(false)
  expect(statem.routesByName.d).toEqual(undefined)
  expect(statem.routesByName.e.isFocused).toEqual(true)
})

it('replace', () => {
  expect(statem.pop()).toEqual(true)
  expect(statem.index).toEqual(3)
  expect(statem.routesByName.stack.isFocused).toEqual(false)
  expect(statem.routesByName.b.isFocused).toEqual(false)
  expect(statem.routesByName.d).toEqual(undefined)
  expect(statem.routesByName.e).toEqual(undefined)
  expect(statem.routesByName.c.isFocused).toEqual(true)
})
