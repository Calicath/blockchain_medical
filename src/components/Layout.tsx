import { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWeb3 } from '../hooks/useWeb3'
import { LogOut, User } from 'lucide-react'
import { formatAddress } from '../utils/helpers'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { account, userInfo, disconnect } = useWeb3()
  const navigate = useNavigate()

  const handleLogout = () => {
    disconnect()
    navigate('/login')
  }

  const getRoleName = () => {
    if (!userInfo) return '未注册'
    const roleMap = {
      Doctor: '医生',
      Patient: '病人',
      Verifier: '查证单位',
    }
    return roleMap[userInfo.role] || '未知'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-primary-600">基于区块链的数字病历存证系统</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span>{userInfo?.name || '未注册'}</span>
                <span className="text-gray-400">({getRoleName()})</span>
              </div>
              <div className="text-sm text-gray-500">
                {formatAddress(account || '')}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
                <span>退出</span>
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}

