/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
  Platform,
  TouchableOpacity,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { StackView } from 'react-navigation';
import { Node } from './Router';
import { Provider, inject, observer } from 'mobx-react/native';
import { observable } from 'mobx';

const instructions = Platform.select({
  ios: 'Press Cmd+R to reload,\n' + 'Cmd+D or shake for dev menu',
  android:
    'Double tap R on your keyboard to reload,\n' +
    'Shake or press menu button for dev menu'
});

type Props = {};
class Store {
  @observable
  navigation = Node.create({
    routeName: 'statem',
    props: { globalA: 1 },
    index: 1,
    routes: [{ key: 'b', routeName: 'b' }, { key: 'a', routeName: 'a' }]
  });
}

const store = new Store();

class First extends Component {
  render() {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          onPress={() =>
            this.props.navigation.push({ key: 'b', routeName: 'b' })
          }
        >
          <Text style={styles.instructions}>First screen</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

class Second extends Component {
  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.instructions}>Second screen</Text>
      </View>
    );
  }
}

const descriptors = {
  a: {
    navigation: store.navigation,
    options: {},
    getComponent: () => First
  },
  b: {
    navigation: store.navigation,
    options: {},
    getComponent: () => Second
  }
};

@inject('store')
@observer
class Root extends Component<Props> {
  render() {
    console.log(
      'RENDER ROOT',
      JSON.stringify(this.props.store.navigation.state)
    );
    return (
      <StackView
        navigation={this.props.store.navigation}
        descriptors={descriptors}
      />
    );
  }
}

export default class App extends Component<Props> {
  render() {
    return (
      <Provider store={store}>
        <Root />
      </Provider>
    );
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
});