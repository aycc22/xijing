import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it } from 'vitest'
import {
  examResultPath,
  examReviewPath,
  practiceResultPath,
  practiceReviewPath,
} from './history'

const Dummy = { render: () => null }

describe('result review route matching', () => {
  it('keeps summary and review on distinct named routes', () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/exam-result/:sessionId/review', name: 'exam-result-review', component: Dummy },
        { path: '/exam-result/:sessionId', name: 'exam-result', component: Dummy },
        { path: '/result/:sessionId/review', name: 'result-review', component: Dummy },
        { path: '/result/:sessionId', name: 'result', component: Dummy },
      ],
    })

    const practiceReview = router.resolve(practiceReviewPath('s1'))
    expect(practiceReview.name).toBe('result-review')
    expect(practiceReview.params.sessionId).toBe('s1')
    expect(router.resolve(practiceResultPath('s1')).name).toBe('result')

    const examReview = router.resolve(examReviewPath('e1'))
    expect(examReview.name).toBe('exam-result-review')
    expect(examReview.params.sessionId).toBe('e1')
    expect(router.resolve(examResultPath('e1')).name).toBe('exam-result')
  })
})
