import { h } from 'hastscript'
import type { ShikiTransformer } from 'shiki'

// https://github.com/cworld1/astro-theme-pure/blob/main/src/plugins/shiki-transformers.ts
function parseMetaString(str = '') {
  return Object.fromEntries(
    str.split(' ').reduce((acc: [string, string | true][], cur) => {
      const matched = cur.match(/(.+)?=("(.+)"|'(.+)')$/)
      if (matched === null) return acc
      const key = matched[1]
      const value = matched[3] || matched[4] || true
      acc = [...acc, [key, value]]
      return acc
    }, [])
  )
}

// Nest a div in the outer layer
export const updateStyle = (): ShikiTransformer => {
  return {
    name: 'shiki-transformer-update-style',
    pre(node) {
      const container = h('pre', node.children)
      node.children = [container]
      node.tagName = 'div'
    }
  }
}

// Process meta string, like ```ts filename="test.ts"
export const processMeta = (): ShikiTransformer => {
  return {
    name: 'shiki-transformer-process-meta',
    preprocess() {
      if (!this.options.meta) return
      const rawMeta = this.options.meta?.__raw
      if (!rawMeta) return
      const meta = parseMetaString(rawMeta)
      Object.assign(this.options.meta, meta)
    }
  }
}

// Add a meta head to the code block
export const addMetaHead = (): ShikiTransformer => {
  return {
    name: 'shiki-transformer-add-filename',
    pre(node) {
      const rawMeta = this.options.meta?.__raw
      if (!rawMeta) return
      const meta = parseMetaString(rawMeta)
      // If meta is needed to parse in other transformers
      // if (this.options.meta) {
      //   Object.assign(this.options.meta, meta)
      // }

      if (!meta.filename) return

      const metaHeadDiv = h(
        'div',
        {
          class: 'meta-head'
        },
        h(
            'span',
            {
                class: 'filename'
            },
            meta.filename.toString()
        ),
        // Note: We ignore the language meta part for now
        // h(
        //     'span',
        //     {
        //         class: 'language'
        //     },
        //     this.options.lang
        // )
      )
      node.children.unshift(metaHeadDiv)
    }
  }
}