import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import * as path from 'path';

export class IndustryPortalStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Tables
    const industriesTable = new dynamodb.Table(this, 'IndustriesTable', {
      tableName: 'IndustryPortal-Industries',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const subIndustriesTable = new dynamodb.Table(this, 'SubIndustriesTable', {
      tableName: 'IndustryPortal-SubIndustries',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const useCasesTable = new dynamodb.Table(this, 'UseCasesTable', {
      tableName: 'IndustryPortal-UseCases',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const solutionsTable = new dynamodb.Table(this, 'SolutionsTable', {
      tableName: 'IndustryPortal-Solutions',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const mappingTable = new dynamodb.Table(this, 'MappingTable', {
      tableName: 'IndustryPortal-UseCaseSolutionMapping',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    mappingTable.addGlobalSecondaryIndex({
      indexName: 'ReverseIndex',
      partitionKey: { name: 'GSI_PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI_SK', type: dynamodb.AttributeType.STRING },
    });

    const customerCasesTable = new dynamodb.Table(this, 'CustomerCasesTable', {
      tableName: 'IndustryPortal-CustomerCases',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: 'IndustryPortal-Users',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // S3 Bucket for Documents
    const documentsBucket = new s3.Bucket(this, 'DocumentsBucket', {
      bucketName: `industry-portal-docs-v2-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      cors: [{
        allowedHeaders: ['*'],
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST, s3.HttpMethods.DELETE],
        allowedOrigins: ['*'],
        maxAge: 3600,
      }],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Cognito User Pool
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'IndustryPortalUsers',
      signInAliases: { email: true },
      autoVerify: { email: true },
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: { sms: false, otp: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      customAttributes: {
        role: new cognito.StringAttribute({ mutable: true }),
        assignedIndustries: new cognito.StringAttribute({ mutable: true }),
      },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const userPoolClient = userPool.addClient('WebClient', {
      userPoolClientName: 'IndustryPortalWebClient',
      generateSecret: false,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      preventUserExistenceErrors: true,
    });

    const identityPool = new cognito.CfnIdentityPool(this, 'IdentityPool', {
      identityPoolName: 'IndustryPortalIdentityPool',
      allowUnauthenticatedIdentities: true,
      cognitoIdentityProviders: [{
        clientId: userPoolClient.userPoolClientId,
        providerName: userPool.userPoolProviderName,
      }],
    });

    // Common Lambda environment variables
    const commonEnv = {
      INDUSTRIES_TABLE: industriesTable.tableName,
      SUB_INDUSTRIES_TABLE: subIndustriesTable.tableName,
      USE_CASES_TABLE: useCasesTable.tableName,
      SOLUTIONS_TABLE: solutionsTable.tableName,
      MAPPING_TABLE: mappingTable.tableName,
      CUSTOMER_CASES_TABLE: customerCasesTable.tableName,
      USERS_TABLE: usersTable.tableName,
      DOCUMENTS_BUCKET: documentsBucket.bucketName,
      USER_POOL_ID: userPool.userPoolId,
      NODE_OPTIONS: '--enable-source-maps',
    };

    // Lambda function factory
    const createFunction = (name: string, handler: string, timeout = 30, memory = 1024) => {
      const fn = new lambda.Function(this, name, {
        functionName: `IndustryPortal-${name}`,
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: `dist/functions/${handler}.handler`,
        code: lambda.Code.fromAsset(path.join(__dirname, '../../backend'), {
          exclude: ['src', '*.ts', 'tsconfig.json', 'vitest.config.ts', 'node_modules/.bin'],
        }),
        environment: commonEnv,
        timeout: cdk.Duration.seconds(timeout),
        memorySize: memory,
        tracing: lambda.Tracing.ACTIVE,
      });
      return fn;
    };

    // Create Lambda Functions
    const industryManagementFn = createFunction('IndustryManagement', 'industryManagement');
    const csvImportFn = createFunction('CSVImport', 'csvImport', 300, 2048);
    const subIndustryManagementFn = createFunction('SubIndustryManagement', 'subIndustryManagement');
    const solutionManagementFn = createFunction('SolutionManagement', 'solutionManagement');
    const useCaseManagementFn = createFunction('UseCaseManagement', 'useCaseManagement');
    const mappingManagementFn = createFunction('MappingManagement', 'mappingManagement');
    const customerCaseManagementFn = createFunction('CustomerCaseManagement', 'customerCaseManagement');
    const publicBrowsingFn = createFunction('PublicBrowsing', 'publicBrowsing');
    const documentDownloadFn = createFunction('DocumentDownload', 'documentDownload');
    const userManagementFn = createFunction('UserManagement', 'userManagement');

    // Grant DynamoDB permissions
    industriesTable.grantReadWriteData(industryManagementFn);
    subIndustriesTable.grantReadWriteData(industryManagementFn);
    industriesTable.grantReadWriteData(csvImportFn);
    subIndustriesTable.grantReadWriteData(csvImportFn);
    industriesTable.grantReadWriteData(subIndustryManagementFn);
    subIndustriesTable.grantReadWriteData(subIndustryManagementFn);
    useCasesTable.grantReadWriteData(subIndustryManagementFn);
    solutionsTable.grantReadWriteData(solutionManagementFn);
    customerCasesTable.grantReadWriteData(solutionManagementFn);
    industriesTable.grantReadWriteData(useCaseManagementFn);
    subIndustriesTable.grantReadWriteData(useCaseManagementFn);
    useCasesTable.grantReadWriteData(useCaseManagementFn);
    industriesTable.grantReadWriteData(mappingManagementFn);
    subIndustriesTable.grantReadWriteData(mappingManagementFn);
    useCasesTable.grantReadWriteData(mappingManagementFn);
    solutionsTable.grantReadWriteData(mappingManagementFn);
    mappingTable.grantReadWriteData(mappingManagementFn);
    customerCasesTable.grantReadWriteData(mappingManagementFn);
    industriesTable.grantReadWriteData(customerCaseManagementFn);
    subIndustriesTable.grantReadWriteData(customerCaseManagementFn);
    useCasesTable.grantReadWriteData(customerCaseManagementFn);
    solutionsTable.grantReadWriteData(customerCaseManagementFn);
    customerCasesTable.grantReadWriteData(customerCaseManagementFn);
    mappingTable.grantReadWriteData(customerCaseManagementFn);
    industriesTable.grantReadData(publicBrowsingFn);
    subIndustriesTable.grantReadData(publicBrowsingFn);
    useCasesTable.grantReadData(publicBrowsingFn);
    solutionsTable.grantReadData(publicBrowsingFn);
    customerCasesTable.grantReadData(publicBrowsingFn);
    mappingTable.grantReadData(publicBrowsingFn);
    usersTable.grantReadWriteData(userManagementFn);

    // Grant S3 permissions
    documentsBucket.grantReadWrite(solutionManagementFn);
    documentsBucket.grantReadWrite(useCaseManagementFn);
    documentsBucket.grantReadWrite(customerCaseManagementFn);
    documentsBucket.grantRead(publicBrowsingFn);
    documentsBucket.grantRead(documentDownloadFn);

    // Grant Cognito permissions
    userManagementFn.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'cognito-idp:AdminCreateUser',
        'cognito-idp:AdminDeleteUser',
        'cognito-idp:AdminUpdateUserAttributes',
        'cognito-idp:AdminGetUser',
        'cognito-idp:ListUsers',
      ],
      resources: [userPool.userPoolArn],
    }));

    // HTTP API Gateway
    const httpApi = new apigatewayv2.HttpApi(this, 'HttpApi', {
      apiName: 'IndustryPortalAPI',
      corsPreflight: {
        allowOrigins: ['*'],
        allowHeaders: ['*'],
        allowMethods: [
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.POST,
          apigatewayv2.CorsHttpMethod.PUT,
          apigatewayv2.CorsHttpMethod.DELETE,
          apigatewayv2.CorsHttpMethod.OPTIONS,
        ],
        maxAge: cdk.Duration.seconds(600),
      },
    });

    // JWT Authorizer
    const authorizer = new authorizers.HttpJwtAuthorizer('JwtAuthorizer', 
      `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`,
      {
        jwtAudience: [userPoolClient.userPoolClientId],
      }
    );

    // Add routes
    const addRoute = (path: string, method: apigatewayv2.HttpMethod, fn: lambda.Function) => {
      httpApi.addRoutes({
        path,
        methods: [method],
        integration: new integrations.HttpLambdaIntegration(`${fn.node.id}Integration`, fn),
        authorizer,
      });
    };

    // Admin routes - Industry Management
    addRoute('/admin/industries', apigatewayv2.HttpMethod.GET, industryManagementFn);
    addRoute('/admin/industries', apigatewayv2.HttpMethod.POST, industryManagementFn);
    addRoute('/admin/industries/{id}', apigatewayv2.HttpMethod.PUT, industryManagementFn);
    addRoute('/admin/industries/{id}', apigatewayv2.HttpMethod.DELETE, industryManagementFn);
    addRoute('/admin/industries/{id}/visibility', apigatewayv2.HttpMethod.PATCH, industryManagementFn);
    addRoute('/admin/industries/import-csv', apigatewayv2.HttpMethod.POST, csvImportFn);

    // Admin routes - Sub-Industry Management
    addRoute('/admin/sub-industries', apigatewayv2.HttpMethod.GET, subIndustryManagementFn);
    addRoute('/admin/industries/{industryId}/sub-industries', apigatewayv2.HttpMethod.GET, subIndustryManagementFn);
    addRoute('/admin/sub-industries', apigatewayv2.HttpMethod.POST, subIndustryManagementFn);
    addRoute('/admin/sub-industries/{id}', apigatewayv2.HttpMethod.PUT, subIndustryManagementFn);
    addRoute('/admin/sub-industries/{id}', apigatewayv2.HttpMethod.DELETE, subIndustryManagementFn);
    addRoute('/admin/sub-industries/{id}/move', apigatewayv2.HttpMethod.PATCH, subIndustryManagementFn);

    // Admin routes - Solution Management
    addRoute('/admin/solutions', apigatewayv2.HttpMethod.GET, solutionManagementFn);
    addRoute('/admin/solutions/{id}', apigatewayv2.HttpMethod.GET, solutionManagementFn);
    addRoute('/admin/solutions', apigatewayv2.HttpMethod.POST, solutionManagementFn);
    addRoute('/admin/solutions/{id}', apigatewayv2.HttpMethod.PUT, solutionManagementFn);
    addRoute('/admin/solutions/{id}', apigatewayv2.HttpMethod.DELETE, solutionManagementFn);
    addRoute('/admin/solutions/{id}/detail-markdown', apigatewayv2.HttpMethod.POST, solutionManagementFn);
    addRoute('/admin/solutions/{id}/detail-markdown', apigatewayv2.HttpMethod.GET, solutionManagementFn);

    // Admin routes - User Management
    addRoute('/admin/users', apigatewayv2.HttpMethod.GET, userManagementFn);
    addRoute('/admin/users/{userId}', apigatewayv2.HttpMethod.GET, userManagementFn);
    addRoute('/admin/users', apigatewayv2.HttpMethod.POST, userManagementFn);
    addRoute('/admin/users/{userId}', apigatewayv2.HttpMethod.PUT, userManagementFn);
    addRoute('/admin/users/{userId}', apigatewayv2.HttpMethod.DELETE, userManagementFn);

    // Specialist routes - Use Case Management
    addRoute('/specialist/use-cases', apigatewayv2.HttpMethod.GET, useCaseManagementFn);
    addRoute('/specialist/use-cases', apigatewayv2.HttpMethod.POST, useCaseManagementFn);
    addRoute('/specialist/use-cases/{id}', apigatewayv2.HttpMethod.PUT, useCaseManagementFn);
    addRoute('/specialist/use-cases/{id}', apigatewayv2.HttpMethod.DELETE, useCaseManagementFn);
    addRoute('/specialist/use-cases/{id}/documents', apigatewayv2.HttpMethod.POST, useCaseManagementFn);
    addRoute('/specialist/use-cases/{id}/documents/{docId}', apigatewayv2.HttpMethod.DELETE, useCaseManagementFn);

    // Specialist routes - Mapping Management
    addRoute('/specialist/use-cases/{useCaseId}/solutions/{solutionId}', apigatewayv2.HttpMethod.POST, mappingManagementFn);
    addRoute('/specialist/use-cases/{useCaseId}/solutions/{solutionId}', apigatewayv2.HttpMethod.DELETE, mappingManagementFn);
    addRoute('/specialist/use-cases/{useCaseId}/solutions', apigatewayv2.HttpMethod.GET, mappingManagementFn);
    addRoute('/specialist/solutions/{solutionId}/use-cases', apigatewayv2.HttpMethod.GET, mappingManagementFn);

    // Specialist routes - Customer Case Management
    addRoute('/specialist/customer-cases', apigatewayv2.HttpMethod.GET, customerCaseManagementFn);
    addRoute('/specialist/customer-cases', apigatewayv2.HttpMethod.POST, customerCaseManagementFn);
    addRoute('/specialist/customer-cases/{id}', apigatewayv2.HttpMethod.PUT, customerCaseManagementFn);
    addRoute('/specialist/customer-cases/{id}', apigatewayv2.HttpMethod.DELETE, customerCaseManagementFn);
    addRoute('/specialist/customer-cases/{id}/documents', apigatewayv2.HttpMethod.POST, customerCaseManagementFn);

    // Public routes
    addRoute('/public/industries', apigatewayv2.HttpMethod.GET, publicBrowsingFn);
    addRoute('/public/industries/{id}', apigatewayv2.HttpMethod.GET, publicBrowsingFn);
    addRoute('/public/industries/{id}/sub-industries', apigatewayv2.HttpMethod.GET, publicBrowsingFn);
    addRoute('/public/sub-industries/{id}/use-cases', apigatewayv2.HttpMethod.GET, publicBrowsingFn);
    addRoute('/public/use-cases/{id}', apigatewayv2.HttpMethod.GET, publicBrowsingFn);
    addRoute('/public/use-cases/{id}/solutions', apigatewayv2.HttpMethod.GET, publicBrowsingFn);
    addRoute('/public/solutions/{id}', apigatewayv2.HttpMethod.GET, publicBrowsingFn);
    addRoute('/public/solutions/{id}/detail-markdown', apigatewayv2.HttpMethod.GET, publicBrowsingFn);
    addRoute('/public/solutions/{id}/customer-cases', apigatewayv2.HttpMethod.GET, publicBrowsingFn);
    addRoute('/public/documents/{id}/download', apigatewayv2.HttpMethod.GET, documentDownloadFn);

    // CloudFront OAI for S3 (commented out - not using CloudFront for now)
    // const oai = new cloudfront.OriginAccessIdentity(this, 'OAI', {
    //   comment: 'OAI for Industry Portal Documents',
    // });

    // documentsBucket.grantRead(oai);

    // // CloudFront Distribution for Documents
    // const distribution = new cloudfront.Distribution(this, 'Distribution', {
    //   comment: 'Industry Portal Documents CDN',
    //   defaultBehavior: {
    //     origin: new origins.S3Origin(documentsBucket, { originAccessIdentity: oai }),
    //     viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    //     allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
    //     cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
    //     compress: true,
    //     cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
    //   },
    //   priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    // });

    // Amplify Hosting for Frontend (manual GitHub connection via console)
    const amplifyApp = new amplify.CfnApp(this, 'AmplifyApp', {
      name: 'IndustryPortal',
      buildSpec: `version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd frontend
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: frontend/dist
    files:
      - '**/*'
  cache:
    paths:
      - frontend/node_modules/**/*`,
      environmentVariables: [
        { name: 'VITE_AWS_REGION', value: this.region },
        { name: 'VITE_USER_POOL_ID', value: userPool.userPoolId },
        { name: 'VITE_USER_POOL_CLIENT_ID', value: userPoolClient.userPoolClientId },
        { name: 'VITE_IDENTITY_POOL_ID', value: identityPool.ref },
        { name: 'VITE_API_ENDPOINT', value: httpApi.apiEndpoint },
        { name: 'VITE_S3_BUCKET', value: documentsBucket.bucketName },
      ],
      iamServiceRole: new iam.Role(this, 'AmplifyRole', {
        assumedBy: new iam.ServicePrincipal('amplify.amazonaws.com'),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess-Amplify'),
        ],
      }).roleArn,
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: httpApi.apiEndpoint,
      description: 'API Gateway endpoint URL',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'IdentityPoolId', {
      value: identityPool.ref,
      description: 'Cognito Identity Pool ID',
    });

    new cdk.CfnOutput(this, 'DocumentsBucketName', {
      value: documentsBucket.bucketName,
      description: 'S3 Bucket for Documents',
    });

    // new cdk.CfnOutput(this, 'CloudFrontDocumentsDomain', {
    //   value: distribution.distributionDomainName,
    //   description: 'CloudFront Distribution Domain Name for Documents',
    // });

    new cdk.CfnOutput(this, 'AmplifyAppId', {
      value: amplifyApp.attrAppId,
      description: 'Amplify App ID (connect GitHub in console)',
    });
  }
}
