import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export function formatTimestamp(timestamp: bigint | number): string {
  const date = new Date(Number(timestamp) * 1000)
  return format(date, 'yyyy-MM-dd HH:mm:ss', { locale: zhCN })
}

export function formatAddress(address: string): string {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function generateHash(data: string): string {
  // 简单的哈希生成（实际应用中应使用更安全的哈希算法）
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return `0x${Math.abs(hash).toString(16)}`
}

export function formatEther(wei: bigint | string): string {
  const value = typeof wei === 'string' ? BigInt(wei) : wei
  return (Number(value) / 1e18).toFixed(2)
}

