import { useState, useEffect } from 'react'
import { useWeb3 } from '../hooks/useWeb3'
import { useNotification } from '../contexts/NotificationContext'
import { Receipt, CheckCircle, XCircle, Clock, Search, FileText, Download } from 'lucide-react'
import { formatTimestamp, formatAddress, formatEther } from '../utils/helpers'
import { downloadCsv, exportInvoiceToPdf } from '../utils/exporters'
import { TimeLineChart, TimeBarChart } from '../components/Charts'

interface Invoice {
  id: bigint
  patient: string
  doctor: string
  amount: bigint
  recordId: bigint
  timestamp: bigint
  invoiceNumber: string
  hash: string
  verified: boolean
  verifier: string
}

interface Record {
  id: bigint
  doctor: string
  patient: string
  patientName: string
  consultationTime: bigint
  chiefComplaint: string
  presentIllness: string
  pastHistory: string
  examination: string
  diagnosis: string
  treatment: string
  timestamp: bigint
  hash: string
}

export default function VerifierDashboard() {
  const { contract, account } = useWeb3()
  const { showNotification } = useNotification()
  const [pendingInvoices, setPendingInvoices] = useState<Invoice[]>([])
  const [verifiedInvoices, setVerifiedInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'pending' | 'verified'>('pending')
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null)
  const [relatedRecord, setRelatedRecord] = useState<Record | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [userNames, setUserNames] = useState<Map<string, string>>(new Map())
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    verified: 0,
  })
  const [selectedPendingIds, setSelectedPendingIds] = useState<number[]>([])

  const exportInvoicesToCsv = (data: Invoice[], filename: string) => {
    if (!data.length) {
      alert('暂无发票可导出')
      return
    }
    const rows = data.map((inv) => ({
      id: Number(inv.id),
      patient: inv.patient,
      doctor: inv.doctor,
      amountWei: inv.amount.toString(),
      amountEth: formatEther(inv.amount),
      recordId: Number(inv.recordId),
      timestamp: formatTimestamp(inv.timestamp),
      invoiceNumber: inv.invoiceNumber,
      verified: inv.verified ? '已验证' : '待验证',
      verifier: inv.verifier,
      hash: inv.hash,
    }))
    downloadCsv(filename, rows)
  }

  const getVerifiedCountSeriesLast7Days = () => {
    const map = new Map<string, number>()
    const now = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const key = `${d.getMonth() + 1}-${d.getDate()}`
      map.set(key, 0)
    }
    verifiedInvoices.forEach((inv) => {
      const d = new Date(Number(inv.timestamp) * 1000)
      const key = `${d.getMonth() + 1}-${d.getDate()}`
      if (map.has(key)) {
        map.set(key, (map.get(key) || 0) + 1)
      }
    })
    return Array.from(map.entries()).map(([date, value]) => ({ date, value }))
  }

  const getVerifiedAmountSeriesLast7Days = () => {
    const map = new Map<string, number>()
    const now = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const key = `${d.getMonth() + 1}-${d.getDate()}`
      map.set(key, 0)
    }
    verifiedInvoices.forEach((inv) => {
      const d = new Date(Number(inv.timestamp) * 1000)
      const key = `${d.getMonth() + 1}-${d.getDate()}`
      if (map.has(key)) {
        const eth = Number(formatEther(inv.amount))
        map.set(key, (map.get(key) || 0) + eth)
      }
    })
    return Array.from(map.entries()).map(([date, value]) => ({ date, value }))
  }

  useEffect(() => {
    if (contract && account) {
      loadData()
    }
  }, [contract, account])

  const loadUserName = async (address: string): Promise<string | null> => {
    if (!contract || !address) return null
    if (userNames.has(address)) return userNames.get(address) || null
    
    try {
      const user = await contract.getUser(address)
      if (user && user.registered) {
        const name = user.name
        setUserNames(prev => new Map(prev).set(address, name))
        return name
      }
    } catch (error) {
      console.error(`获取用户 ${address} 信息失败:`, error)
    }
    return null
  }

  const formatAddressWithName = (address: string) => {
    const name = userNames.get(address)
    if (name) {
      return (
        <>
          {name} <span className="text-gray-400">({formatAddress(address)})</span>
        </>
      )
    }
    return <span className="text-gray-400">({formatAddress(address)})</span>
  }

  const loadData = async () => {
    if (!contract) return

    try {
      setLoading(true)
      
      // 获取所有发票ID（通过遍历）
      const invoiceCount = await contract.invoiceCount()
      const allInvoiceIds: bigint[] = []
      
      for (let i = 1; i <= Number(invoiceCount); i++) {
        try {
          const invoice = await contract.getInvoice(i)
          if (invoice && invoice.id > 0) {
            allInvoiceIds.push(BigInt(i))
          }
        } catch (error) {
          // 跳过无权限或无效的发票
          continue
        }
      }

      // 获取所有发票详情
      const invoicesData = await Promise.all(
        allInvoiceIds.map((id: bigint) => contract.getInvoice(id))
      )

      const pending = invoicesData.filter((inv: Invoice) => !inv.verified)
      const verified = invoicesData.filter((inv: Invoice) => inv.verified)

      setPendingInvoices(pending)
      setVerifiedInvoices(verified)
      
      // 收集所有需要获取用户名的地址
      const addressesToLoad = new Set<string>()
      invoicesData.forEach((inv: Invoice) => {
        if (inv.patient) addressesToLoad.add(inv.patient)
        if (inv.doctor) addressesToLoad.add(inv.doctor)
        if (inv.verifier && inv.verifier !== '0x0000000000000000000000000000000000000000') {
          addressesToLoad.add(inv.verifier)
        }
      })
      
      // 批量加载用户名
      await Promise.all(Array.from(addressesToLoad).map(addr => loadUserName(addr)))
      
      setStats({
        total: invoicesData.length,
        pending: pending.length,
        verified: verified.length,
      })
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (invoiceId: number, isValid: boolean) => {
    if (!contract) return

    if (!confirm(`确定要${isValid ? '通过' : '拒绝'}此发票验证吗？`)) {
      return
    }

    try {
      setLoading(true)
      const tx = await contract.verifyInvoice(invoiceId, isValid)
      await tx.wait()
      showNotification(
        `发票验证${isValid ? '通过' : '拒绝'}成功！`,
        'success'
      )
      await loadData()
      setSelectedInvoiceId(null)
      setRelatedRecord(null)
    } catch (error: any) {
      const errorMessage = error.message || '验证失败，请重试'
      showNotification(errorMessage, 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadRelatedRecord = async (recordId: bigint) => {
    if (!contract) return

    try {
      const record = await contract.getRecord(recordId)
      setRelatedRecord(record)
    } catch (error) {
      console.error('加载关联病历失败:', error)
      setRelatedRecord(null)
    }
  }

  const filteredPendingInvoices = pendingInvoices.filter((invoice) => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      invoice.invoiceNumber.toLowerCase().includes(term) ||
      formatAddress(invoice.patient).toLowerCase().includes(term) ||
      formatAddress(invoice.doctor).toLowerCase().includes(term) ||
      Number(invoice.id).toString().includes(term)
    )
  })

  const filteredVerifiedInvoices = verifiedInvoices.filter((invoice) => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      invoice.invoiceNumber.toLowerCase().includes(term) ||
      formatAddress(invoice.patient).toLowerCase().includes(term) ||
      formatAddress(invoice.doctor).toLowerCase().includes(term) ||
      Number(invoice.id).toString().includes(term)
    )
  })

  const togglePendingSelected = (id: number) => {
    setSelectedPendingIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const toggleSelectAllPending = () => {
    if (selectedPendingIds.length === filteredPendingInvoices.length) {
      setSelectedPendingIds([])
    } else {
      setSelectedPendingIds(filteredPendingInvoices.map((inv) => Number(inv.id)))
    }
  }

  const handleBatchVerify = async (isValid: boolean) => {
    if (!contract) return
    if (selectedPendingIds.length === 0) {
      alert('请先选择要批量处理的发票')
      return
    }
    if (
      !confirm(
        `确定要对选中的 ${selectedPendingIds.length} 张发票批量${
          isValid ? '通过' : '拒绝'
        }吗？`
      )
    ) {
      return
    }

    try {
      setLoading(true)
      const ids = selectedPendingIds.map((id) => BigInt(id))
      const tx = await contract.verifyInvoices(ids, isValid)
      await tx.wait()
      showNotification(
        `已批量${isValid ? '通过' : '拒绝'} ${selectedPendingIds.length} 张发票（无效或重复的会自动跳过）。`,
        'success'
      )
      setSelectedPendingIds([])
      setSelectedInvoiceId(null)
      setRelatedRecord(null)
      await loadData()
    } catch (error: any) {
      const errorMessage = error.message || '批量验证失败，请重试'
      showNotification(errorMessage, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">发票查证工作台</h2>
        <div className="flex space-x-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
          >
            {loading ? '刷新中...' : '刷新数据'}
          </button>
          {activeTab === 'pending' ? (
            <>
              <button
                onClick={() =>
                  exportInvoicesToCsv(filteredPendingInvoices, 'pending-invoices.csv')
                }
                disabled={loading || filteredPendingInvoices.length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>导出待验证 CSV</span>
              </button>
              <button
                onClick={() => handleBatchVerify(true)}
                disabled={loading || selectedPendingIds.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 text-sm"
              >
                批量通过
              </button>
              <button
                onClick={() => handleBatchVerify(false)}
                disabled={loading || selectedPendingIds.length === 0}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 text-sm"
              >
                批量拒绝
              </button>
            </>
          ) : (
            <button
              onClick={() => exportInvoicesToCsv(filteredVerifiedInvoices, 'verified-invoices.csv')}
              disabled={loading || filteredVerifiedInvoices.length === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>导出已验证 CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">总发票数</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Receipt className="w-8 h-8 text-primary-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">待验证</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">已验证</p>
              <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TimeLineChart
          title="最近 7 天已验证发票数量"
          data={getVerifiedCountSeriesLast7Days()}
          yLabel="张数"
        />
        <TimeBarChart
          title="最近 7 天已验证发票金额"
          data={getVerifiedAmountSeriesLast7Days()}
          yLabel="ETH"
        />
      </div>

      {/* 主内容区域 */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 py-4 px-6 text-center font-medium transition ${
                activeTab === 'pending'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Clock className="w-5 h-5 inline-block mr-2" />
              待验证 ({stats.pending})
            </button>
            <button
              onClick={() => setActiveTab('verified')}
              className={`flex-1 py-4 px-6 text-center font-medium transition ${
                activeTab === 'verified'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <CheckCircle className="w-5 h-5 inline-block mr-2" />
              已验证 ({stats.verified})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* 搜索框 */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索发票编号、病人地址或医生地址..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : activeTab === 'pending' ? (
            filteredPendingInvoices.length === 0 ? (
              <div className="text-center py-8 text-gray-500">暂无待验证发票</div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div>
                    <label className="inline-flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={
                          filteredPendingInvoices.length > 0 &&
                          selectedPendingIds.length === filteredPendingInvoices.length
                        }
                        onChange={toggleSelectAllPending}
                        className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                      />
                      <span>全选当前列表</span>
                    </label>
                  </div>
                  <div>已选中 {selectedPendingIds.length} 张发票</div>
                </div>
                {filteredPendingInvoices.map((invoice) => (
                  <div
                    key={Number(invoice.id)}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <input
                            type="checkbox"
                            checked={selectedPendingIds.includes(Number(invoice.id))}
                            onChange={() => togglePendingSelected(Number(invoice.id))}
                            className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                          />
                          <span className="text-sm font-medium text-primary-600">
                            发票 #{Number(invoice.id)}
                          </span>
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                            待验证
                          </span>
                        </div>
                        <div className="flex items-center text-xs text-gray-500 mb-1">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatTimestamp(invoice.timestamp)}
                        </div>
                        <div className="text-sm text-gray-700 space-y-1">
                          <div>
                            <span className="font-medium">病人：</span>
                            {formatAddressWithName(invoice.patient)}
                          </div>
                          <div>
                            <span className="font-medium">医生：</span>
                            {formatAddressWithName(invoice.doctor)}
                          </div>
                          <div>
                            <span className="font-medium">发票编号：</span>
                            {invoice.invoiceNumber}
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-lg font-bold text-gray-900 mb-2">
                          {formatEther(invoice.amount)} ETH
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleVerify(Number(invoice.id), true)}
                            disabled={loading}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center space-x-1"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>通过</span>
                          </button>
                          <button
                            onClick={() => handleVerify(Number(invoice.id), false)}
                            disabled={loading}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center space-x-1"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>拒绝</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const newSelectedId =
                          selectedInvoiceId === Number(invoice.id)
                            ? null
                            : Number(invoice.id)
                        setSelectedInvoiceId(newSelectedId)
                        if (newSelectedId) {
                          loadRelatedRecord(invoice.recordId)
                        } else {
                          setRelatedRecord(null)
                        }
                      }}
                      className="text-primary-600 hover:text-primary-700 text-sm"
                    >
                      {selectedInvoiceId === Number(invoice.id) ? '收起详情' : '查看详情'}
                    </button>
                    {selectedInvoiceId === Number(invoice.id) && (
                      <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                        <div className="text-xs text-gray-500">
                          <span className="font-medium">哈希值：</span>
                          {invoice.hash}
                        </div>
                        <div className="pt-2">
                          <button
                            onClick={async () => {
                              try {
                                const doctorName = userNames.get(invoice.doctor) || undefined
                                const patientName = userNames.get(invoice.patient) || undefined
                                const verifierName = invoice.verified
                                  ? userNames.get(invoice.verifier) || undefined
                                  : undefined
                                await exportInvoiceToPdf(
                                  invoice,
                                  { patientName, doctorName, verifierName },
                                  formatTimestamp,
                                  formatAddress,
                                  formatEther
                                )
                                showNotification('发票已导出为PDF', 'success')
                              } catch (error) {
                                console.error('导出失败:', error)
                                showNotification('导出失败，请重试', 'error')
                              }
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                          >
                            <Download className="w-4 h-4" />
                            导出为PDF
                          </button>
                        </div>
                        {relatedRecord && (
                          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-2 mb-2">
                              <FileText className="w-4 h-4 text-primary-600" />
                              <span className="text-sm font-medium text-gray-700">
                                关联病历 #{Number(relatedRecord.id)}
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 space-y-1">
                              <div>
                                <span className="font-medium">姓名：</span>
                                {relatedRecord.patientName || '未设置'}
                              </div>
                              <div>
                                <span className="font-medium">就诊时间：</span>
                                {formatTimestamp(relatedRecord.consultationTime)}
                              </div>
                              <div>
                                <span className="font-medium">主诉：</span>
                                {relatedRecord.chiefComplaint}
                              </div>
                              <div>
                                <span className="font-medium">现病史：</span>
                                {relatedRecord.presentIllness}
                              </div>
                              <div>
                                <span className="font-medium">既往史：</span>
                                {relatedRecord.pastHistory}
                              </div>
                              <div>
                                <span className="font-medium">体格检查和辅助检查：</span>
                                {relatedRecord.examination}
                              </div>
                              <div>
                                <span className="font-medium">诊断：</span>
                                {relatedRecord.diagnosis}
                              </div>
                              <div>
                                <span className="font-medium">处理：</span>
                                {relatedRecord.treatment}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : filteredVerifiedInvoices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无已验证发票</div>
          ) : (
            <div className="space-y-4">
              {filteredVerifiedInvoices.map((invoice) => (
                <div
                  key={Number(invoice.id)}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm font-medium text-primary-600">
                          发票 #{Number(invoice.id)}
                        </span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center space-x-1">
                          <CheckCircle className="w-3 h-3" />
                          <span>已验证</span>
                        </span>
                      </div>
                      <div className="flex items-center text-xs text-gray-500 mb-1">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatTimestamp(invoice.timestamp)}
                      </div>
                      <div className="text-sm text-gray-700 space-y-1">
                        <div>
                          <span className="font-medium">病人：</span>
                          {formatAddressWithName(invoice.patient)}
                        </div>
                        <div>
                          <span className="font-medium">医生：</span>
                          {formatAddressWithName(invoice.doctor)}
                        </div>
                        <div>
                          <span className="font-medium">发票编号：</span>
                          {invoice.invoiceNumber}
                        </div>
                        {invoice.verifier !== '0x0000000000000000000000000000000000000000' && (
                          <div>
                            <span className="font-medium">验证单位：</span>
                            {formatAddressWithName(invoice.verifier)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-lg font-bold text-gray-900">
                        {formatEther(invoice.amount)} ETH
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const newSelectedId =
                        selectedInvoiceId === Number(invoice.id)
                          ? null
                          : Number(invoice.id)
                      setSelectedInvoiceId(newSelectedId)
                      if (newSelectedId) {
                        loadRelatedRecord(invoice.recordId)
                      } else {
                        setRelatedRecord(null)
                      }
                    }}
                    className="text-primary-600 hover:text-primary-700 text-sm"
                  >
                    {selectedInvoiceId === Number(invoice.id) ? '收起详情' : '查看详情'}
                  </button>
                  {selectedInvoiceId === Number(invoice.id) && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                      <div className="text-xs text-gray-500">
                        <span className="font-medium">哈希值：</span>
                        {invoice.hash}
                      </div>
                      <div className="pt-2">
                        <button
                          onClick={async () => {
                            try {
                              const doctorName = userNames.get(invoice.doctor) || undefined
                              const patientName = userNames.get(invoice.patient) || undefined
                              const verifierName = invoice.verified
                                ? userNames.get(invoice.verifier) || undefined
                                : undefined
                              await exportInvoiceToPdf(
                                invoice,
                                { patientName, doctorName, verifierName },
                                formatTimestamp,
                                formatAddress,
                                formatEther
                              )
                              showNotification('发票已导出为PDF', 'success')
                            } catch (error) {
                              console.error('导出失败:', error)
                              showNotification('导出失败，请重试', 'error')
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                        >
                          <Download className="w-4 h-4" />
                          导出为PDF
                        </button>
                      </div>
                      {relatedRecord && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <FileText className="w-4 h-4 text-primary-600" />
                            <span className="text-sm font-medium text-gray-700">
                              关联病历 #{Number(relatedRecord.id)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 space-y-1">
                            <div>
                              <span className="font-medium">诊断：</span>
                              {relatedRecord.diagnosis}
                            </div>
                            <div>
                              <span className="font-medium">治疗方案：</span>
                              {relatedRecord.treatment}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

