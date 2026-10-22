export type QuestionSwipeTransition = 'qswipe-next' | 'qswipe-prev' | 'qswipe-fade'

/**
 * 显式切题（上一题 / 下一题 / 答题卡）的换页时长。
 * 左右滑手势已移除，这里只驱动按钮与答题卡触发的过渡。
 */
export const SWIPE_ANIMATION_MS = 480
/** 答题卡跳题的淡入淡出，略短于相邻题滑页 */
export const SWIPE_FADE_MS = 340
/**
 * easeOutQuad：比 cubic-bezier(0.22, 1, 0.36, 1)（easeOutExpo）更匀速，
 * 前段不会把动作甩完。
 */
export const SWIPE_EASING = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'

export function transitionNameForIndexChange(from: number, to: number): QuestionSwipeTransition {
  if (to === from + 1) return 'qswipe-next'
  if (to === from - 1) return 'qswipe-prev'
  return 'qswipe-fade'
}
