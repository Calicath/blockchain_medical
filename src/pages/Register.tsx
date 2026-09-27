import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWeb3 } from '../hooks/useWeb3'
import { useNotification } from '../contexts/NotificationContext'
import { ArrowLeft } from 'lucide-react'

type UserRole = 'Doctor' | 'Patient' | 'Verifier'

export default function Register() {
  const { contract, account, connectWallet, loadUserInfo } = useWeb3()
  const { showNotification } = useNotification()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    idNumber: '',
    role: 'Patient' as UserRole,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contract || !account) {
      setError('请先连接钱包')
      return
    }

    if (!formData.name || !formData.idNumber) {
      setError('请填写所有字段')
      return
    }

    try {
      setLoading(true)
      setError('')

      const roleMap = {
        Doctor: 0,
        Patient: 1,
        Verifier: 2,
      }

      const tx = await contract.registerUser(
        roleMap[formData.role],
        formData.name,
        formData.idNumber
      )
      await tx.wait()

      setSuccess(true)
      showNotification('注册成功！', 'success')
      
      // 等待交易确认后，再等待几个区块确认
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // 多次尝试加载用户信息，因为区块链状态更新可能有延迟
      let retryCount = 0
      const maxRetries = 10  // 增加重试次数
      let userInfo = null
      
      console.log('开始尝试加载用户信息...')
      while (retryCount < maxRetries && !userInfo?.registered) {
        try {
          await new Promise(resolve => setTimeout(resolve, 1500))  // 增加等待时间
          console.log(`尝试 ${retryCount + 1}/${maxRetries} 加载用户信息...`)
          userInfo = await loadUserInfo()
          console.log('加载结果:', userInfo)
          if (userInfo?.registered) {
            console.log('✓ 用户信息加载成功，准备跳转')
            break
          }
        } catch (error) {
          console.log(`尝试 ${retryCount + 1}/${maxRetries} 加载用户信息失败:`, error)
        }
        retryCount++
      }
      
      if (userInfo?.registered) {
        // 如果成功加载，再等待一下确保状态更新
        await new Promise(resolve => setTimeout(resolve, 1000))
        console.log('跳转到首页...')
        window.location.href = '/'
      } else {
        // 如果多次重试后仍然失败，提示用户并跳转
        console.warn('多次重试后仍无法加载用户信息，但注册交易已成功')
        showNotification('注册成功！请刷新页面或重新登录', 'success')
        setTimeout(() => {
          window.location.href = '/'
        }, 2000)
      }
    } catch (err: any) {
      const errorMessage = err.message || '注册失败，请重试'
      setError(errorMessage)
      showNotification(errorMessage, 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">请先连接钱包</p>
          <button
            onClick={connectWallet}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
          >
            连接钱包
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/login')}
            className="flex items-center text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回登录
          </button>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">用户注册</h1>
          <p className="text-gray-600 text-sm">创建您的账户以开始使用</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
            注册成功！正在跳转...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              姓名
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="请输入您的姓名"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {formData.role === 'Doctor'
                ? '执业证号'
                : formData.role === 'Patient'
                ? '身份证号'
                : '机构编号'}
            </label>
            <input
              type="text"
              value={formData.idNumber}
              onChange={(e) =>
                setFormData({ ...formData, idNumber: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder={
                formData.role === 'Doctor'
                  ? '请输入执业证号'
                  : formData.role === 'Patient'
                  ? '请输入身份证号'
                  : '请输入机构编号'
              }
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              角色
            </label>
            <select
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value as UserRole })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="Patient">病人</option>
              <option value="Doctor">医生</option>
              <option value="Verifier">发票查证单位</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '注册中...' : success ? '注册成功' : '注册'}
          </button>
        </form>
      </div>
    </div>
  )
}

