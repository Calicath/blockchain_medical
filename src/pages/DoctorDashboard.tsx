import { useState, useEffect } from 'react'
import { useWeb3 } from '../hooks/useWeb3'
import { useNotification } from '../contexts/NotificationContext'
import { Plus, FileText, Receipt, Clock, Download, Search, Filter, X, FileEdit, Trash2, Save } from 'lucide-react'
import { formatTimestamp, formatAddress, generateHash } from '../utils/helpers'
import { downloadCsv, exportRecordToDocx } from '../utils/exporters'
import { ethers } from 'ethers'
import { TimeLineChart } from '../components/Charts'
import {
  getAllTemplates,
  getTemplateById,
  saveTemplate,
  updateTemplate,
  deleteTemplate,
  type RecordTemplate,
} from '../utils/templateManager'
import {
  getFrequentPatients,
  addFrequentPatient,
  getRecentDiagnoses,
  addRecentDiagnosis,
  type FrequentPatient,
  type RecentDiagnosis,
} from '../utils/quickActions'

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

export default function DoctorDashboard() {
  const { contract, account } = useWeb3()
  const { showNotification } = useNotification()
  const [records, setRecords] = useState<Record[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null)
  const [templates, setTemplates] = useState<RecordTemplate[]>([])
  const [showTemplateManager, setShowTemplateManager] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [editingTemplate, setEditingTemplate] = useState<RecordTemplate | null>(null)
  const [frequentPatients, setFrequentPatients] = useState<FrequentPatient[]>([])
  const [recentDiagnoses, setRecentDiagnoses] = useState<RecentDiagnosis[]>([])
  const [showDiagnosisSuggestions, setShowDiagnosisSuggestions] = useState(false)
  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    chiefComplaint: '',
    presentIllness: '',
    pastHistory: '',
    examination: '',
    diagnosis: '',
    treatment: '',
  })
  const [userNames, setUserNames] = useState<Map<string, string>>(new Map())
  const [stats, setStats] = useState({
    totalRecords: 0,
    todayRecords: 0,
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false)
  const [filterCriteria, setFilterCriteria] = useState({
    patientName: '',
    diagnosis: '',
    startDate: '',
    endDate: '',
  })
  const [formData, setFormData] = useState({
    patientAddress: '',
    patientName: '',
    chiefComplaint: '',
    presentIllness: '',
    pastHistory: '',
    examination: '',
    diagnosis: '',
    treatment: '',
  })
  const [invoiceData, setInvoiceData] = useState({
    patientAddress: '',
    recordId: '',
    amount: '',
    invoiceNumber: '',
  })

  const getLast7DaysSeries = () => {
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

  const getLast7DaysPatientCountSeries = () => {
    const map = new Map<string, Set<string>>()
    const now = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const key = `${d.getMonth() + 1}-${d.getDate()}`
      map.set(key, new Set())
    }
    records.forEach((r) => {
      const d = new Date(Number(r.timestamp) * 1000)
      const key = `${d.getMonth() + 1}-${d.getDate()}`
      if (map.has(key) && r.patient) {
        map.get(key)?.add(r.patient)
      }
    })
    return Array.from(map.entries()).map(([date, patientSet]) => ({
      date,
      value: patientSet.size,
    }))
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
        const patientAddr = formatAddress(record.patient).toLowerCase()
        return (
          patientName.includes(term) ||
          diagnosis.includes(term) ||
          patientAddr.includes(term)
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
    downloadCsv('doctor-records.csv', rows)
  }

  useEffect(() => {
    if (contract && account) {
      loadRecords()
    }
  }, [contract, account])

  useEffect(() => {
    loadTemplates()
    loadQuickActions()
  }, [])

  const loadQuickActions = () => {
    setFrequentPatients(getFrequentPatients())
    setRecentDiagnoses(getRecentDiagnoses())
  }

  const loadTemplates = () => {
    const allTemplates = getAllTemplates()
    setTemplates(allTemplates)
  }

  const handleTemplateSelect = (templateId: string) => {
    if (!templateId) {
      setSelectedTemplateId('')
      return
    }
    const template = getTemplateById(templateId)
    if (template) {
      setSelectedTemplateId(templateId)
      setFormData({
        ...formData,
        chiefComplaint: template.chiefComplaint,
        presentIllness: template.presentIllness,
        pastHistory: template.pastHistory,
        examination: template.examination,
        diagnosis: template.diagnosis,
        treatment: template.treatment,
      })
      showNotification('模板已应用', 'success')
    }
  }

  const handleSaveAsTemplate = () => {
    if (!templateFormData.name.trim()) {
      showNotification('请输入模板名称', 'error')
      return
    }
    if (editingTemplate) {
      updateTemplate(editingTemplate.id, templateFormData)
      showNotification('模板已更新', 'success')
    } else {
      saveTemplate(templateFormData)
      showNotification('模板已保存', 'success')
    }
    loadTemplates()
    setShowTemplateManager(false)
    setEditingTemplate(null)
    setTemplateFormData({
      name: '',
      chiefComplaint: '',
      presentIllness: '',
      pastHistory: '',
      examination: '',
      diagnosis: '',
      treatment: '',
    })
  }

  const handleEditTemplate = (template: RecordTemplate) => {
    setEditingTemplate(template)
    setTemplateFormData({
      name: template.name,
      chiefComplaint: template.chiefComplaint,
      presentIllness: template.presentIllness,
      pastHistory: template.pastHistory,
      examination: template.examination,
      diagnosis: template.diagnosis,
      treatment: template.treatment,
    })
    setShowTemplateManager(true)
  }

  const handleDeleteTemplate = (id: string) => {
    if (confirm('确定要删除这个模板吗？')) {
      deleteTemplate(id)
      loadTemplates()
      if (selectedTemplateId === id) {
        setSelectedTemplateId('')
      }
      showNotification('模板已删除', 'success')
    }
  }

  const handleCreateTemplateFromCurrentForm = () => {
    setTemplateFormData({
      name: '',
      chiefComplaint: formData.chiefComplaint,
      presentIllness: formData.presentIllness,
      pastHistory: formData.pastHistory,
      examination: formData.examination,
      diagnosis: formData.diagnosis,
      treatment: formData.treatment,
    })
    setEditingTemplate(null)
    setShowTemplateManager(true)
  }

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

  const loadRecords = async () => {
    if (!contract) return

    try {
      setLoading(true)
      const recordIds = await contract.getDoctorRecords()
      const recordsData = await Promise.all(
        recordIds.map((id: bigint) => contract.getRecord(id))
      )
      setRecords(recordsData)
      
      // 收集所有需要获取用户名的地址
      const addressesToLoad = new Set<string>()
      recordsData.forEach((r: Record) => {
        if (r.patient) addressesToLoad.add(r.patient)
      })
      
      // 批量加载用户名
      await Promise.all(Array.from(addressesToLoad).map(addr => loadUserName(addr)))
      
      // 计算统计信息
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayTimestamp = Math.floor(today.getTime() / 1000)
      
      const todayCount = recordsData.filter(
        (r: Record) => Number(r.timestamp) >= todayTimestamp
      ).length
      
      setStats({
        totalRecords: recordsData.length,
        todayRecords: todayCount,
      })
    } catch (error) {
      console.error('加载病历失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contract) return

    try {
      setLoading(true)
      
      // 获取病人姓名
      let patientName = formData.patientName
      if (!patientName) {
        try {
          const user = await contract.getUser(formData.patientAddress)
          if (user && user.registered) {
            patientName = user.name
          }
        } catch (error) {
          console.error('获取病人姓名失败:', error)
        }
      }
      
      // 就诊时间使用当前时间戳
      const consultationTime = Math.floor(Date.now() / 1000)
      
      const hash = generateHash(
        `${formData.patientAddress}${formData.diagnosis}${Date.now()}`
      )

      const tx = await contract.createRecord(
        formData.patientAddress,
        patientName,
        consultationTime,
        formData.chiefComplaint,
        formData.presentIllness,
        formData.pastHistory,
        formData.examination,
        formData.diagnosis,
        formData.treatment,
        hash
      )
      await tx.wait()

      // 保存常用病人和最近诊断
      if (formData.patientAddress && patientName) {
        addFrequentPatient(formData.patientAddress, patientName)
      }
      if (formData.diagnosis && formData.diagnosis.trim()) {
        addRecentDiagnosis(formData.diagnosis)
      }
      
      // 重新加载快捷操作数据
      loadQuickActions()

      setFormData({
        patientAddress: '',
        patientName: '',
        chiefComplaint: '',
        presentIllness: '',
        pastHistory: '',
        examination: '',
        diagnosis: '',
        treatment: '',
      })
      setShowCreateForm(false)
      await loadRecords()
      showNotification('病历创建成功！', 'success')
    } catch (error: any) {
      const errorMessage = error.message || '创建病历失败'
      showNotification(errorMessage, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contract) return

    try {
      setLoading(true)
      const hash = generateHash(
        `${invoiceData.patientAddress}${invoiceData.invoiceNumber}${Date.now()}`
      )

      const tx = await contract.createInvoice(
        invoiceData.patientAddress,
        invoiceData.recordId,
        ethers.parseEther(invoiceData.amount),
        invoiceData.invoiceNumber,
        hash
      )
      await tx.wait()

      setInvoiceData({
        patientAddress: '',
        recordId: '',
        amount: '',
        invoiceNumber: '',
      })
      setShowInvoiceForm(false)
      showNotification('发票创建成功！', 'success')
    } catch (error: any) {
      const errorMessage = error.message || '创建发票失败'
      showNotification(errorMessage, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">医生工作台</h2>
        <div className="flex space-x-3">
          <button
            onClick={loadRecords}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
          >
            {loading ? '刷新中...' : '刷新'}
          </button>
          <button
            onClick={handleExportRecords}
            disabled={loading || records.length === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>导出病历 CSV</span>
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
          >
            <Plus className="w-4 h-4" />
            <span>创建病历</span>
          </button>
          <button
            onClick={() => setShowInvoiceForm(true)}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            <Receipt className="w-4 h-4" />
            <span>开具发票</span>
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <p className="text-sm text-gray-600 mb-1">今日病历</p>
              <p className="text-2xl font-bold text-primary-600">{stats.todayRecords}</p>
            </div>
            <Clock className="w-8 h-8 text-primary-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TimeLineChart
          title="最近 7 天病历数量"
          data={getLast7DaysSeries()}
          yLabel="病历数"
        />
        <TimeLineChart
          title="最近 7 天病人数量"
          data={getLast7DaysPatientCountSeries()}
          yLabel="病人数"
        />
      </div>

      {showCreateForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">创建病历</h3>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleCreateTemplateFromCurrentForm}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm text-primary-600 hover:text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-50 transition"
              >
                <Save className="w-4 h-4" />
                <span>保存为模板</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowTemplateManager(true)
                  setEditingTemplate(null)
                  setTemplateFormData({
                    name: '',
                    chiefComplaint: '',
                    presentIllness: '',
                    pastHistory: '',
                    examination: '',
                    diagnosis: '',
                    treatment: '',
                  })
                }}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                <FileEdit className="w-4 h-4" />
                <span>管理模板</span>
              </button>
            </div>
          </div>
          <form 
            onSubmit={handleCreateRecord} 
            className="space-y-4"
            onKeyDown={(e) => {
              // 快捷键支持
              if (e.ctrlKey || e.metaKey) {
                if (e.key === 's') {
                  e.preventDefault()
                  handleCreateRecord(e as any)
                }
              }
              if (e.key === 'Escape') {
                setShowCreateForm(false)
                setFormData({
                  patientAddress: '',
                  patientName: '',
                  chiefComplaint: '',
                  presentIllness: '',
                  pastHistory: '',
                  examination: '',
                  diagnosis: '',
                  treatment: '',
                })
              }
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择模板
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">不使用模板</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  常用病人快速选择
                </label>
                <select
                  value=""
                  onChange={async (e) => {
                    const selectedAddress = e.target.value
                    if (selectedAddress && contract) {
                      setFormData(prev => ({ ...prev, patientAddress: selectedAddress }))
                      try {
                        const user = await contract.getUser(selectedAddress)
                        if (user && user.registered) {
                          setFormData(prev => ({ ...prev, patientName: user.name }))
                        }
                      } catch (error) {
                        console.error('获取病人姓名失败:', error)
                      }
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">选择常用病人...</option>
                  {frequentPatients.map((patient) => (
                    <option key={patient.address} value={patient.address}>
                      {patient.name} ({formatAddress(patient.address)}) - 使用{patient.useCount}次
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                病人地址
              </label>
              <input
                type="text"
                value={formData.patientAddress}
                onChange={async (e) => {
                  const address = e.target.value
                  setFormData({ ...formData, patientAddress: address })
                  // 自动获取病人姓名
                  if (contract && address) {
                    try {
                      const user = await contract.getUser(address)
                      if (user && user.registered) {
                        setFormData(prev => ({ ...prev, patientName: user.name }))
                      }
                    } catch (error) {
                      console.error('获取病人姓名失败:', error)
                    }
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="0x..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                姓名
              </label>
              <input
                type="text"
                value={formData.patientName}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                placeholder="输入病人地址后自动带出"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                就诊时间
              </label>
              <input
                type="text"
                value={formatTimestamp(BigInt(Math.floor(Date.now() / 1000)))}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                主诉
              </label>
              <textarea
                value={formData.chiefComplaint}
                onChange={(e) =>
                  setFormData({ ...formData, chiefComplaint: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                rows={3}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                现病史
              </label>
              <textarea
                value={formData.presentIllness}
                onChange={(e) =>
                  setFormData({ ...formData, presentIllness: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                rows={3}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                既往史
              </label>
              <textarea
                value={formData.pastHistory}
                onChange={(e) =>
                  setFormData({ ...formData, pastHistory: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                rows={3}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                体格检查和辅助检查
              </label>
              <textarea
                value={formData.examination}
                onChange={(e) =>
                  setFormData({ ...formData, examination: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                rows={3}
                required
              />
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                诊断
                {recentDiagnoses.length > 0 && (
                  <span className="ml-2 text-xs text-gray-500">
                    (输入时按↓键快速填充)
                  </span>
                )}
              </label>
              <textarea
                value={formData.diagnosis}
                onChange={(e) => {
                  setFormData({ ...formData, diagnosis: e.target.value })
                  setShowDiagnosisSuggestions(e.target.value === '' && recentDiagnoses.length > 0)
                }}
                onFocus={() => {
                  if (formData.diagnosis === '' && recentDiagnoses.length > 0) {
                    setShowDiagnosisSuggestions(true)
                  }
                }}
                onBlur={() => {
                  // 延迟隐藏，以便点击建议项
                  setTimeout(() => setShowDiagnosisSuggestions(false), 200)
                }}
                onKeyDown={(e) => {
                  // 快捷键支持
                  if (e.key === 'ArrowDown' && recentDiagnoses.length > 0 && formData.diagnosis === '') {
                    e.preventDefault()
                    setFormData({ ...formData, diagnosis: recentDiagnoses[0].diagnosis })
                    setShowDiagnosisSuggestions(false)
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={3}
                required
              />
              {showDiagnosisSuggestions && recentDiagnoses.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-200">
                    最近使用的诊断（点击选择）
                  </div>
                  {recentDiagnoses.map((diag, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, diagnosis: diag.diagnosis })
                        setShowDiagnosisSuggestions(false)
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition"
                    >
                      <div className="font-medium">{diag.diagnosis}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(diag.lastUsed).toLocaleString('zh-CN')}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                处理
              </label>
              <textarea
                value={formData.treatment}
                onChange={(e) =>
                  setFormData({ ...formData, treatment: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                rows={3}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {loading ? '提交中...' : '提交'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false)
                    setFormData({
                      patientAddress: '',
                      patientName: '',
                      chiefComplaint: '',
                      presentIllness: '',
                      pastHistory: '',
                      examination: '',
                      diagnosis: '',
                      treatment: '',
                    })
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300"
                >
                  取消
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {showInvoiceForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">开具发票</h3>
          <form onSubmit={handleCreateInvoice} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                病人地址
              </label>
              <input
                type="text"
                value={invoiceData.patientAddress}
                onChange={(e) =>
                  setInvoiceData({
                    ...invoiceData,
                    patientAddress: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                病历ID
              </label>
              <input
                type="number"
                value={invoiceData.recordId}
                onChange={(e) =>
                  setInvoiceData({ ...invoiceData, recordId: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                金额 (ETH)
              </label>
              <input
                type="number"
                step="0.01"
                value={invoiceData.amount}
                onChange={(e) =>
                  setInvoiceData({ ...invoiceData, amount: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                发票编号
              </label>
              <input
                type="text"
                value={invoiceData.invoiceNumber}
                onChange={(e) =>
                  setInvoiceData({
                    ...invoiceData,
                    invoiceNumber: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? '提交中...' : '开具发票'}
              </button>
              <button
                type="button"
                onClick={() => setShowInvoiceForm(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 模板管理对话框 */}
      {showTemplateManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">
                  {editingTemplate ? '编辑模板' : '创建模板'}
                </h3>
                <button
                  onClick={() => {
                    setShowTemplateManager(false)
                    setEditingTemplate(null)
                    setTemplateFormData({
                      name: '',
                      chiefComplaint: '',
                      presentIllness: '',
                      pastHistory: '',
                      examination: '',
                      diagnosis: '',
                      treatment: '',
                    })
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  模板名称 *
                </label>
                <input
                  type="text"
                  value={templateFormData.name}
                  onChange={(e) =>
                    setTemplateFormData({ ...templateFormData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="输入模板名称"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  主诉
                </label>
                <textarea
                  value={templateFormData.chiefComplaint}
                  onChange={(e) =>
                    setTemplateFormData({
                      ...templateFormData,
                      chiefComplaint: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  现病史
                </label>
                <textarea
                  value={templateFormData.presentIllness}
                  onChange={(e) =>
                    setTemplateFormData({
                      ...templateFormData,
                      presentIllness: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  既往史
                </label>
                <textarea
                  value={templateFormData.pastHistory}
                  onChange={(e) =>
                    setTemplateFormData({
                      ...templateFormData,
                      pastHistory: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  体格检查和辅助检查
                </label>
                <textarea
                  value={templateFormData.examination}
                  onChange={(e) =>
                    setTemplateFormData({
                      ...templateFormData,
                      examination: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  诊断
                </label>
                <textarea
                  value={templateFormData.diagnosis}
                  onChange={(e) =>
                    setTemplateFormData({
                      ...templateFormData,
                      diagnosis: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  处理
                </label>
                <textarea
                  value={templateFormData.treatment}
                  onChange={(e) =>
                    setTemplateFormData({
                      ...templateFormData,
                      treatment: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleSaveAsTemplate}
                  className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition"
                >
                  {editingTemplate ? '更新模板' : '保存模板'}
                </button>
                <button
                  onClick={() => {
                    setShowTemplateManager(false)
                    setEditingTemplate(null)
                    setTemplateFormData({
                      name: '',
                      chiefComplaint: '',
                      presentIllness: '',
                      pastHistory: '',
                      examination: '',
                      diagnosis: '',
                      treatment: '',
                    })
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 模板列表对话框 */}
      {!showTemplateManager && templates.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">我的模板</h3>
            <button
              onClick={() => {
                setShowTemplateManager(true)
                setEditingTemplate(null)
                setTemplateFormData({
                  name: '',
                  chiefComplaint: '',
                  presentIllness: '',
                  pastHistory: '',
                  examination: '',
                  diagnosis: '',
                  treatment: '',
                })
              }}
              className="flex items-center space-x-1 px-3 py-1.5 text-sm text-primary-600 hover:text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-50 transition"
            >
              <Plus className="w-4 h-4" />
              <span>新建模板</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-900">{template.name}</h4>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleEditTemplate(template)}
                      className="text-primary-600 hover:text-primary-700 p-1"
                      title="编辑"
                    >
                      <FileEdit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="text-red-600 hover:text-red-700 p-1"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mb-3">
                  更新于: {new Date(template.updatedAt).toLocaleString('zh-CN')}
                </div>
                <button
                  onClick={() => {
                    handleTemplateSelect(template.id)
                    if (showCreateForm) {
                      // 如果创建表单已打开，直接应用模板
                    }
                  }}
                  className="w-full text-sm text-primary-600 hover:text-primary-700 border border-primary-200 rounded-lg py-2 hover:bg-primary-50 transition"
                >
                  使用此模板
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              我的病历记录
            </h3>
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
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索病人姓名、诊断或地址..."
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
            <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
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
            <div className="mb-4 text-sm text-gray-600">
              找到 <span className="font-semibold text-primary-600">{filteredRecords.length}</span> 条记录
              {records.length !== filteredRecords.length && (
                <span className="text-gray-400 ml-1">
                  (共 {records.length} 条)
                </span>
              )}
            </div>
          )}
        </div>
        <div className="p-6 pt-0">
          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
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
                  </div>
                  <div className="text-sm text-gray-700 mb-2">
                    <span className="font-medium">病人：</span>
                    {formatAddressWithName(record.patient)}
                  </div>
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
        </div>
      </div>
    </div>
  )
}

