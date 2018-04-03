/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, {Component} from 'react'
import {Platform, TouchableOpacity, StyleSheet, Text, View} from 'react-native'
import {StackView, TabView, DrawerView, TabBarBottom} from 'react-navigation'
import {create} from './src/Route'
import {observer} from 'mobx-react/native'
import {observable} from 'mobx'
import First from './src/First'
import * as _ from 'lodash'

const instructions = Platform.select({
  ios: 'Press Cmd+R to reload,\n' + 'Cmd+D or shake for dev menu',
  android: 'Double tap R on your keyboard to reload,\n' + 'Shake or press menu button for dev menu'
})

class Second extends Component {
  title = 'Second'
  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.instructions}>Second screen</Text>
      </View>
    )
  }
}
const tabs = {
  routeName: 'statem',
  props: {globalB: 1, globalA: 123},
  getContentComponent: () => TabView,
  getComponent: () => Container,
  index: 1,
  tabs: true,
  options: {
    navigationConfig: {swipeEnabled: false, tabBarComponent: TabBarBottom, tabBarPosition: 'bottom'},
    header: props => {
      const route = props.scene.route.routeName
      return <Header descriptor={navigation.routesByName[route].inheritedDescriptor} {...navigation.routesByName[route].allProps} {...props} />
    }
  },
  children: [
    {
      key: 'b',
      routeName: 'b',
      getContentComponent: () => Second,
      getComponent: () => RouterView
    },
    {
      key: 'a',
      getContentComponent: () => First,
      getComponent: () => RouterView,
      ab: 'abcde',
      routeName: 'a',
      props: {a: 3, title: 'aaa'},
      options: {
        header: props => {
          const route = props.scene.route.routeName
          const descriptor = navigation.routesByName[route].inheritedDescriptor
          if (descriptor.options.hideNavBar) {
            return null
          }
          return <Header descriptor={descriptor} {...navigation.routesByName[route].allProps} {...props} />
        }
      },
      children: [
        {
          options: {hideNavBar: false},
          routeName: 'a1',
          props: {globalA: 222},
          getContentComponent: () => First,
          getComponent: () => RouterView
        },
        {
          routeName: 'a2',
          getContentComponent: () => First,
          getComponent: () => RouterView
        }
      ]
    }
  ]
}

// const navigation = create({
//   routeName: 'drawer',
//   options: {
//     navigationConfig: {drawerWidth: 200, tabBarComponent: TabBarBottom, tabBarPosition: 'bottom', contentComponent: First}
//   },
//   getComponent: () => Container,
//   getContentComponent: () => DrawerView,
//   isDrawerOpen: false,
//   routes: [tabs]
// })
const navigation = create(tabs)
const Header = observer(({navigation, descriptor, title}) => {
  return (
    <View style={{backgroundColor: 'white', height: 70, alignItems: 'center', justifyContent: 'center'}}>
      <Text>
        {descriptor.ref && descriptor.ref.title}
        {descriptor.ab}
      </Text>
    </View>
  )
})

class RouterView extends React.Component {
  componentWillUnmount() {
    this.props.navigation.setDescriptor({ref: undefined})
  }
  shouldComponentUpdate(props, state) {
    return false
  }
  render() {
    const {navigation} = this.props
    const Component = navigation.descriptor.getContentComponent(this.props.navigation)
    if (!Component) {
      throw 'No getContentComponent is defined'
    }
    return <Component ref={ref => navigation.setDescriptor({ref})} descriptor={navigation.descriptor} {...navigation.allProps} {...this.props} />
  }
}

@observer
class Container extends React.Component {
  render() {
    const {navigation} = this.props
    const Component = navigation.descriptor.getContentComponent(this.props.navigation)
    if (!Component) {
      throw 'No getContentComponent is defined'
    }
    return (
      <Component
        navigation={navigation.snapshot || navigation}
        navigationConfig={navigation.descriptor.options.navigationConfig}
        // descriptors={descriptors}
        descriptors={navigation.descriptors}
      />
    )
  }
}

export default class Root extends React.Component {
  render() {
    const Component = navigation.descriptor.getComponent()
    return <Component navigation={navigation} />
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF'
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5
  }
})
