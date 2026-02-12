# Error Handling and User Feedback

This document describes the comprehensive error handling and user feedback system implemented in the Industry Portal.

## Overview

The system implements a multi-layered error handling approach:

1. **Backend Error Middleware** - Centralized error handling in Lambda functions
2. **Frontend Error Handler** - User-friendly error messages and feedback
3. **API Error Propagation** - Structured error responses from backend to frontend
4. **Loading State Management** - Visual feedback during async operations
5. **Success/Error Notifications** - Toast messages for user feedback

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Component                                             │ │
│  │  - Calls API                                           │ │
│  │  - Shows loading state                                 │ │
│  │  - Handles errors with errorHandler                    │ │
│  │  - Displays success/error messages                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↓                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  API Service (api.ts)                                  │ │
│  │  - Makes HTTP requests                                 │ │
│  │  - Parses error responses                              │ │
│  │  - Throws ApiError with code, message, details         │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                        Backend                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Lambda Function                                       │ │
│  │  - Validates input                                     │ │
│  │  - Executes business logic                             │ │
│  │  - Throws AppError on failure                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↓                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Error Middleware                                      │ │
│  │  - Catches all errors                                  │ │
│  │  - Transforms to standard format                       │ │
│  │  │  Returns errorResponse with code, message, details  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Backend Error Handling

### Error Classes

Located in `backend/src/utils/errorMiddleware.ts`:

```typescript
// Base error class
class AppError extends Error {
  constructor(code: string, message: string, statusCode: number, details?: any)
}

// Specific error types
class ValidationError extends AppError      // 400
class NotFoundError extends AppError        // 404
class UnauthorizedError extends AppError    // 401
class ForbiddenError extends AppError       // 403
class ConflictError extends AppError        // 409
class InternalError extends AppError        // 500
```

### Usage in Lambda Functions

```typescript
import { ValidationError, NotFoundError, ConflictError } from '../utils/errorMiddleware'

export async function deleteIndustry(event: APIGatewayProxyEvent) {
  try {
    const industryId = event.pathParameters?.id
    
    if (!industryId) {
      throw new ValidationError('行业ID不能为空')
    }
    
    const existing = await getIndustry(industryId)
    if (!existing) {
      throw new NotFoundError('行业不存在')
    }
    
    const hasSubIndustries = await checkIndustryHasSubIndustries(industryId)
    if (hasSubIndustries) {
      throw new ConflictError(
        '该行业包含子行业，无法删除',
        { dependency: 'sub-industries' }
      )
    }
    
    await deleteIndustryFromDB(industryId)
    return successResponse({ message: '删除成功' })
    
  } catch (error: any) {
    return handleError(error)
  }
}
```

### Error Response Format

All errors return a consistent JSON structure:

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "该行业包含子行业，无法删除",
    "details": {
      "dependency": "sub-industries"
    }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Input validation failed |
| UNAUTHORIZED | 401 | Not authenticated |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Operation conflict (e.g., referential integrity) |
| CONCURRENT_MODIFICATION | 409 | Optimistic locking conflict |
| INTERNAL_ERROR | 500 | Server error |

## Frontend Error Handling

### Error Handler Utility

Located in `frontend/src/utils/errorHandler.ts`:

#### Display Error Messages

```typescript
import { showError, showSuccess, showWarning, showInfo } from '../utils/errorHandler'

// Show error
try {
  await deleteIndustry(id)
  showSuccess('删除成功')
} catch (error) {
  showError(error) // Automatically shows user-friendly message
}

// Custom error message
try {
  await operation()
} catch (error) {
  showError(error, '操作失败，请重试')
}
```

#### Handle API Calls

```typescript
import { handleApiCall } from '../utils/errorHandler'

// Automatic error handling with loading state
const result = await handleApiCall(
  () => industryService.create(data),
  {
    successMessage: '创建成功',
    errorMessage: '创建失败',
    showLoading: true,
  }
)

if (result) {
  // Success
  navigate('/industries')
}
```

#### Error Type Checking

```typescript
import { isValidationError, isAuthError, isConflictError } from '../utils/errorHandler'

try {
  await operation()
} catch (error) {
  if (isValidationError(error)) {
    // Handle validation error
  } else if (isAuthError(error)) {
    // Redirect to login
    navigate('/login')
  } else if (isConflictError(error)) {
    // Show refresh prompt
    showWarning('数据已更新，请刷新页面')
  }
}
```

#### Retry Failed Operations

```typescript
import { retryOperation } from '../utils/errorHandler'

// Automatically retry on transient failures
const result = await retryOperation(
  () => fetchData(),
  3,  // max retries
  1000  // delay in ms
)
```

### API Service

Enhanced `frontend/src/services/api.ts` with structured error handling:

```typescript
import { api, ApiError } from './api'

try {
  const data = await api.get('/admin/industries')
} catch (error) {
  if (error instanceof ApiError) {
    console.log(error.code)        // 'NOT_FOUND'
    console.log(error.message)     // '资源不存在'
    console.log(error.statusCode)  // 404
    console.log(error.details)     // Additional details
  }
}
```

### Error Message Mapping

User-friendly messages for common error codes:

