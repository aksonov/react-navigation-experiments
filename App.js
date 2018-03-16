/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, {Component} from 'react'
import {Platform, TouchableOpacity, StyleSheet, Text, View} from 'react-native'
import {StackView, TabView, TabBarBottom} from 'react-navigation'
import Statem from './src/Router'
import {Provider, inject, observer} from 'mobx-react/native'
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
type Props = {}
const statem = new Statem()
const navigation = statem.create({
  routeName: 'statem',
  props: {globalB: 1, globalA: 123},
  wrapBy: createContainerWrapper,
  getComponent: () => TabView,
  index: 1,
  options: {
    navigationConfig: {tabBarComponent: TabBarBottom, tabBarPosition: 'bottom'},
    header: props => {
      const route = props.scene.route.routeName
      return <Header descriptor={navigation.routesByName[route].inheritedDescriptor} {...navigation.routesByName[route].allProps} {...props} />
    }
  },
  children: [
    {
      key: 'b',
      wrapBy: createWrapper,
      routeName: 'b',
      getComponent: () => Second
    },
    {
      key: 'a',
      wrapBy: createWrapper,
      getComponent: () => First,
      ab: 'abcde',
      routeName: 'a',
      props: {a: 3, title: 'aaa'},
      children: [{routeName: 'a1'}, {routeName: 'a2'}]
    }
  ]
})

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

function createWrapper(navigation, Component) {
  return class RouterView extends React.Component {
    componentWillUnmount() {
      navigation.setDescriptor({ref: undefined})
    }
    shouldComponentUpdate(props, state) {
      return false
    }
    render() {
      return <Component ref={ref => navigation.setDescriptor({ref})} descriptor={navigation.descriptor} {...navigation.allProps} {...this.props} />
    }
  }
}

function createContainerWrapper(navigation, Component) {
  return observer(props => (
    <Component
      navigation={props.navigation.snapshot}
      navigationConfig={props.navigation.descriptor.options.navigationConfig}
      // descriptors={descriptors}
      descriptors={props.navigation.descriptors}
    />
  ))
}

export default class App extends Component<Props> {
  render() {
    console.log('NAV:', navigation)
    const Root = navigation.descriptor.getComponent()
    return <Root navigation={navigation} />
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
