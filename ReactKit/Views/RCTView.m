/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#import "RCTView.h"

#import "RCTAutoInsetsProtocol.h"
#import "RCTConvert.h"
#import "RCTLog.h"
#import "UIView+ReactKit.h"

@implementation UIView (RCTViewUnmounting)

- (void)react_remountAllSubviews
{
  // Normal views don't support unmounting, so all
  // this does is forward message to our subviews,
  // in case any of those do support it

  for (UIView *subview in self.subviews) {
    [subview react_remountAllSubviews];
  }
}

- (void)react_updateClippedSubviewsWithClipRect:(CGRect)clipRect relativeToView:(UIView *)clipView
{
  // Even though we don't support subview unmounting
  // we do support clipsToBounds, so if that's enabled
  // we'll update the clipping

  if (self.clipsToBounds && [self.subviews count] > 0) {
    clipRect = [clipView convertRect:clipRect toView:self];
    clipRect = CGRectIntersection(clipRect, self.bounds);
    clipView = self;
  }

  // Normal views don't support unmounting, so all
  // this does is forward message to our subviews,
  // in case any of those do support it

  for (UIView *subview in self.subviews) {
    [subview react_updateClippedSubviewsWithClipRect:clipRect relativeToView:clipView];
  }
}

- (UIView *)react_findClipView
{
  UIView *testView = self;
  UIView *clipView = nil;
  CGRect clipRect = self.bounds;
  while (testView) {
    if (testView.clipsToBounds) {
      if (clipView) {
        CGRect testRect = [clipView convertRect:clipRect toView:testView];
        if (!CGRectContainsRect(testView.bounds, testRect)) {
          clipView = testView;
          clipRect = CGRectIntersection(testView.bounds, testRect);
        }
      } else {
        clipView = testView;
        clipRect = [self convertRect:self.bounds toView:clipView];
      }
    }
    testView = testView.superview;
  }
  return clipView ?: self.window;
}

@end

static NSString *RCTRecursiveAccessibilityLabel(UIView *view)
{
  NSMutableString *str = [NSMutableString stringWithString:@""];
  for (UIView *subview in view.subviews) {
    NSString *label = [subview accessibilityLabel];
    if (label) {
      [str appendString:@" "];
      [str appendString:label];
    } else {
      [str appendString:RCTRecursiveAccessibilityLabel(subview)];
    }
  }
  return str;
}

@implementation RCTView
{
  NSMutableArray *_reactSubviews;
}

- (NSString *)accessibilityLabel
{
  if (super.accessibilityLabel) {
    return super.accessibilityLabel;
  }
  return RCTRecursiveAccessibilityLabel(self);
}

- (void)setPointerEvents:(RCTPointerEvents)pointerEvents
{
  _pointerEvents = pointerEvents;
  self.userInteractionEnabled = (pointerEvents != RCTPointerEventsNone);
  if (pointerEvents == RCTPointerEventsBoxNone) {
    self.accessibilityViewIsModal = NO; // TODO: find out what this is for
  }
}

- (UIView *)hitTest:(CGPoint)point withEvent:(UIEvent *)event
{
  switch (_pointerEvents) {
    case RCTPointerEventsNone:
      return nil;
    case RCTPointerEventsUnspecified:
      return [super hitTest:point withEvent:event];
    case RCTPointerEventsBoxOnly:
      return [super hitTest:point withEvent:event] ? self: nil;
    case RCTPointerEventsBoxNone:
      for (UIView *subview in [self.subviews reverseObjectEnumerator]) {
        if (!subview.isHidden && subview.isUserInteractionEnabled && subview.alpha > 0) {
          CGPoint convertedPoint = [subview convertPoint:point fromView:self];
          UIView *subviewHitTestView = [subview hitTest:convertedPoint withEvent:event];
          if (subviewHitTestView != nil) {
            return subviewHitTestView;
          }
        }
      }
      return nil;
    default:
      RCTLogError(@"Invalid pointer-events specified %zd on %@", _pointerEvents, self);
      return [super hitTest:point withEvent:event];
  }
}

#pragma mark - Statics for dealing with layoutGuides

+ (void)autoAdjustInsetsForView:(UIView<RCTAutoInsetsProtocol> *)parentView
                 withScrollView:(UIScrollView *)scrollView
                   updateOffset:(BOOL)updateOffset
{
  UIEdgeInsets baseInset = parentView.contentInset;
  CGFloat previousInsetTop = scrollView.contentInset.top;
  CGPoint contentOffset = scrollView.contentOffset;

  if (parentView.automaticallyAdjustContentInsets) {
    UIEdgeInsets autoInset = [self contentInsetsForView:parentView];
    baseInset.top += autoInset.top;
    baseInset.bottom += autoInset.bottom;
    baseInset.left += autoInset.left;
    baseInset.right += autoInset.right;
  }
  [scrollView setContentInset:baseInset];
  [scrollView setScrollIndicatorInsets:baseInset];

  if (updateOffset) {
    // If we're adjusting the top inset, then let's also adjust the contentOffset so that the view
    // elements above the top guide do not cover the content.
    // This is generally only needed when your views are initially laid out, for
    // manual changes to contentOffset, you can optionally disable this step
    CGFloat currentInsetTop = scrollView.contentInset.top;
    if (currentInsetTop != previousInsetTop) {
      contentOffset.y -= (currentInsetTop - previousInsetTop);
      scrollView.contentOffset = contentOffset;
    }
  }
}

