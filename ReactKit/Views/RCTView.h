/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#import "RCTView.h"

#import <UIKit/UIKit.h>

#import "RCTPointerEvents.h"

@protocol RCTAutoInsetsProtocol;

@interface RCTView : UIView

/**
 * Used to control how touch events are processed.
 */
@property (nonatomic, assign) RCTPointerEvents pointerEvents;

+ (void)autoAdjustInsetsForView:(UIView<RCTAutoInsetsProtocol> *)parentView
                 withScrollView:(UIScrollView *)scrollView
                   updateOffset:(BOOL)updateOffset;

/**
 * Find the first view controller whose view, or any subview is the specified view.
 */
+ (UIEdgeInsets)contentInsetsForView:(UIView *)curView;

/**
 * This is an optimization used to improve performance
 * for large scrolling views with many subviews, such as a
 * list or table. If set to YES, any clipped subviews will
 * be removed from the view hierarchy whenever -updateClippedSubviews
 * is called. This would typically be triggered by a scroll event
 */
@property (nonatomic, assign) BOOL removeClippedSubviews;

/**
 * Hide subviews if they are outside the view bounds.
 * This is an optimisation used predominantly with RKScrollViews
 * but it is applied recursively to all subviews that have
 * removeClippedSubviews set to YES
 */
- (void)updateClippedSubviews;

@end
