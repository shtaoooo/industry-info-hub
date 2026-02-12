import { S3Client } from '@aws-sdk/client-s3'

export const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
})

export const BUCKET_NAME = process.env.DOCUMENTS_BUCKET || 'industry-portal-documents'

export const S3_PATHS = {
  USE_CASES: 'use-cases',
  SOLUTIONS: 'solutions',
  CUSTOMER_CASES: 'customer-cases',
}