+ (UIEdgeInsets)contentInsetsForView:(UIView *)view
{
  while (view) {
    UIViewController *controller = view.backingViewController;
    if (controller) {
      return (UIEdgeInsets){
        controller.topLayoutGuide.length, 0,
        controller.bottomLayoutGuide.length, 0
      };
    }
    view = view.superview;
  }
  return UIEdgeInsetsZero;
}

#pragma mark - View unmounting

- (void)react_remountAllSubviews
{
  if (_reactSubviews) {
    NSInteger index = 0;
    for (UIView *view in _reactSubviews) {
      if (view.superview != self) {
        if (index < [self subviews].count) {
          [self insertSubview:view atIndex:index];
        } else {
          [self addSubview:view];
        }
        [view react_remountAllSubviews];
      }
      index++;
    }
  } else {
    // If react_subviews is nil, we must already be showing all subviews
    [super react_remountAllSubviews];
  }
}

- (void)remountSubview:(UIView *)view
{
  // Calculate insertion index for view
  NSInteger index = 0;
  for (UIView *subview in _reactSubviews) {
    if (subview == view) {
      [self insertSubview:view atIndex:index];
      break;
    }
    if (subview.superview) {
      // View is mounted, so bump the index
      index++;
    }
  }
}

- (void)mountOrUnmountSubview:(UIView *)view withClipRect:(CGRect)clipRect relativeToView:(UIView *)clipView
{
  if (view.clipsToBounds) {

    // View has cliping enabled, so we can easily test if it is partially
    // or completely within the clipRect, and mount or unmount it accordingly

    if (CGRectIntersectsRect(clipRect, view.frame)) {

      // View is at least partially visible, so remount it if unmounted
      if (view.superview == nil) {
        [self remountSubview:view];
      }

      // Then test its subviews
      if (CGRectContainsRect(clipRect, view.frame)) {
        [view react_remountAllSubviews];
      } else {
        [view react_updateClippedSubviewsWithClipRect:clipRect relativeToView:clipView];
      }

    } else if (view.superview) {

      // View is completely outside the clipRect, so unmount it
      [view removeFromSuperview];
    }

  } else {

    // View has clipping disabled, so there's no way to tell if it has
    // any visible subviews without an expensive recursive test, so we'll
    // just add it.

    if (view.superview == nil) {
      [self remountSubview:view];
    }

    // Check if subviews need to be mounted/unmounted
    [view react_updateClippedSubviewsWithClipRect:clipRect relativeToView:clipView];
  }
}

- (void)react_updateClippedSubviewsWithClipRect:(CGRect)clipRect relativeToView:(UIView *)clipView
{
  // TODO (#5906496): for scrollviews (the primary use-case) we could
  // optimize this by only doing a range check along the scroll axis,
  // instead of comparing the whole frame

  if (_reactSubviews == nil) {
    // Use default behavior if unmounting is disabled
    return [super react_updateClippedSubviewsWithClipRect:clipRect relativeToView:clipView];
  }

  if ([_reactSubviews count] == 0) {
    // Do nothing if we have no subviews
    return;
  }

  if (CGSizeEqualToSize(self.bounds.size, CGSizeZero)) {
    // Do nothing if layout hasn't happened yet
    return;
  }

  // Convert clipping rect to local coordinates
  clipRect = [clipView convertRect:clipRect toView:self];
  clipView = self;
  if (self.clipsToBounds) {
    clipRect = CGRectIntersection(clipRect, self.bounds);
  }

  // Mount / unmount views
  for (UIView *view in _reactSubviews) {
    [self mountOrUnmountSubview:view withClipRect:clipRect relativeToView:clipView];
  }
}

- (void)setRemoveClippedSubviews:(BOOL)removeClippedSubviews
{
  if (removeClippedSubviews && !_reactSubviews) {
    _reactSubviews = [self.subviews mutableCopy];
  } else if (!removeClippedSubviews && _reactSubviews) {
    [self react_remountAllSubviews];
    _reactSubviews = nil;
  }
}

- (BOOL)removeClippedSubviews
{
  return _reactSubviews != nil;
}

- (void)insertReactSubview:(UIView *)view atIndex:(NSInteger)atIndex
{
  if (_reactSubviews == nil) {
    [self insertSubview:view atIndex:atIndex];
  } else {
    [_reactSubviews insertObject:view atIndex:atIndex];

    // Find a suitable view to use for clipping
    UIView *clipView = [self react_findClipView];
    if (clipView) {

      // If possible, don't add subviews if they are clipped
      [self mountOrUnmountSubview:view withClipRect:clipView.bounds relativeToView:clipView];

    } else {

      // Fallback if we can't find a suitable clipView
      [self remountSubview:view];
    }
  }
}

- (void)removeReactSubview:(UIView *)subview
{
  [_reactSubviews removeObject:subview];
  [subview removeFromSuperview];
}

- (NSArray *)reactSubviews
{
  // The _reactSubviews array is only used when we have hidden
  // offscreen views. If _reactSubviews is nil, we can assume
  // that [self reactSubviews] and [self subviews] are the same

  return _reactSubviews ?: [self subviews];
}

- (void)updateClippedSubviews
{
  // Find a suitable view to use for clipping
  UIView *clipView = [self react_findClipView];
  if (clipView) {
    [self react_updateClippedSubviewsWithClipRect:clipView.bounds relativeToView:clipView];
  }
}

- (void)layoutSubviews
{
  // TODO (#5906496): this a nasty performance drain, but necessary
  // to prevent gaps appearing when the loading spinner disappears.
  // We might be able to fix this another way by triggering a call
  // to updateClippedSubviews manually after loading

  [super layoutSubviews];
  if (_reactSubviews) {
    [self updateClippedSubviews];
  }
}

@end
