/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#import "RCTTabBarItemManager.h"

#import "RCTConvert.h"
#import "RCTTabBarItem.h"

@implementation RCTTabBarItemManager

- (UIView *)view
{
  return [[RCTTabBarItem alloc] init];
}

RCT_EXPORT_VIEW_PROPERTY(selected);
RCT_EXPORT_VIEW_PROPERTY(icon);
RCT_REMAP_VIEW_PROPERTY(selectedIcon, barItem.selectedImage);
RCT_REMAP_VIEW_PROPERTY(badgeValue, barItem.badgeValue);
RCT_CUSTOM_VIEW_PROPERTY(title, RCTTabBarItem)
{
  view.barItem.title = json ? [RCTConvert NSString:json] : defaultView.barItem.title;
  view.barItem.imageInsets = [view.barItem.title length] ? UIEdgeInsetsZero : (UIEdgeInsets){6, 0, -6, 0};
}

@end
