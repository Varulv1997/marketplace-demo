/**
 * Adapted for browser from p-map by Stelace
 * Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (sindresorhus.com)
 * MIT license
 * About browser vs. Node.js: https://github.com/sindresorhus/p-map/issues/7
 * Removing aggregate-error dependency and making it easier to transpile locally.
 * May create a stand-alone repo in the future, including transpiled build.
 */

export default {
  async map (iterable, mapper, {
    concurrency = Infinity,
    stopOnError = true
  } = {}) {
    return new Promise((resolve, reject) => {
      if (typeof mapper !== 'function') {
        throw new TypeError('Mapper function is required')
      }

      if (!(typeof concurrency === 'number' && concurrency >= 1)) {
        throw new TypeError(`Expected 'concurrency' to be a number from 1 and up, got '${
          concurrency
        }' (${typeof concurrency})`)
      }

      const ret = []
      const errors = []
      const iterator = iterable[Symbol.iterator]()
      let isRejected = false
      let isIterableDone = false
      let resolvingCount = 0
      let currentIndex = 0

      const next = () => {
        if (isRejected) return

        const nextItem = iterator.next()
        const i = currentIndex
        currentIndex++

        if (nextItem.done) {
          isIterableDone = true

          if (resolvingCount === 0) {
            if (!stopOnError && errors.length !== 0) reject(errors)
            else resolve(ret)
          }
          return
        }

        resolvingCount++

        (async () => {
          try {
            const element = await nextItem.value
            ret[i] = await mapper(element, i)
            resolvingCount--
            next()
          } catch (error) {
            if (stopOnError) {
              isRejected = true
              reject(error)
            } else {
              errors.push(error)
              resolvingCount--
              next()
            }
          }
        })()
      }

      for (let i = 0; i < concurrency; i++) {
        next()
        if (isIterableDone) break
      }
    })
  }
}
