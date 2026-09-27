import { useState, useEffect } from 'react'
import { useWeb3 } from '../hooks/useWeb3'
import { useNotification } from '../contexts/NotificationContext'
import { FileText, Receipt, Clock, CheckCircle, XCircle, Download, Search, Filter, X } from 'lucide-react'
import { formatTimestamp, formatAddress, formatEther } from '../utils/helpers'
import { downloadCsv, exportRecordToDocx, exportInvoiceToPdf } from '../utils/exporters'
import { TimeLineChart, TimeBarChart } from '../components/Charts'

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

export default function PatientDashboard() {
  const { contract, account } = useWeb3()
  const { showNotification } = useNotification()
  const [records, setRecords] = useState<Record[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'records' | 'invoices'>('records')
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null)
  const [relatedRecord, setRelatedRecord] = useState<Record | null>(null)
  const [userNames, setUserNames] = useState<Map<string, string>>(new Map())
  const [stats, setStats] = useState({
    totalRecords: 0,
    totalInvoices: 0,
    verifiedInvoices: 0,
    totalAmount: 0,
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false)
  const [filterCriteria, setFilterCriteria] = useState({
    patientName: '',
    diagnosis: '',
    startDate: '',
    endDate: '',
  })

  const getRecordSeriesLast7Days = () => {
    const map = new Map<string, number>()
    const now = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const key = `${d.getMonth() + 1}-${d.getDate()}`
      map.set(key, 0)
    }
    records.forEach((r) => {
      const d = new Date(Number(r.timestamp) * 1000)
      const key = `${d.getMonth() + 1}-${d.getDate()}`
      if (map.has(key)) {
        map.set(key, (map.get(key) || 0) + 1)
      }
    })
    return Array.from(map.entries()).map(([date, value]) => ({ date, value }))
  }

  const getInvoiceAmountSeriesLast7Days = () => {
    const map = new Map<string, number>()
    const now = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const key = `${d.getMonth() + 1}-${d.getDate()}`
      map.set(key, 0)
    }
    invoices.forEach((inv) => {
      const d = new Date(Number(inv.timestamp) * 1000)
      const key = `${d.getMonth() + 1}-${d.getDate()}`
      if (map.has(key)) {
        // 存 ETH 数值，方便阅读
        const eth = Number(formatEther(inv.amount))
        map.set(key, (map.get(key) || 0) + eth)
      }
    })
    return Array.from(map.entries()).map(([date, value]) => ({ date, value }))
  }

  // 筛选病历记录
  const getFilteredRecords = () => {
    let filtered = [...records]

    // 快速搜索（按病人姓名或诊断）
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter((record) => {
        const patientName = record.patientName?.toLowerCase() || ''
        const diagnosis = record.diagnosis?.toLowerCase() || ''
        const doctorName = userNames.get(record.doctor)?.toLowerCase() || ''
        const doctorAddr = formatAddress(record.doctor).toLowerCase()
        return (
          patientName.includes(term) ||
          diagnosis.includes(term) ||
          doctorName.includes(term) ||
          doctorAddr.includes(term)
        )
      })
    }

    // 高级筛选
    if (showAdvancedFilter) {
      // 按病人姓名筛选
      if (filterCriteria.patientName) {
        const term = filterCriteria.patientName.toLowerCase()
        filtered = filtered.filter((record) =>
          record.patientName?.toLowerCase().includes(term)
        )
      }

      // 按诊断筛选
      if (filterCriteria.diagnosis) {
        const term = filterCriteria.diagnosis.toLowerCase()
        filtered = filtered.filter((record) =>
          record.diagnosis?.toLowerCase().includes(term)
        )
      }

      // 按日期范围筛选
      if (filterCriteria.startDate) {
        const startTimestamp = Math.floor(
          new Date(filterCriteria.startDate).getTime() / 1000
        )
        filtered = filtered.filter(
          (record) => Number(record.consultationTime) >= startTimestamp
        )
      }

      if (filterCriteria.endDate) {
        const endTimestamp = Math.floor(
          new Date(filterCriteria.endDate + 'T23:59:59').getTime() / 1000
        )
        filtered = filtered.filter(
          (record) => Number(record.consultationTime) <= endTimestamp
        )
      }
    }

    return filtered
  }

  const filteredRecords = getFilteredRecords()

  const clearFilters = () => {
    setSearchTerm('')
    setFilterCriteria({
      patientName: '',
      diagnosis: '',
      startDate: '',
      endDate: '',
    })
  }

  const hasActiveFilters = () => {
    return (
      searchTerm !== '' ||
      filterCriteria.patientName !== '' ||
      filterCriteria.diagnosis !== '' ||
      filterCriteria.startDate !== '' ||
      filterCriteria.endDate !== ''
    )
  }

  const handleExportRecords = () => {
    if (!records.length) {
      alert('暂无病历可导出')
      return
    }
    const rows = records.map((r) => ({
      id: Number(r.id),
      doctor: r.doctor,
      patient: r.patient,
      patientName: r.patientName,
      consultationTime: formatTimestamp(r.consultationTime),
      chiefComplaint: r.chiefComplaint,
      presentIllness: r.presentIllness,
      pastHistory: r.pastHistory,
      examination: r.examination,
      diagnosis: r.diagnosis,
      treatment: r.treatment,
      timestamp: formatTimestamp(r.timestamp),
      hash: r.hash,
    }))
    downloadCsv('patient-records.csv', rows)
  }

  const handleExportInvoices = () => {
    if (!invoices.length) {
      alert('暂无发票可导出')
      return
    }
    const rows = invoices.map((inv) => ({
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
    downloadCsv('patient-invoices.csv', rows)
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

  const loadData = async () => {
    if (!contract || !account) return

    try {
      setLoading(true)
      const [recordIds, invoiceIds] = await Promise.all([
        contract.getPatientRecords(account),
        contract.getPatientInvoices(account),
      ])

      const [recordsData, invoicesData] = await Promise.all([
        Promise.all(recordIds.map((id: bigint) => contract.getRecord(id))),
        Promise.all(invoiceIds.map((id: bigint) => contract.getInvoice(id))),
      ])

      setRecords(recordsData)
      setInvoices(invoicesData)
      
      // 收集所有需要获取用户名的地址
      const addressesToLoad = new Set<string>()
      recordsData.forEach((r: Record) => {
        if (r.doctor) addressesToLoad.add(r.doctor)
      })
      invoicesData.forEach((inv: Invoice) => {
        if (inv.doctor) addressesToLoad.add(inv.doctor)
        if (inv.verifier && inv.verifier !== '0x0000000000000000000000000000000000000000') {
          addressesToLoad.add(inv.verifier)
        }
      })
      
      // 批量加载用户名
      await Promise.all(Array.from(addressesToLoad).map(addr => loadUserName(addr)))
      
      // 计算统计信息
      const verifiedCount = invoicesData.filter((inv: Invoice) => inv.verified).length
      const totalAmount = invoicesData.reduce(
        (sum: number, inv: Invoice) => sum + Number(inv.amount),
        0
      )
      
      setStats({
        totalRecords: recordsData.length,
        totalInvoices: invoicesData.length,
        verifiedInvoices: verifiedCount,
        totalAmount: totalAmount,
      })
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">病人工作台</h2>
        <div className="flex space-x-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
          >
            {loading ? '刷新中...' : '刷新'}
          </button>
          {activeTab === 'records' ? (
            <button
              onClick={handleExportRecords}
              disabled={loading || records.length === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>导出病历 CSV</span>
            </button>
          ) : (
            <button
              onClick={handleExportInvoices}
              disabled={loading || invoices.length === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>导出发票 CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">总病历数</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalRecords}</p>
            </div>
            <FileText className="w-8 h-8 text-primary-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">总发票数</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalInvoices}</p>
            </div>
            <Receipt className="w-8 h-8 text-primary-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">已验证发票</p>
              <p className="text-2xl font-bold text-green-600">{stats.verifiedInvoices}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">总金额</p>
              <p className="text-2xl font-bold text-primary-600">
                {formatEther(BigInt(stats.totalAmount))} ETH
              </p>
            </div>
            <Receipt className="w-8 h-8 text-primary-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TimeLineChart
          title="最近 7 天病历数量"
          data={getRecordSeriesLast7Days()}
          yLabel="病历数"
        />
        <TimeBarChart
          title="最近 7 天发票金额"
          data={getInvoiceAmountSeriesLast7Days()}
          yLabel="ETH"
        />
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('records')}
              className={`flex-1 py-4 px-6 text-center font-medium transition ${
                activeTab === 'records'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText className="w-5 h-5 inline-block mr-2" />
              我的病历
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`flex-1 py-4 px-6 text-center font-medium transition ${
                activeTab === 'invoices'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Receipt className="w-5 h-5 inline-block mr-2" />
              我的发票
            </button>
          </nav>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : activeTab === 'records' ? (
            <>
              {/* 搜索和筛选区域 */}
              <div className="mb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div></div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
                      className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm transition ${
                        showAdvancedFilter
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Filter className="w-4 h-4" />
                      <span>高级筛选</span>
                    </button>
                  </div>
                </div>

                {/* 搜索框 */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="搜索病人姓名、诊断、医生姓名或地址..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* 高级筛选面板 */}
                {showAdvancedFilter && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-medium text-gray-700">高级筛选</h4>
                      {hasActiveFilters() && (
                        <button
                          onClick={clearFilters}
                          className="text-xs text-primary-600 hover:text-primary-700 flex items-center space-x-1"
                        >
                          <X className="w-3 h-3" />
                          <span>清除筛选</span>
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          病人姓名
                        </label>
                        <input
                          type="text"
                          value={filterCriteria.patientName}
                          onChange={(e) =>
                            setFilterCriteria({
                              ...filterCriteria,
                              patientName: e.target.value,
                            })
                          }
                          placeholder="输入病人姓名"
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          诊断
                        </label>
                        <input
                          type="text"
                          value={filterCriteria.diagnosis}
                          onChange={(e) =>
                            setFilterCriteria({
                              ...filterCriteria,
                              diagnosis: e.target.value,
                            })
                          }
                          placeholder="输入诊断关键词"
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          开始日期
                        </label>
                        <input
                          type="date"
                          value={filterCriteria.startDate}
                          onChange={(e) =>
                            setFilterCriteria({
                              ...filterCriteria,
                              startDate: e.target.value,
                            })
                          }
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          结束日期
                        </label>
                        <input
                          type="date"
                          value={filterCriteria.endDate}
                          onChange={(e) =>
                            setFilterCriteria({
                              ...filterCriteria,
                              endDate: e.target.value,
                            })
                          }
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 筛选结果提示 */}
                {hasActiveFilters() && (
                  <div className="text-sm text-gray-600">
                    找到 <span className="font-semibold text-primary-600">{filteredRecords.length}</span> 条记录
                    {records.length !== filteredRecords.length && (
                      <span className="text-gray-400 ml-1">
                        (共 {records.length} 条)
                      </span>
                    )}
                  </div>
                )}
              </div>

              {records.length === 0 ? (
                <div className="text-center py-8 text-gray-500">暂无病历记录</div>
              ) : filteredRecords.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {hasActiveFilters() ? '没有找到匹配的病历记录' : '暂无病历记录'}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredRecords.map((record) => (
                  <div
                    key={Number(record.id)}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-sm font-medium text-primary-600">
                          病历 #{Number(record.id)}
                        </span>
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatTimestamp(record.timestamp)}
                        </div>
                      </div>
                      <div className="text-sm text-gray-700">
                        <span className="font-medium">医生：</span>
                        {formatAddressWithName(record.doctor)}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedRecordId(
                          selectedRecordId === Number(record.id)
                            ? null
                            : Number(record.id)
                        )
                      }}
                      className="text-primary-600 hover:text-primary-700 text-sm"
                    >
                      {selectedRecordId === Number(record.id) ? '收起' : '查看详情'}
                    </button>
                    {selectedRecordId === Number(record.id) && (
                      <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                        <div>
                          <span className="text-sm font-medium text-gray-700">姓名：</span>
                          <p className="text-sm text-gray-600 mt-1">
                            {record.patientName || '未设置'}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700">就诊时间：</span>
                          <p className="text-sm text-gray-600 mt-1">
                            {formatTimestamp(record.consultationTime)}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700">主诉：</span>
                          <p className="text-sm text-gray-600 mt-1">
                            {record.chiefComplaint}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700">现病史：</span>
                          <p className="text-sm text-gray-600 mt-1">
                            {record.presentIllness}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700">既往史：</span>
                          <p className="text-sm text-gray-600 mt-1">
                            {record.pastHistory}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700">体格检查和辅助检查：</span>
                          <p className="text-sm text-gray-600 mt-1">
                            {record.examination}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700">诊断：</span>
                          <p className="text-sm text-gray-600 mt-1">
                            {record.diagnosis}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700">处理：</span>
                          <p className="text-sm text-gray-600 mt-1">
                            {record.treatment}
                          </p>
                        </div>
                        <div className="text-xs text-gray-500">
                          哈希值：{record.hash}
                        </div>
                        <div className="pt-2">
                          <button
                            onClick={async () => {
                              try {
                                const doctorName = userNames.get(record.doctor) || undefined
                                await exportRecordToDocx(
                                  record,
                                  { doctorName },
                                  formatTimestamp,
                                  formatAddress
                                )
                                showNotification('病历已导出为Word文档', 'success')
                              } catch (error) {
                                console.error('导出失败:', error)
                                showNotification('导出失败，请重试', 'error')
                              }
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                          >
                            <Download className="w-4 h-4" />
                            导出为Word文档
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              )}
            </>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无发票记录</div>
          ) : (
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <div
                  key={Number(invoice.id)}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-primary-600">
                          发票 #{Number(invoice.id)}
                        </span>
                        {invoice.verified ? (
                          <span className="flex items-center text-xs text-green-600">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            已验证
                          </span>
                        ) : (
                          <span className="flex items-center text-xs text-yellow-600">
                            <XCircle className="w-3 h-3 mr-1" />
                            待验证
                          </span>
                        )}
                      </div>
                      <div className="flex items-center text-xs text-gray-500 mt-1">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatTimestamp(invoice.timestamp)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        {formatEther(invoice.amount)} ETH
                      </div>
                      <div className="text-xs text-gray-500">
                        编号：{invoice.invoiceNumber}
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
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">医生：</span>
                          <span className="text-gray-600">
                            {formatAddressWithName(invoice.doctor)}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">关联病历ID：</span>
                          <span className="text-gray-600">
                            #{Number(invoice.recordId)}
                          </span>
                        </div>
                        {invoice.verified && (
                          <div>
                            <span className="font-medium text-gray-700">验证单位：</span>
                            <span className="text-gray-600">
                              {formatAddressWithName(invoice.verifier)}
                            </span>
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-2">
                          哈希值：{invoice.hash}
                        </div>
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

