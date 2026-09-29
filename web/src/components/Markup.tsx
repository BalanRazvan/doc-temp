import { Fragment } from 'react'
import type { ReactNode } from 'react'

function toReact(node: Node, key: number): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent
  const children = Array.from(node.childNodes, toReact)
  switch (node.nodeName) {
    case 'I':
    case 'ITALIC':
    case 'EM':
      return <i key={key}>{children}</i>
    case 'B':
    case 'BOLD':
      return <b key={key}>{children}</b>
    case 'SUP':
      return <sup key={key}>{children}</sup>
    case 'SUB':
      return <sub key={key}>{children}</sub>
    case 'H4':
      return (
        <h4 key={key} className="mt-3 font-semibold text-slate-900 first:mt-0">
          {children}
        </h4>
      )
    case 'P':
      return (
        <p key={key} className="mt-2 first:mt-0">
          {children}
        </p>
      )
    case 'BR':
      return <br key={key} />
    default:
      return <Fragment key={key}>{children}</Fragment>
  }
}

export default function Markup({ html }: { html: string }) {
  const body = new DOMParser().parseFromString(html, 'text/html').body
  return <>{Array.from(body.childNodes, toReact)}</>
}
