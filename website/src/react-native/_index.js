/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

var Prism = require('Prism');
var React = require('React');
var Site = require('Site');

var index = React.createClass({
  render: function() {
    return (
      <Site>
        <div className="hero">
          <div className="wrap">
            <div className="text"><strong>React Native</strong></div>
            <div className="minitext">
              Build native apps using React
            </div>
          </div>
        </div>

        <section className="content wrap">

          <div className="buttons-unit">
            <a href="docs/getting-started.html#content" className="button">Get started with React Native</a>
          </div>

          <div style={{margin: '60px auto', width: 800}}>

          <h2>Native iOS Components</h2>
          <p>
            With React Native, you can use the standard platform components such as UITabBar and UINavigationController on iOS.  This gives your app a consistent look and feel with the rest of the platform ecosystem, and keeps the quality bar high.  These components are easily incorporated into your app using their React component counterparts, such as TabBarIOS and NavigatorIOS.
          </p>
          <Prism>
{`var React = require('react-native');
var { TabBarIOS, NavigatorIOS } = React;
module.exports = React.createClass({
  render: function() {
    return (
      <TabBarIOS>
        <TabBarIOS.Item title="React Native" selected={true}>
          <NavigatorIOS initialRoute={{ title: 'React Native' }} />
        </TabBarIOS.Item>
      </TabBarIOS>
    );
  },
});`}
          </Prism>

          <h2>Asynchronous Execution</h2>
          <p>
            All operations between the JavaScript application code and the native platform are performed asynchronously, and the native modules can also make use of additional threads as well.  This means we can decode images off of the main thread, save to disk in the background, measure text and compute layouts without blocking the UI, and more.  As a result, React Native apps are naturally fluid and responsive.  The communication is also fully serializable, which allows us to leverage Chrome Developer Tools to debug the JavaScript while running the complete app, either in the simulator or on a physical device.
          </p>
          <img src="/react-native/img/chrome_breakpoint.png" width="800" height="606" />

          <h2>Touch Handling</h2>
          <p>
            iOS has a very powerful system called the Responder Chain to negotiate touches in complex view hierarchies which does not have a universal analog on the web. React Native implements a similar responder system and provides high level components such as TouchableHighlight that integrate properly with scroll views and other elements without any additional configuration.
          </p>
          <Prism>
{`var React = require('react-native');
var { ScrollView, TouchableHighlight, Text } = React;
module.exports = React.createClass({
  render: function() {
    return (
      <ScrollView>
        <TouchableHighlight onPress={() => console.log('pressed')}>
          <Text>Proper Touch Handling</Text>
        </TouchableHighlight>
      </ScrollView>
    );
  },
});`}
          </Prism>

          <h2>Flexbox and Styling</h2>
          <p>
            Laying out views should be easy, which is why we brought the flexbox layout model from the web to React Native.  Flexbox makes it simple to build the most common UI layouts, such as stacked and nested boxes with margin and padding.  React Native also supports common web syles, such as fontWeight, and the StyleSheet abstraction provides an optimized mechanism to declare all your styles and layout right along with the components that use them and apply them inline.
          </p>
          <Prism>
{`var React = require('react-native');
var { Image, StyleSheet, Text, View } = React;
module.exports = React.createClass({
  render: function() {
    return (
      <View style={styles.row}>
        <Image
          source={{uri: 'http://facebook.github.io/react/img/logo_og.png'}}
          style={styles.image}
        />
        <View style={styles.text}>
          <Text style={styles.title}>
            React Native
          </Text>
          <Text style={styles.subtitle}>
            Build high quality mobile apps using React
          </Text>
        </View>
      </View>
    );
  },
});
var styles = StyleSheet.create({
  row: { flexDirection: 'row', margin: 40 },
  image: { width: 40, height: 40, marginRight: 10 },
  text: { flex: 1, justifyContent: 'center'},
  title: { fontSize: 11, fontWeight: 'bold' },
  subtitle: { fontSize: 10 },
});`}
          </Prism>

          <h2>Polyfills</h2>
          <p>
            React Native is focused on changing the way view code is written.  For the rest, we look to the web for universal standards and polyfill those APIs where appropriate. You can use npm to install JavaScript libraries that work on top of the functionality baked into React Native, such as XMLHttpRequest, window.requestAnimationFrame, and navigator.geolocation.  We are working on expanding the available APIs, and are excited for the Open Source community to contribute as well.
          </p>
          <Prism>
{`var React = require('react-native');
var { Text } = React;
module.exports = React.createClass({
  getInitialState: function() {
    return { position: 'unknown' };
  },
  componentDidMount: function() {
    navigator.geolocation.getCurrentPosition(
      (position) => this.setState({position}),
      (error) => console.error(error)
    );
  },
  render: function() {
    return (
      <Text>
        Position: {JSON.stringify(this.state.position)}
      </Text>
    );
  },
});`}
          </Prism>

          <h2>Extensibility</h2>
          <p>
            It is certainly possible to create a great app using React Native without writing a single line of native code, but React Native is also designed to be easily expended with custom native views and modules - that means you can reuse anything you{"'"}ve already built, and can import and use your favorite native libraries.  To create a simple module in iOS, create a new class that implements the RCTBridgeModule protocol, and add RCT_EXPORT to the function you want to make available in JavaScript.
          </p>
          <Prism>
{`// Objective-C

#import "RCTBridgeModule.h"

@interface MyCustomModule : NSObject <RCTBridgeModule>
@end

@implementation MyCustomModule

- (void)processString:(NSString *)input callback:(RCTResponseSenderBlock)callback
{
  RCT_EXPORT(); // available as NativeModules.MyCustomModule.processString
  callback(@[[input stringByReplacingOccurrencesOfString:@"Goodbye" withString:@"Hello"];]]);
}
@end`}
          </Prism>
          <Prism>
{`// JavaScript

var React = require('react-native');
var { NativeModules, Text } = React;

var Message = React.createClass({
  render: function() {
    getInitialState() {
      return { text: 'Goodbye World.' };
    },
    componentDidMount() {
      NativeModules.MyCustomModule.processString(this.state.text, (text) => {
        this.setState({text});
      });
    },
    return (
      <Text>{this.state.text}</Text>
    );
  },
});`}
          </Prism>
          <p>
            Custom iOS views can be exposed by subclassing RCTViewManager, implementing a -(UIView *)view method, and exporting properties with the RCT_EXPORT_VIEW_PROPERTY macro.  Then a simple JavaScript file connects the dots.
          </p>
          <Prism>
{`// Objective-C

#import "RCTViewManager.h"

@interface MyCustomViewManager : RCTViewManager
@end

@implementation MyCustomViewManager

- (UIView *)view
{
  return [[MyCustomView alloc] init];
}

RCT_EXPORT_VIEW_PROPERTY(myCustomProperty);
@end`}
          </Prism>
          <Prism>
{`// JavaScript

module.exports = createReactIOSNativeComponentClass({
  validAttributes: { myCustomProperty: true },
  uiViewClassName: 'MyCustomView',
});`}
          </Prism>
          </div>
          <section className="home-bottom-section">
            <div className="buttons-unit">
              <a href="docs/getting-started.html#content" className="button">Get started with React Native</a>
            </div>
          </section>
        </section>
      </Site>
    );
  }
});

module.exports = index;
