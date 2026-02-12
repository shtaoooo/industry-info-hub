// AWS Amplify Configuration
// This file should be updated with actual AWS resource values after deployment

const awsconfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_USER_POOL_ID || 'us-east-1_XXXXXXXXX',
      userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID || 'XXXXXXXXXXXXXXXXXXXXXXXXXX',
      identityPoolId: import.meta.env.VITE_IDENTITY_POOL_ID || 'us-east-1:XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX',
      loginWith: {
        email: true,
      },
      signUpVerificationMethod: 'code' as const,
      userAttributes: {
        email: {
          required: true,
        },
      },
      allowGuestAccess: true,
      passwordFormat: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialCharacters: true,
      },
    },
  },
  API: {
    REST: {
      IndustryPortalAPI: {
        endpoint: import.meta.env.VITE_API_ENDPOINT || 'https://api.example.com',
        region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
      },
    },
  },
  Storage: {
    S3: {
      bucket: import.meta.env.VITE_S3_BUCKET || 'industry-portal-documents',
      region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
    },
  },
}

export default awsconfig
