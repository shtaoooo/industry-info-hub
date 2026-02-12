import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { successResponse, errorResponse } from '../utils/response'
import { s3Client, BUCKET_NAME } from '../utils/s3'

/**
 * Generate presigned URL for document download
 * GET /public/documents/{id}/download
 * 
 * Query parameters:
 * - s3Key: The S3 key of the document
 */
export async function downloadDocument(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const documentId = event.pathParameters?.id
    const s3Key = event.queryStringParameters?.s3Key

    if (!documentId) {
      return errorResponse('VALIDATION_ERROR', '文档ID不能为空', 400)
    }

    if (!s3Key) {
      return errorResponse('VALIDATION_ERROR', 'S3 Key不能为空', 400)
    }

    // Generate presigned URL for download (valid for 1 hour)
    const presignedUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
      }),
      { expiresIn: 3600 }
    )

    return successResponse({
      url: presignedUrl,
      expiresIn: 3600,
      documentId,
    })
  } catch (error: any) {
    console.error('Error generating download URL:', error)
    
    if (error.name === 'NoSuchKey') {
      return errorResponse('NOT_FOUND', '文档不存在', 404)
    }
    
    return errorResponse('INTERNAL_ERROR', '生成下载链接失败', 500)
  }
}

/**
 * Lambda handler - routes requests to appropriate function
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod
  const path = event.resource || event.path

  try {
    // GET /public/documents/{id}/download
    if (method === 'GET' && path.match(/\/public\/documents\/[^/]+\/download$/)) {
      return await downloadDocument(event)
    }

    return errorResponse('NOT_FOUND', '接口不存在', 404)
  } catch (error: any) {
    console.error('Unhandled error:', error)
    return errorResponse('INTERNAL_ERROR', '服务器内部错误', 500)
  }
}
