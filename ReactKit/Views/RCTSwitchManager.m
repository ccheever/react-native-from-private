/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#import "RCTSwitchManager.h"

#import "RCTBridge.h"
#import "RCTEventDispatcher.h"
#import "RCTSwitch.h"
#import "UIView+ReactKit.h"

@implementation RCTSwitchManager

- (UIView *)view
{
  RCTSwitch *switcher = [[RCTSwitch alloc] init];
  [switcher addTarget:self
               action:@selector(onChange:)
     forControlEvents:UIControlEventValueChanged];
  return switcher;
}

- (void)onChange:(RCTSwitch *)sender
{
  if (sender.wasOn != sender.on) {
    [self.bridge.eventDispatcher sendInputEventWithName:@"topChange" body:@{
       @"target": sender.reactTag,
       @"value": @(sender.on)
     }];

    sender.wasOn = sender.on;
  }
}

RCT_EXPORT_VIEW_PROPERTY(onTintColor);
RCT_EXPORT_VIEW_PROPERTY(tintColor);
RCT_EXPORT_VIEW_PROPERTY(thumbTintColor);
RCT_EXPORT_VIEW_PROPERTY(on);
RCT_EXPORT_VIEW_PROPERTY(enabled);

@end
