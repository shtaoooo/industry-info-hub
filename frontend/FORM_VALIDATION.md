# Frontend Form Validation

This document describes the form validation implementation in the Industry Portal frontend.

## Overview

The system implements comprehensive client-side form validation to ensure data quality and provide immediate feedback to users before submitting data to the server.

## Validation Utilities

All validation utilities are located in `src/utils/validation.ts`.

### Core Validation Functions

#### 1. Required Field Validation

```typescript
validateRequired(value: any, fieldName: string = '此字段'): ValidationResult
```

Validates that a field is not empty. Handles:
- Null/undefined values
- Empty strings
- Whitespace-only strings
- Empty arrays

**Example:**
```typescript
const result = validateRequired(formData.name, '行业名称')
if (!result.valid) {
  message.error(result.message) // "行业名称不能为空"
}
```

#### 2. Email Validation

```typescript
validateEmail(email: string): ValidationResult
```

Validates email format using regex pattern.

**Example:**
```typescript
const result = validateEmail('user@example.com')
// Returns: { valid: true }
```

#### 3. Length Validation

```typescript
validateLength(value: string, min?: number, max?: number, fieldName: string): ValidationResult
```

Validates string length within specified bounds.

**Example:**
```typescript
const result = validateLength(name, 1, 100, '行业名称')
// Ensures name is between 1-100 characters
```

#### 4. File Validation

**File Size:**
```typescript
validateFileSize(file: File, maxSizeMB: number = 10): ValidationResult
```

**File Type:**
```typescript
validateFileType(file: File, allowedTypes: string[]): ValidationResult
```

**CSV Files:**
```typescript
validateCSVFile(file: File): ValidationResult
```
- Max size: 5MB
- Extension: .csv

**Markdown Files:**
```typescript
validateMarkdownFile(file: File): ValidationResult
```
- Max size: 2MB
- Extensions: .md, .markdown

**Document Files:**
```typescript
validateDocumentFile(file: File): ValidationResult
```
- Max size: 10MB
- Allowed types: pdf, doc, docx, xls, xlsx, ppt, pptx, txt

### Ant Design Form Rules

Pre-configured validation rules for Ant Design forms:

```typescript
import { formRules, commonValidationRules } from '../utils/validation'

// Individual rules
<Form.Item
  name="email"
  rules={[
    formRules.required('邮箱'),
    formRules.email(),
  ]}
>
  <Input />
</Form.Item>

// Common rule sets
<Form.Item
  name="name"
  rules={commonValidationRules.name}
>
  <Input maxLength={100} showCount />
</Form.Item>
```

### Available Form Rules

| Rule | Description | Example |
|------|-------------|---------|
| `required(fieldName)` | Field is required | `formRules.required('名称')` |
| `email()` | Valid email format | `formRules.email()` |
| `minLength(min, fieldName)` | Minimum length | `formRules.minLength(1, '名称')` |
| `maxLength(max, fieldName)` | Maximum length | `formRules.maxLength(100, '名称')` |
| `pattern(regex, message)` | Custom regex pattern | `formRules.pattern(/^\d+$/, '只能输入数字')` |
| `whitespace(fieldName)` | No whitespace-only | `formRules.whitespace('名称')` |
| `url()` | Valid URL format | `formRules.url()` |
| `number()` | Must be a number | `formRules.number()` |
| `arrayMinLength(min, fieldName)` | Array min items | `formRules.arrayMinLength(1, '行业')` |
| `arrayMaxLength(max, fieldName)` | Array max items | `formRules.arrayMaxLength(10, '行业')` |

### Common Validation Rule Sets

Pre-configured rule sets for common field types:

```typescript
commonValidationRules.name          // Name fields (1-100 chars)
commonValidationRules.description   // Description fields (1-500 chars)
commonValidationRules.email         // Email fields
commonValidationRules.role          // Role selection
commonValidationRules.assignedIndustries  // Industry selection for specialists
commonValidationRules.companies     // Company list
```

## Implementation Examples

### 1. Industry Management Form

```typescript
import { commonValidationRules } from '../../utils/validation'

<Form form={form} layout="vertical">
  <Form.Item
    name="name"
    label="行业名称"
    rules={commonValidationRules.name}
  >
    <Input placeholder="请输入行业名称" maxLength={100} showCount />
  </Form.Item>
  
  <Form.Item
    name="definition"
    label="行业定义"
    rules={commonValidationRules.description}
  >
    <TextArea rows={4} placeholder="请输入行业定义" maxLength={500} showCount />
  </Form.Item>
</Form>
```

### 2. CSV File Upload

```typescript
import { validateCSVFile } from '../utils/validation'

const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const selectedFile = e.target.files?.[0]
  if (selectedFile) {
    const validation = validateCSVFile(selectedFile)
    if (!validation.valid) {
      message.error(validation.message)
      return
    }
    setFile(selectedFile)
  }
}
```

### 3. Document Upload

```typescript
import { validateDocumentFile } from '../utils/validation'

const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const selectedFile = e.target.files?.[0]
  if (selectedFile) {
    const validation = validateDocumentFile(selectedFile)
    if (!validation.valid) {
      message.error(validation.message)
      return
    }
    setFile(selectedFile)
  }
}
```

