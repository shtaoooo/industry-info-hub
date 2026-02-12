/**
 * Form Validation Utilities
 * Provides reusable validation functions for form fields
 */

export interface ValidationResult {
  valid: boolean
  message?: string
}

/**
 * Validate required field
 */
export function validateRequired(value: any, fieldName: string = '此字段'): ValidationResult {
  if (value === null || value === undefined || value === '') {
    return {
      valid: false,
      message: `${fieldName}不能为空`,
    }
  }
  
  if (typeof value === 'string' && value.trim().length === 0) {
    return {
      valid: false,
      message: `${fieldName}不能为空`,
    }
  }
  
  if (Array.isArray(value) && value.length === 0) {
    return {
      valid: false,
      message: `${fieldName}不能为空`,
    }
  }
  
  return { valid: true }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  if (!email) {
    return {
      valid: false,
      message: '邮箱地址不能为空',
    }
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return {
      valid: false,
      message: '请输入有效的邮箱地址',
    }
  }
  
  return { valid: true }
}

/**
 * Validate string length
 */
export function validateLength(
  value: string,
  min?: number,
  max?: number,
  fieldName: string = '此字段'
): ValidationResult {
  if (!value) {
    return {
      valid: false,
      message: `${fieldName}不能为空`,
    }
  }
  
  const length = value.trim().length
  
  if (min !== undefined && length < min) {
    return {
      valid: false,
      message: `${fieldName}长度不能少于${min}个字符`,
    }
  }
  
  if (max !== undefined && length > max) {
    return {
      valid: false,
      message: `${fieldName}长度不能超过${max}个字符`,
    }
  }
  
  return { valid: true }
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): ValidationResult {
  if (!url) {
    return {
      valid: false,
      message: 'URL不能为空',
    }
  }
  
  try {
    new URL(url)
    return { valid: true }
  } catch {
    return {
      valid: false,
      message: '请输入有效的URL',
    }
  }
}

/**
 * Validate file size
 */
export function validateFileSize(
  file: File,
  maxSizeMB: number = 10
): ValidationResult {
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      message: `文件大小不能超过${maxSizeMB}MB`,
    }
  }
  
  return { valid: true }
}

/**
 * Validate file type
 */
export function validateFileType(
  file: File,
  allowedTypes: string[]
): ValidationResult {
  const fileExtension = file.name.split('.').pop()?.toLowerCase()
  
  if (!fileExtension || !allowedTypes.includes(fileExtension)) {
    return {
      valid: false,
      message: `只允许上传以下格式的文件: ${allowedTypes.join(', ')}`,
    }
  }
  
  return { valid: true }
}

/**
 * Validate number range
 */
export function validateNumberRange(
  value: number,
  min?: number,
  max?: number,
  fieldName: string = '此字段'
): ValidationResult {
  if (isNaN(value)) {
    return {
      valid: false,
      message: `${fieldName}必须是数字`,
    }
  }
  
  if (min !== undefined && value < min) {
    return {
      valid: false,
      message: `${fieldName}不能小于${min}`,
    }
  }
  
  if (max !== undefined && value > max) {
    return {
      valid: false,
      message: `${fieldName}不能大于${max}`,
    }
  }
  
  return { valid: true }
}

/**
 * Validate array selection
 */
export function validateArraySelection(
  array: any[],
  min?: number,
  max?: number,
  fieldName: string = '此字段'
): ValidationResult {
  if (!Array.isArray(array)) {
    return {
      valid: false,
      message: `${fieldName}格式错误`,
    }
  }
  
  if (min !== undefined && array.length < min) {
    return {
      valid: false,
      message: `${fieldName}至少选择${min}项`,
    }
  }
  
  if (max !== undefined && array.length > max) {
    return {
      valid: false,
      message: `${fieldName}最多选择${max}项`,
    }
  }
  
  return { valid: true }
}

/**
 * Validate CSV file format
 */
