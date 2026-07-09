'use client'

interface Account {
  email: string
  label: string
  unreadCount?: number
}

interface Props {
  accounts: Account[]
  activeAccount: string
  onSelect: (email: string) => void
}

export function AccountTabs({ accounts, activeAccount, onSelect }: Props) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-white/6">
      {accounts.map(account => {
        const active = account.email === activeAccount
        return (
          <button
            key={account.email}
            onClick={() => onSelect(account.email)}
            className={[
              'flex items-center gap-1.5 px-3 py-2 text-xs rounded-sm transition-colors shrink-0',
              active
                ? 'bg-[#16a34a]/10 text-[#15803d] border border-[#16a34a]/30'
                : 'text-[#52525b] hover:text-[#3f3f46] border border-transparent hover:border-white/10',
            ].join(' ')}
          >
            <span className="truncate max-w-[160px]">{account.label || account.email.split('@')[0]}</span>
            {(account.unreadCount ?? 0) > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${active ? 'bg-[#16a34a]/20 text-[#15803d]' : 'bg-white/10 text-[#52525b]'}`}>
                {account.unreadCount}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
