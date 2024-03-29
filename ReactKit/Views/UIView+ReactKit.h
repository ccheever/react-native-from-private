/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#import <UIKit/UIKit.h>

#import "RCTViewNodeProtocol.h"

//TODO: let's try to eliminate this category if possible

@interface UIView (ReactKit) <RCTViewNodeProtocol>

/**
 * Used by the UIIManager to set the view frame.
 * May be overriden to disable animation, etc.
 */
- (void)reactSetFrame:(CGRect)frame;

/**
 * This method finds and returns the containing view controller for the view.
 */
- (UIViewController *)backingViewController;

/**
 * This method attaches the specified controller as a child of the
 * the owning view controller of this view. Returns NO if no view
 * controller is found (which may happen if the view is not currently
 * attached to the view hierarchy).
 */
- (void)addControllerToClosestParent:(UIViewController *)controller;

/**
 * Responder overrides - to be deprecated.
 */
- (void)reactWillMakeFirstResponder;
- (void)reactDidMakeFirstResponder;
- (BOOL)reactRespondsToTouch:(UITouch *)touch;

@end

@interface UIView (ReactKitBorders)

/**
 * Borders stuff - pay no attention to this, it's going away (#6548297)
 */
- (void)reactSetBorders;

@end