export function validateCSVFile(file: File): ValidationResult {
  // Check file extension
  const fileExtension = file.name.split('.').pop()?.toLowerCase()
  if (fileExtension !== 'csv') {
    return {
      valid: false,
      message: '只允许上传CSV文件',
    }
  }
  
  // Check file size (max 5MB for CSV)
  const maxSizeBytes = 5 * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      message: 'CSV文件大小不能超过5MB',
    }
  }
  
  return { valid: true }
}

/**
 * Validate markdown file format
 */
export function validateMarkdownFile(file: File): ValidationResult {
  const fileExtension = file.name.split('.').pop()?.toLowerCase()
  if (fileExtension !== 'md' && fileExtension !== 'markdown') {
    return {
      valid: false,
      message: '只允许上传Markdown文件 (.md)',
    }
  }
  
  // Check file size (max 2MB for markdown)
  const maxSizeBytes = 2 * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      message: 'Markdown文件大小不能超过2MB',
    }
  }
  
  return { valid: true }
}

/**
 * Validate document file format
 */
export function validateDocumentFile(file: File): ValidationResult {
  const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt']
  const fileExtension = file.name.split('.').pop()?.toLowerCase()
  
  if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
    return {
      valid: false,
      message: `只允许上传以下格式的文档: ${allowedExtensions.join(', ')}`,
    }
  }
  
  // Check file size (max 10MB)
  const maxSizeBytes = 10 * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      message: '文档大小不能超过10MB',
    }
  }
  
  return { valid: true }
}

/**
 * Validate form data before submission
 * Returns array of error messages
 */
export function validateForm(
  validations: Array<() => ValidationResult>
): string[] {
  const errors: string[] = []
  
  for (const validation of validations) {
    const result = validation()
    if (!result.valid && result.message) {
      errors.push(result.message)
    }
  }
  
  return errors
}

/**
 * Ant Design form rule generators
 */
export const formRules = {
  required: (fieldName: string = '此字段') => ({
    required: true,
    message: `${fieldName}不能为空`,
  }),
  
  email: () => ({
    type: 'email' as const,
    message: '请输入有效的邮箱地址',
  }),
  
  minLength: (min: number, fieldName: string = '此字段') => ({
    min,
    message: `${fieldName}长度不能少于${min}个字符`,
  }),
  
  maxLength: (max: number, fieldName: string = '此字段') => ({
    max,
    message: `${fieldName}长度不能超过${max}个字符`,
  }),
  
  pattern: (pattern: RegExp, message: string) => ({
    pattern,
    message,
  }),
  
  whitespace: (fieldName: string = '此字段') => ({
    whitespace: true,
    message: `${fieldName}不能只包含空格`,
  }),
  
  url: () => ({
    type: 'url' as const,
    message: '请输入有效的URL',
  }),
  
  number: () => ({
    type: 'number' as const,
    message: '请输入数字',
  }),
  
  arrayMinLength: (min: number, fieldName: string = '此字段') => ({
    type: 'array' as const,
    min,
    message: `${fieldName}至少选择${min}项`,
  }),
  
  arrayMaxLength: (max: number, fieldName: string = '此字段') => ({
    type: 'array' as const,
    max,
    message: `${fieldName}最多选择${max}项`,
  }),
}

/**
 * Common validation rule sets for different field types
 */
export const commonValidationRules = {
  // Industry/Sub-industry name
  name: [
    formRules.required('名称'),
    formRules.whitespace('名称'),
    formRules.minLength(1, '名称'),
    formRules.maxLength(100, '名称'),
  ],
  
  // Description/Definition
  description: [
    formRules.required('描述'),
    formRules.whitespace('描述'),
    formRules.minLength(1, '描述'),
    formRules.maxLength(500, '描述'),
  ],
  
  // Email
  email: [
    formRules.required('邮箱'),
    formRules.email(),
  ],
  
  // Role selection
  role: [
    formRules.required('角色'),
  ],
  
  // Industry selection for specialists
  assignedIndustries: [
    formRules.required('分配的行业'),
    formRules.arrayMinLength(1, '分配的行业'),
  ],
  
  // Company list
  companies: [
    formRules.arrayMinLength(0, '企业列表'),
  ],
}