| Error Code | User Message |
|------------|--------------|
| VALIDATION_ERROR | 输入数据验证失败 |
| UNAUTHORIZED | 未授权访问，请先登录 |
| FORBIDDEN | 权限不足，无法执行此操作 |
| NOT_FOUND | 请求的资源不存在 |
| CONFLICT | 操作冲突，请刷新后重试 |
| CONCURRENT_MODIFICATION | 数据已被其他用户修改，请刷新后重试 |
| NETWORK_ERROR | 网络连接失败，请检查网络 |
| INTERNAL_ERROR | 服务器内部错误，请稍后重试 |

## Loading State Management

### useAsyncOperation Hook

```typescript
import { useAsyncOperation } from '../utils/loadingState'

function MyComponent() {
  const { loading, error, data, execute } = useAsyncOperation()
  
  const handleLoad = async () => {
    try {
      await execute(() => fetchData())
      // data is now available
    } catch (error) {
      // error is set
    }
  }
  
  if (loading) return <Spin />
  if (error) return <Alert message={error.message} type="error" />
  
  return <div>{data}</div>
}
```

### useLoadingStates Hook

For managing multiple loading states:

```typescript
import { useLoadingStates } from '../utils/loadingState'

function MyComponent() {
  const { setLoading, isLoading, isAnyLoading } = useLoadingStates()
  
  const handleSave = async () => {
    setLoading('save', true)
    try {
      await saveData()
    } finally {
      setLoading('save', false)
    }
  }
  
  const handleDelete = async () => {
    setLoading('delete', true)
    try {
      await deleteData()
    } finally {
      setLoading('delete', false)
    }
  }
  
  return (
    <>
      <Button loading={isLoading('save')} onClick={handleSave}>Save</Button>
      <Button loading={isLoading('delete')} onClick={handleDelete}>Delete</Button>
      {isAnyLoading() && <Spin />}
    </>
  )
}
```

## User Feedback

### Success Messages (需求 12.3)

```typescript
import { message } from 'antd'

// After successful operation
await industryService.create(data)
message.success('行业创建成功')
```

### Error Messages (需求 12.4)

```typescript
import { showError } from '../utils/errorHandler'

try {
  await operation()
} catch (error) {
  showError(error) // Shows user-friendly error with suggestion
}
```

### Loading Indicators

```typescript
// Button loading state
<Button loading={submitting} onClick={handleSubmit}>
  保存
</Button>

// Table loading state
<Table loading={loading} dataSource={data} />

// Page loading state
{loading && <Spin size="large" />}
```

### Confirmation Dialogs

```typescript
import { Popconfirm } from 'antd'

<Popconfirm
  title="确定要删除此行业吗？"
  description="如果该行业下有子行业，将无法删除。"
  onConfirm={() => handleDelete(id)}
  okText="确定"
  cancelText="取消"
>
  <Button danger>删除</Button>
</Popconfirm>
```

## Best Practices

### 1. Always Handle Errors

```typescript
// Good
try {
  await operation()
  showSuccess('操作成功')
} catch (error) {
  showError(error)
}

// Bad
await operation() // Unhandled error
```

### 2. Provide Context in Error Messages

```typescript
// Good
throw new ValidationError('行业名称不能为空', { field: 'name' })

// Bad
throw new Error('Validation failed')
```

### 3. Show Loading States

```typescript
// Good
const [loading, setLoading] = useState(false)
setLoading(true)
try {
  await operation()
} finally {
  setLoading(false)
}

// Bad
await operation() // No loading indicator
```

### 4. Use Appropriate Error Types

```typescript
// Good
if (!industryId) {
  throw new ValidationError('行业ID不能为空')
}

// Bad
if (!industryId) {
  throw new Error('Missing ID')
}
```

### 5. Log Errors for Debugging

```typescript
// Errors are automatically logged in errorHandler
showError(error) // Logs to console with full details
```

## Testing Error Handling

### Backend Tests

```typescript
describe('Error Handling', () => {
  test('throws ValidationError for missing fields', async () => {
    await expect(createIndustry({ name: '' }))
      .rejects
      .toThrow(ValidationError)
  })
  
  test('returns 404 for non-existent resource', async () => {
    const response = await handler(event)
    expect(response.statusCode).toBe(404)
    const body = JSON.parse(response.body)
    expect(body.error.code).toBe('NOT_FOUND')
  })
})
```

### Frontend Tests

```typescript
describe('Error Display', () => {
  test('shows error message on API failure', async () => {
    api.get = jest.fn().mockRejectedValue(
      new ApiError('NOT_FOUND', '资源不存在', 404)
    )
    
    render(<MyComponent />)
    await waitFor(() => {
      expect(screen.getByText('资源不存在')).toBeInTheDocument()
    })
  })
})
```

## Requirements Coverage

This implementation satisfies:

✅ **需求 12.3**: WHEN 操作成功完成时，THEN 系统应当显示成功提示信息
- Success messages displayed using `message.success()`
- Automatic success feedback in `handleApiCall`

✅ **需求 12.4**: WHEN 操作失败时，THEN 系统应当显示清晰的错误信息和可能的解决建议
- User-friendly error messages
- Error suggestions provided by `getErrorSuggestion()`
- Detailed error information logged for debugging

## Future Enhancements

1. **Error Tracking**: Integrate with Sentry or similar service
2. **Error Analytics**: Track error frequency and patterns
3. **Offline Support**: Handle offline scenarios gracefully
4. **Error Recovery**: Automatic retry with exponential backoff
5. **User Feedback**: Allow users to report errors
6. **Internationalization**: Multi-language error messages
