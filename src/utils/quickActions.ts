// 快捷操作管理工具

const STORAGE_KEY_PATIENTS = 'frequent_patients'
const STORAGE_KEY_DIAGNOSES = 'recent_diagnoses'
const MAX_PATIENTS = 10
const MAX_DIAGNOSES = 10

export interface FrequentPatient {
  address: string
  name: string
  lastUsed: number
  useCount: number
}

export interface RecentDiagnosis {
  diagnosis: string
  lastUsed: number
  useCount?: number
}

// 获取常用病人列表
export function getFrequentPatients(): FrequentPatient[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PATIENTS)
    if (!stored) return []
    const patients = JSON.parse(stored)
    // 按使用次数和最近使用时间排序
    return patients
      .sort((a: FrequentPatient, b: FrequentPatient) => {
        if (b.useCount !== a.useCount) return b.useCount - a.useCount
        return b.lastUsed - a.lastUsed
      })
      .slice(0, MAX_PATIENTS)
  } catch (error) {
    console.error('获取常用病人失败:', error)
    return []
  }
}

// 添加或更新常用病人
export function addFrequentPatient(address: string, name: string) {
  try {
    const patients = getFrequentPatients()
    const existingIndex = patients.findIndex((p) => p.address.toLowerCase() === address.toLowerCase())
    
    if (existingIndex >= 0) {
      // 更新现有病人
      patients[existingIndex].name = name
      patients[existingIndex].lastUsed = Date.now()
      patients[existingIndex].useCount += 1
    } else {
      // 添加新病人
      patients.push({
        address,
        name,
        lastUsed: Date.now(),
        useCount: 1,
      })
    }
    
    // 保持最多MAX_PATIENTS个
    const sorted = patients
      .sort((a, b) => {
        if (b.useCount !== a.useCount) return b.useCount - a.useCount
        return b.lastUsed - a.lastUsed
      })
      .slice(0, MAX_PATIENTS)
    
    localStorage.setItem(STORAGE_KEY_PATIENTS, JSON.stringify(sorted))
  } catch (error) {
    console.error('保存常用病人失败:', error)
  }
}

// 获取最近使用的诊断
export function getRecentDiagnoses(): RecentDiagnosis[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_DIAGNOSES)
    if (!stored) return []
    const diagnoses = JSON.parse(stored)
    // 按最近使用时间排序
    return diagnoses
      .sort((a: RecentDiagnosis, b: RecentDiagnosis) => b.lastUsed - a.lastUsed)
      .slice(0, MAX_DIAGNOSES)
  } catch (error) {
    console.error('获取最近诊断失败:', error)
    return []
  }
}

// 添加或更新最近使用的诊断
export function addRecentDiagnosis(diagnosis: string) {
  if (!diagnosis || diagnosis.trim() === '') return
  
  try {
    const diagnoses = getRecentDiagnoses()
    const trimmedDiagnosis = diagnosis.trim()
    const existingIndex = diagnoses.findIndex((d) => d.diagnosis === trimmedDiagnosis)
    
    if (existingIndex >= 0) {
      // 更新现有诊断
      diagnoses[existingIndex].lastUsed = Date.now()
      diagnoses[existingIndex].useCount += 1
    } else {
      // 添加新诊断
      diagnoses.push({
        diagnosis: trimmedDiagnosis,
        lastUsed: Date.now(),
        useCount: 1,
      })
    }
    
    // 保持最多MAX_DIAGNOSES个
    const sorted = diagnoses
      .sort((a, b) => b.lastUsed - a.lastUsed)
      .slice(0, MAX_DIAGNOSES)
    
    localStorage.setItem(STORAGE_KEY_DIAGNOSES, JSON.stringify(sorted))
  } catch (error) {
    console.error('保存最近诊断失败:', error)
  }
}

// 清除常用病人
export function clearFrequentPatients() {
  localStorage.removeItem(STORAGE_KEY_PATIENTS)
}

// 清除最近诊断
export function clearRecentDiagnoses() {
  localStorage.removeItem(STORAGE_KEY_DIAGNOSES)
}

