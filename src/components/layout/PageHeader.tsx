import type { ReactNode } from 'react'

interface PageHeaderProps {
  rightContent?: ReactNode
}

export function PageHeader({ rightContent }: PageHeaderProps) {
  return (
    <header className="bg-white px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1.5px solid #EBEBEB' }}>
      <div className="flex items-center gap-2">
        <img src="/logo-icon.png" alt="" className="w-7 h-7" />
        <h1 className="font-display text-xl font-extrabold tracking-tight">
          <span className="text-dark">Meal</span>
          <span className="text-primary">Deal</span>
        </h1>
      </div>
      {rightContent && <div className="flex items-center gap-2">{rightContent}</div>}
    </header>
  )
}
