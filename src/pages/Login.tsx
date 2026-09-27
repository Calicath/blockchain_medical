import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useWeb3 } from '../hooks/useWeb3'

export default function Login() {
  const { connectWallet, loadUserInfo, loading, isLoadingUserInfo } = useWeb3()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  const handleLogin = async () => {
    try {
      setError('')
      await connectWallet()
      // 等待用户信息加载完成
      try {
        await loadUserInfo()
      } catch (loadError) {
        console.error('加载用户信息失败:', loadError)
      }
      // 连接成功后，App.tsx 会自动处理路由
      setTimeout(() => {
        navigate('/')
      }, 300)
    } catch (err: any) {
      setError(err.message || '登录失败，请重试')
    }
  }

  return (
    <div className="min-h-screen bg-primary-50 flex">
      {/* 左侧区域 - 系统信息和功能介绍 */}
      <div className="hidden lg:flex lg:w-[56%] flex-col justify-center px-12 xl:px-16">
        <div className="max-w-lg">
          {/* 主标题 - 分两行 */}
          <h1 className="text-4xl font-black text-primary-600 mb-5 leading-tight">
            <div className="chinese-text">基于区块链的</div>
            <div className="chinese-text">数字病历存证系统</div>
          </h1>

          {/* 系统简介 */}
          <p className="text-base text-gray-600 mb-10 leading-relaxed chinese-text">
            基于区块链技术构建的数字病历存证系统，提供安全可靠的医疗数据上链存储和发票验证服务。通过去中心化的方式确保医疗数据的真实性和不可篡改性。
          </p>

          {/* 三个功能点 - 文本形式 */}
          <div className="space-y-5">
            <div className="flex items-start">
              <span className="text-3xl font-bold text-primary-600 mr-4">01</span>
              <div>
                <div className="text-lg font-semibold text-primary-600 mb-1 chinese-text">病历存证</div>
                <p className="text-gray-600 text-sm chinese-text">医疗记录上链存储，确保数据真实性和完整性</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="text-3xl font-bold text-primary-600 mr-4">02</span>
              <div>
                <div className="text-lg font-semibold text-primary-600 mb-1 chinese-text">发票验证</div>
                <p className="text-gray-600 text-sm chinese-text">发票信息上链验证，防止伪造和重复报销</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="text-3xl font-bold text-primary-600 mr-4">03</span>
              <div>
                <div className="text-lg font-semibold text-primary-600 mb-1 chinese-text">安全可靠</div>
                <p className="text-gray-600 text-sm chinese-text">区块链技术保障数据安全，隐私保护完善</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧区域 - 登录界面 */}
      <div className="w-full lg:w-[38%] flex items-center justify-start lg:justify-start px-8 lg:pl-12 lg:pr-39 py-12 bg-white lg:bg-transparent">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-2xl shadow-lg p-10 border border-gray-100">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 chinese-text">欢迎</h2>
              <p className="text-gray-600 text-sm chinese-text">开始您的医疗数据管理之旅</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>连接中...</span>
                  </>
                ) : (
                  <>
                    <span>连接 MetaMask 钱包</span>
                    <span>→</span>
                  </>
                )}
              </button>

              <div className="text-center text-sm text-gray-600">
                <p className="mb-2">还没有钱包？</p>
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700 font-medium underline"
                >
                  下载 MetaMask
                </a>
              </div>
              <div className="text-center mt-4">
                <p className="text-sm text-gray-600">
                  还没有账户？{' '}
                  <Link
                    to="/register"
                    className="text-primary-600 hover:text-primary-700 font-medium underline"
                  >
                    立即注册
                  </Link>
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                2025 © 邵学雯 程昱轩 陈新蕾
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

