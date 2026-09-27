import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import contractABI from '../utils/contractABI.json'

const CONTRACT_ADDRESS = (import.meta.env as any).VITE_CONTRACT_ADDRESS || ''

export type UserRole = 'Doctor' | 'Patient' | 'Verifier' | null

interface User {
  name: string
  role: UserRole
  idNumber: string
  registered: boolean
}

export function useWeb3() {
  const [account, setAccount] = useState<string>('')
  const [isConnected, setIsConnected] = useState(false)
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [contract, setContract] = useState<ethers.Contract | null>(null)
  const [userRole, setUserRole] = useState<UserRole>(null)
  const [userInfo, setUserInfo] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [isLoadingUserInfo, setIsLoadingUserInfo] = useState(false)

  useEffect(() => {
    checkConnection()
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged)
      window.ethereum.on('chainChanged', () => window.location.reload())
    }
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
      }
    }
  }, [])

  useEffect(() => {
    if (account && contract) {
      loadUserInfo()
    }
  }, [account, contract])

  const checkConnection = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const accounts = await provider.listAccounts()
        if (accounts.length > 0) {
          await connectWallet()
        }
      } catch (error) {
        console.error('检查连接失败:', error)
      }
    }
  }

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('请安装 MetaMask 钱包')
      return
    }

    try {
      setLoading(true)
      const provider = new ethers.BrowserProvider(window.ethereum)
      await provider.send('eth_requestAccounts', [])
      const signer = await provider.getSigner()
      const address = await signer.getAddress()

      setProvider(provider)
      setAccount(address)
      setIsConnected(true)

      if (CONTRACT_ADDRESS) {
        const contractInstance = new ethers.Contract(
          CONTRACT_ADDRESS,
          contractABI,
          signer
        )
        setContract(contractInstance)
      }
    } catch (error) {
      console.error('连接钱包失败:', error)
      alert('连接钱包失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      setAccount('')
      setIsConnected(false)
      setUserRole(null)
      setUserInfo(null)
    } else {
      connectWallet()
    }
  }

  const loadUserInfo = async () => {
    if (!contract || !account) {
      setIsLoadingUserInfo(false)
      return { registered: false, role: null }
    }

    try {
      setIsLoadingUserInfo(true)
      
      // 检查合约地址是否正确
      if (!CONTRACT_ADDRESS) {
        console.error('❌ 合约地址未配置！请检查 .env 文件')
        setUserRole(null)
        setUserInfo(null)
        return { registered: false, role: null }
      }
      
      // 先检查合约地址是否正确
      const contractAddress = await contract.getAddress()
      console.log('=== 加载用户信息 ===')
      console.log('合约实例地址:', contractAddress)
      console.log('配置的合约地址:', CONTRACT_ADDRESS)
      console.log('账户地址:', account)
      
      if (contractAddress.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) {
        console.error('❌ 合约地址不匹配！')
        console.error('  实例地址:', contractAddress)
        console.error('  配置地址:', CONTRACT_ADDRESS)
        setUserRole(null)
        setUserInfo(null)
        return { registered: false, role: null }
      }
      
      // 先检查合约代码是否存在
      if (provider) {
        try {
          const code = await provider.getCode(contractAddress)
          if (code === '0x') {
            console.error('❌ 合约地址没有代码！请先部署合约')
            console.error('  运行: npm run deploy')
            setUserRole(null)
            setUserInfo(null)
            return { registered: false, role: null }
          }
          console.log('✓ 合约代码存在，长度:', code.length)
        } catch (codeError: any) {
          console.error('❌ 无法检查合约代码:', codeError.message)
        }
      }
      
      // 先使用 isUserRegistered 检查用户是否注册（这个函数只返回 bool，不会解码失败）
      let user
      try {
        console.log('调用 isUserRegistered...')
        const isRegistered = await contract.isUserRegistered(account)
        console.log('✓ isUserRegistered 结果:', isRegistered)
        
        if (!isRegistered) {
          console.log('用户未注册')
          setUserRole(null)
          setUserInfo(null)
          return { registered: false, role: null }
        }
        
        // 如果已注册，再获取详细信息
        console.log('用户已注册，获取详细信息...')
        user = await contract.getUser(account)
        console.log('✓ getUser 调用成功:', user)
        
        if (!user || !user.registered) {
          console.log('getUser 返回未注册状态')
          setUserRole(null)
          setUserInfo(null)
          return { registered: false, role: null }
        }
      } catch (checkError: any) {
        console.error('❌ isUserRegistered 或 getUser 调用失败')
        console.error('错误信息:', checkError.message)
        console.error('错误代码:', checkError.code)
        console.error('错误详情:', checkError)
        
        // 如果 isUserRegistered 失败，可能是合约地址错误或网络问题
        if (checkError.code === 'BAD_DATA' || checkError.message?.includes('0x')) {
          console.error('❌ 合约返回空数据，可能的原因:')
          console.error('1. 合约地址错误')
          console.error('2. 合约未部署')
          console.error('3. MetaMask 连接的网络不对（应该是 Hardhat Local, Chain ID: 1337）')
          console.error('4. 前端需要重启以加载新的 .env 配置')
        }
        
        setUserRole(null)
        setUserInfo(null)
        return { registered: false, role: null }
      }
      
      // 检查返回的数据是否有效
      if (!user || !user.registered || user.userAddress === '0x0000000000000000000000000000000000000000') {
        setUserRole(null)
        setUserInfo(null)
        return { registered: false, role: null }
      }
      
      if (user.registered) {
        const roleMap: { [key: number]: UserRole } = {
          0: 'Doctor',
          1: 'Patient',
          2: 'Verifier',
        }
        const role = roleMap[Number(user.role)]
        setUserRole(role)
        setUserInfo({
          name: user.name,
          role: role,
          idNumber: user.idNumber,
          registered: user.registered,
        })
        // 返回用户信息以便调用者知道加载完成
        return { registered: true, role }
      } else {
        setUserRole(null)
        setUserInfo(null)
        return { registered: false, role: null }
      }
    } catch (error: any) {
      console.error('加载用户信息失败:', error)
      // 如果是解码错误，可能是合约地址或ABI不匹配
      if (error.code === 'BAD_DATA' || error.message?.includes('decode')) {
        console.error('合约地址或ABI可能不匹配，请检查配置')
      }
      setUserRole(null)
      setUserInfo(null)
      return { registered: false, role: null }
    } finally {
      setIsLoadingUserInfo(false)
    }
  }

  const disconnect = () => {
    setAccount('')
    setIsConnected(false)
    setUserRole(null)
    setUserInfo(null)
    setContract(null)
    setProvider(null)
  }

  return {
    account,
    isConnected,
    provider,
    contract,
    userRole,
    userInfo,
    loading,
    isLoadingUserInfo,
    connectWallet,
    disconnect,
    loadUserInfo,
  }
}

declare global {
  interface Window {
    ethereum?: any
  }
}

