import React, {Component} from 'react'
import {TouchableOpacity, View, Text, StyleSheet} from 'react-native'
import {observable} from 'mobx'
export default class First extends Component {
  @observable title = 'First'
  render() {
    // <TouchableOpacity onPress={() => this.props.navigation.push({key: 'c', routeName: 'c'})}>
    // alert(JSON.stringify(this.props.navigation.descriptor.options))
    // <TouchableOpacity onPress={() => this.props.navigation.setDescriptor({globalA: 'abcd'})}>
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={() => (this.title = 'abcd')}>
          <Text style={styles.instructions}>Change title to abcd: {this.props.globalB}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => this.props.navigation.setDescriptor({ab: 1231232})}>
          <Text style={styles.instructions}>Change title to abcd: {this.props.globalB}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => this.props.navigation.pop()}>
          <Text style={styles.instructions}>POP</Text>
        </TouchableOpacity>
      </View>
    )
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
