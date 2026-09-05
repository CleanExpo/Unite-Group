import React, { lazy, Suspense, type ComponentType } from 'react'

export default function dynamic<Props extends object>(load: () => Promise<{ default: ComponentType<Props> }>, _options?: { ssr?: boolean }) {
  const Component = lazy(load)
  return function PreviewDynamic(props: Props) { return <Suspense fallback={null}><Component {...props} /></Suspense> }
}
