import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
})

export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
})

export const TABLE_NAMES = {
  INDUSTRIES: process.env.INDUSTRIES_TABLE || 'IndustryPortal-Industries',
  SUB_INDUSTRIES: process.env.SUB_INDUSTRIES_TABLE || 'IndustryPortal-SubIndustries',
  USE_CASES: process.env.USE_CASES_TABLE || 'IndustryPortal-UseCases',
  SOLUTIONS: process.env.SOLUTIONS_TABLE || 'IndustryPortal-Solutions',
  MAPPING: process.env.MAPPING_TABLE || 'IndustryPortal-UseCaseSolutionMapping',
  CUSTOMER_CASES: process.env.CUSTOMER_CASES_TABLE || 'IndustryPortal-CustomerCases',
  USERS: process.env.USERS_TABLE || 'IndustryPortal-Users',
}