### 4. User Management Form

```typescript
import { commonValidationRules, formRules } from '../../utils/validation'

<Form form={form} layout="vertical">
  <Form.Item
    name="email"
    label="邮箱"
    rules={commonValidationRules.email}
  >
    <Input placeholder="user@example.com" />
  </Form.Item>
  
  <Form.Item
    name="role"
    label="角色"
    rules={commonValidationRules.role}
  >
    <Select>
      <Option value="admin">管理员</Option>
      <Option value="specialist">行业专员</Option>
      <Option value="user">普通用户</Option>
    </Select>
  </Form.Item>
  
  {selectedRole === 'specialist' && (
    <Form.Item
      name="assignedIndustries"
      label="分配的行业"
      rules={commonValidationRules.assignedIndustries}
    >
      <Select mode="multiple">
        {industries.map(industry => (
          <Option key={industry.id} value={industry.id}>
            {industry.name}
          </Option>
        ))}
      </Select>
    </Form.Item>
  )}
</Form>
```

## Validation Flow

### Client-Side Validation Flow

1. **Input Change**: User enters data
2. **Real-time Validation**: Ant Design validates on blur/change
3. **Visual Feedback**: Error messages appear below fields
4. **Submit Attempt**: Form.validateFields() checks all rules
5. **Submission**: Only proceeds if all validations pass

### Error Display

Ant Design automatically displays validation errors:
- Red border around invalid fields
- Error message below the field
- Form submission is blocked until all errors are resolved

## Best Practices

### 1. Always Validate Before Submission

```typescript
const handleSubmit = async () => {
  try {
    const values = await form.validateFields()
    // Proceed with submission
  } catch (error: any) {
    if (error.errorFields) return // Validation failed
    // Handle other errors
  }
}
```

### 2. Provide Clear Error Messages

```typescript
// Good
formRules.required('行业名称')
// Message: "行业名称不能为空"

// Bad
formRules.required()
// Message: "此字段不能为空"
```

### 3. Use Character Counters

```typescript
<Input maxLength={100} showCount />
<TextArea maxLength={500} showCount />
```

### 4. Validate Files Immediately

```typescript
const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (file) {
    const validation = validateDocumentFile(file)
    if (!validation.valid) {
      message.error(validation.message)
      setFile(null)
      return
    }
    setFile(file)
  }
}
```

### 5. Combine Multiple Validations

```typescript
<Form.Item
  name="name"
  rules={[
    formRules.required('名称'),
    formRules.whitespace('名称'),
    formRules.minLength(1, '名称'),
    formRules.maxLength(100, '名称'),
  ]}
>
  <Input />
</Form.Item>
```

## Validation Requirements Coverage

This implementation satisfies **需求 12.2**:

> WHEN 用户提交表单时，THEN 系统应当在客户端验证必填字段和数据格式

### Covered Validations:

✅ **Required Fields**: All forms validate required fields before submission
✅ **Data Format**: Email, URL, file types are validated
✅ **Length Constraints**: Min/max length enforced on text fields
✅ **File Size**: File uploads are checked against size limits
✅ **File Type**: Only allowed file types can be uploaded
✅ **Array Selection**: Multi-select fields validate min/max selections
✅ **Whitespace**: Fields cannot contain only whitespace
✅ **Real-time Feedback**: Errors shown immediately on blur/change

## Testing Validation

### Manual Testing Checklist

- [ ] Try submitting empty required fields
- [ ] Enter invalid email addresses
- [ ] Enter text exceeding max length
- [ ] Upload files that are too large
- [ ] Upload files with wrong extensions
- [ ] Enter whitespace-only values
- [ ] Test multi-select with min/max constraints
- [ ] Verify error messages are clear and helpful
- [ ] Check that valid data passes validation
- [ ] Ensure form submission is blocked when invalid

### Automated Testing

```typescript
import { validateRequired, validateEmail, validateLength } from './validation'

describe('Validation Utils', () => {
  test('validateRequired rejects empty values', () => {
    expect(validateRequired('').valid).toBe(false)
    expect(validateRequired('  ').valid).toBe(false)
    expect(validateRequired('value').valid).toBe(true)
  })
  
  test('validateEmail validates format', () => {
    expect(validateEmail('invalid').valid).toBe(false)
    expect(validateEmail('user@example.com').valid).toBe(true)
  })
  
  test('validateLength checks bounds', () => {
    expect(validateLength('ab', 3, 10).valid).toBe(false)
    expect(validateLength('abc', 3, 10).valid).toBe(true)
    expect(validateLength('a'.repeat(11), 3, 10).valid).toBe(false)
  })
})
```

## Future Enhancements

1. **Async Validation**: Check uniqueness against server
2. **Custom Validators**: Domain-specific validation rules
3. **Conditional Validation**: Rules that depend on other fields
4. **Cross-field Validation**: Validate relationships between fields
5. **Internationalization**: Support multiple languages for error messages
6. **Accessibility**: Improve screen reader support for validation errors
