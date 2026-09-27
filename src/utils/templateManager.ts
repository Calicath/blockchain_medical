// 病历模板管理工具

export interface RecordTemplate {
  id: string
  name: string
  chiefComplaint: string
  presentIllness: string
  pastHistory: string
  examination: string
  diagnosis: string
  treatment: string
  createdAt: number
  updatedAt: number
}

const STORAGE_KEY = 'medical_record_templates'

// 获取所有模板
export function getAllTemplates(): RecordTemplate[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    return JSON.parse(stored)
  } catch (error) {
    console.error('获取模板失败:', error)
    return []
  }
}

// 根据ID获取模板
export function getTemplateById(id: string): RecordTemplate | null {
  const templates = getAllTemplates()
  return templates.find((t) => t.id === id) || null
}

// 保存模板
export function saveTemplate(template: Omit<RecordTemplate, 'id' | 'createdAt' | 'updatedAt'>): string {
  const templates = getAllTemplates()
  const id = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const newTemplate: RecordTemplate = {
    ...template,
    id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  templates.push(newTemplate)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
  return id
}

// 更新模板
export function updateTemplate(id: string, updates: Partial<Omit<RecordTemplate, 'id' | 'createdAt'>>): boolean {
  const templates = getAllTemplates()
  const index = templates.findIndex((t) => t.id === id)
  if (index === -1) return false

  templates[index] = {
    ...templates[index],
    ...updates,
    updatedAt: Date.now(),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
  return true
}

// 删除模板
export function deleteTemplate(id: string): boolean {
  const templates = getAllTemplates()
  const filtered = templates.filter((t) => t.id !== id)
  if (filtered.length === templates.length) return false

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  return true
}

// 从当前表单数据创建模板
export function createTemplateFromForm(
  name: string,
  formData: {
    chiefComplaint: string
    presentIllness: string
    pastHistory: string
    examination: string
    diagnosis: string
    treatment: string
  }
): string {
  return saveTemplate({
    name,
    ...formData,
  })
}

