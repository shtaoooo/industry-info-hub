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
import * as bedrock from 'aws-cdk-lib/aws-bedrock';
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
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Changed from RETAIN for dev environment
    });

    const subIndustriesTable = new dynamodb.Table(this, 'SubIndustriesTable', {
      tableName: 'IndustryPortal-SubIndustries',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const useCasesTable = new dynamodb.Table(this, 'UseCasesTable', {
      tableName: 'IndustryPortal-UseCases',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const solutionsTable = new dynamodb.Table(this, 'SolutionsTable', {
      tableName: 'IndustryPortal-Solutions',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const mappingTable = new dynamodb.Table(this, 'MappingTable', {
      tableName: 'IndustryPortal-UseCaseSolutionMapping',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
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
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: 'IndustryPortal-Users',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const newsTable = new dynamodb.Table(this, 'NewsTable', {
      tableName: 'IndustryPortal-News',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    newsTable.addGlobalSecondaryIndex({
      indexName: 'IndustryIndex',
      partitionKey: { name: 'industryId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'publishedAt', type: dynamodb.AttributeType.STRING },
    });

    const blogsTable = new dynamodb.Table(this, 'BlogsTable', {
      tableName: 'IndustryPortal-Blogs',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    blogsTable.addGlobalSecondaryIndex({
      indexName: 'IndustryIndex',
      partitionKey: { name: 'industryId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'publishedAt', type: dynamodb.AttributeType.STRING },
    });

    const accountsTable = new dynamodb.Table(this, 'AccountsTable', {
      tableName: 'IndustryPortal-Accounts',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const companiesTable = new dynamodb.Table(this, 'CompaniesTable', {
      tableName: 'IndustryPortal-Companies',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Add GSI for fuzzy search by company name
    companiesTable.addGlobalSecondaryIndex({
      indexName: 'NameIndex',
      partitionKey: { name: 'normalizedName', type: dynamodb.AttributeType.STRING },
    });

    // News Feeds Table
    const newsFeedsTable = new dynamodb.Table(this, 'NewsFeedsTable', {
      tableName: 'IndustryPortal-NewsFeeds',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    newsFeedsTable.addGlobalSecondaryIndex({
      indexName: 'IndustryIndex',
      partitionKey: { name: 'industryId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
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
      removalPolicy: cdk.RemovalPolicy.DESTROY,
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
        roles: new cognito.StringAttribute({ mutable: true }),
        assignedIndustries: new cognito.StringAttribute({ mutable: true }),
      },
      // 配置邮件发送
      // 注意：需要先在SES中验证发件邮箱地址后再启用
      // email: cognito.UserPoolEmail.withSES({
      //   fromEmail: 'noreply@industry-portal.com',
      //   fromName: '行业信息门户',
      //   replyTo: 'support@industry-portal.com',
      //   sesRegion: this.region,
      // }),
      // 自定义邮件模板
      userInvitation: {
        emailSubject: '欢迎加入行业信息门户',
        emailBody: `
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #0071e3; color: white; padding: 20px; text-align: center; }
                .content { background-color: #f5f5f7; padding: 30px; }
                .button { background-color: #0071e3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; color: #86868b; font-size: 12px; }
                .credentials { background-color: white; padding: 15px; border-radius: 8px; margin: 20px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>欢迎加入行业信息门户</h1>
                </div>
                <div class="content">
                  <p>您好，</p>
                  <p>管理员已为您创建了行业信息门户的账户。请使用以下凭证登录系统：</p>
                  <div class="credentials">
                    <p><strong>用户名：</strong>{username}</p>
                    <p><strong>临时密码：</strong>{####}</p>
                  </div>
                  <p>首次登录时，系统会要求您设置新密码。</p>
                  <p>密码要求：</p>
                  <ul>
                    <li>至少8个字符</li>
                    <li>包含大写字母</li>
                    <li>包含小写字母</li>
                    <li>包含数字</li>
                    <li>包含特殊字符</li>
                  </ul>
                  <a href="https://your-domain.com/login" class="button">立即登录</a>
                  <p>如有任何问题，请联系系统管理员。</p>
                </div>
                <div class="footer">
                  <p>此邮件由系统自动发送，请勿回复。</p>
                  <p>&copy; 2024 行业信息门户. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
        smsMessage: '您的用户名是 {username}，临时密码是 {####}',
      },
      // 自定义验证邮件模板
      userVerification: {
        emailSubject: '验证您的邮箱地址',
        emailBody: `
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #0071e3; color: white; padding: 20px; text-align: center; }
                .content { background-color: #f5f5f7; padding: 30px; }
                .code { background-color: white; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; }
                .footer { text-align: center; padding: 20px; color: #86868b; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>验证您的邮箱地址</h1>
                </div>
                <div class="content">
                  <p>您好，</p>
                  <p>感谢您注册行业信息门户。请使用以下验证码完成邮箱验证：</p>
                  <div class="code">{####}</div>
                  <p>此验证码将在24小时后过期。</p>
                  <p>如果您没有注册此账户，请忽略此邮件。</p>
                </div>
                <div class="footer">
                  <p>此邮件由系统自动发送，请勿回复。</p>
                  <p>&copy; 2024 行业信息门户. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
        emailStyle: cognito.VerificationEmailStyle.CODE,
        smsMessage: '您的验证码是 {####}',
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Changed from RETAIN to DESTROY for dev environment
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

    // Identity Pool (commented out - not needed, frontend uses JWT auth via API Gateway)
    // const identityPool = new cognito.CfnIdentityPool(this, 'IdentityPool', {
    //   identityPoolName: 'IndustryPortalIdentityPool',
    //   allowUnauthenticatedIdentities: true,
    //   cognitoIdentityProviders: [{
    //     clientId: userPoolClient.userPoolClientId,
    //     providerName: userPool.userPoolProviderName,
    //   }],
    // });

    // Common Lambda environment variables
    const commonEnv = {
      INDUSTRIES_TABLE: industriesTable.tableName,
      SUB_INDUSTRIES_TABLE: subIndustriesTable.tableName,
      USE_CASES_TABLE: useCasesTable.tableName,
      SOLUTIONS_TABLE: solutionsTable.tableName,
      MAPPING_TABLE: mappingTable.tableName,
      CUSTOMER_CASES_TABLE: customerCasesTable.tableName,
      USERS_TABLE: usersTable.tableName,
      NEWS_TABLE: newsTable.tableName,
      NEWS_FEEDS_TABLE: newsFeedsTable.tableName,
      BLOGS_TABLE: blogsTable.tableName,
      ACCOUNTS_TABLE: accountsTable.tableName,
      COMPANIES_TABLE: companiesTable.tableName,
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
    const newsManagementFn = createFunction('NewsManagement', 'newsManagement');
    const blogsManagementFn = createFunction('BlogsManagement', 'blogsManagement');
    const accountsManagementFn = createFunction('AccountsManagement', 'accountsManagement');
    const copilotAgentFn = createFunction('CopilotAgent', 'copilotAgent', 60, 1024);
    const newsAgentActionGroupFn = createFunction('NewsAgentActionGroup', 'newsAgentActionGroup', 30, 512);
    const newsAgentOrchestratorFn = createFunction('NewsAgentOrchestrator', 'newsAgentOrchestrator', 300, 1024); // Increased timeout for Agent processing

    // Bedrock Agent for News Search
    // Load OpenAPI schema from file
    const schemaPath = path.join(__dirname, '../../backend/src/schemas/newsAgentActionGroupSchema.json');
    const apiSchema = require(schemaPath);

    // Create IAM role for Bedrock Agent
    const bedrockAgentRole = new iam.Role(this, 'BedrockAgentRole', {
      assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
      description: 'Role for Bedrock News Agent',
    });

    // Grant Bedrock Agent permission to invoke the action group Lambda
    newsAgentActionGroupFn.grantInvoke(bedrockAgentRole);

    // Grant Bedrock Agent permission to invoke foundation models
    bedrockAgentRole.addToPolicy(new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel'],
      resources: ['*'],
    }));

    // Create Bedrock Agent using L1 construct (CfnAgent)
    const newsAgent = new bedrock.CfnAgent(this, 'BedrockNewsAgent', {
      agentName: 'IndustryPortalNewsAgent',
      agentResourceRoleArn: bedrockAgentRole.roleArn,
      foundationModel: 'us.amazon.nova-premier-v1:0', // Use inference profile ID instead of direct model ID
      instruction: `你是一个专业的新闻编辑助手。你的任务是帮助用户搜索和整理新闻。

你有以下工具可以使用：
1. searchGoogleNews(keyword) - 搜索单个关键词的 Google News（简单搜索）
2. searchGoogleNewsAdvanced(keywords[], daysBack?) - 搜索多个关键词并支持时间过滤（高级搜索，推荐使用）
   - keywords: 关键词数组，例如 ["油气 数字化", "油气 信息化", "OSDU"]
   - daysBack: 可选，搜索过去N天的新闻，例如 10 表示过去10天
3. fetchRssFeed(url) - 从特定 RSS feed URL 获取新闻
4. searchMultipleSources(keyword, rssFeedUrls[]) - 综合 Google News 和多个 RSS feeds

工具选择指南：
- 如果用户提到"过去X天"、"最近X天"、"X天内"，使用 searchGoogleNewsAdvanced 并设置 daysBack
- 如果用户提到多个关键词或主题（如"数字化、信息化、智能化"），使用 searchGoogleNewsAdvanced 并传入多个关键词
- 如果只是简单的单关键词搜索，使用 searchGoogleNews
- 如果用户指定了特定网站或 RSS 源，使用 fetchRssFeed

搜索完成后，请：
1. 筛选出最相关的新闻（最多10条）
2. 为每条新闻写一个200字左右的中文概括摘要
3. 严格按照用户要求的JSON格式输出结果

重要规则：
- 摘要要用中文，简洁清晰
- 保留原文链接和来源信息
- 如果没有发布时间，使用当前日期
- 严格按照用户要求的格式输出`,
      description: 'Agent for searching and summarizing news from multiple sources',
      actionGroups: [
        {
          actionGroupName: 'NewsSearchActions',
          actionGroupExecutor: {
            lambda: newsAgentActionGroupFn.functionArn,
          },
          apiSchema: {
            payload: JSON.stringify(apiSchema),
          },
          description: 'Action group for searching news from Google News and RSS feeds',
        },
      ],
    });

    // Grant Bedrock Agent permission to invoke the action group Lambda
    newsAgentActionGroupFn.addPermission('AllowBedrockInvoke', {
      principal: new iam.ServicePrincipal('bedrock.amazonaws.com'),
      action: 'lambda:InvokeFunction',
      sourceArn: newsAgent.attrAgentArn,
    });

    // Create Agent Alias
    const newsAgentAlias = new bedrock.CfnAgentAlias(this, 'BedrockNewsAgentAlias', {
      agentId: newsAgent.attrAgentId,
      agentAliasName: 'prod',
      description: 'Production alias for News Agent',
    });

    // Add agent ID and alias to orchestrator Lambda environment
    newsAgentOrchestratorFn.addEnvironment('NEWS_AGENT_ID', newsAgent.attrAgentId);
    newsAgentOrchestratorFn.addEnvironment('NEWS_AGENT_ALIAS_ID', newsAgentAlias.attrAgentAliasId);

    // Grant DynamoDB permissions
    industriesTable.grantReadWriteData(industryManagementFn);
    subIndustriesTable.grantReadWriteData(industryManagementFn);
    industriesTable.grantReadWriteData(csvImportFn);
    subIndustriesTable.grantReadWriteData(csvImportFn);
    industriesTable.grantReadWriteData(subIndustryManagementFn);
    subIndustriesTable.grantReadWriteData(subIndustryManagementFn);
    useCasesTable.grantReadWriteData(subIndustryManagementFn);
    companiesTable.grantReadWriteData(subIndustryManagementFn);
    solutionsTable.grantReadWriteData(solutionManagementFn);
    customerCasesTable.grantReadWriteData(solutionManagementFn);
    // Solution management needs to read industries, sub-industries, use cases, and mappings for specialist filtering
    industriesTable.grantReadData(solutionManagementFn);
    subIndustriesTable.grantReadData(solutionManagementFn);
    useCasesTable.grantReadData(solutionManagementFn);
    mappingTable.grantReadData(solutionManagementFn);
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
    newsTable.grantReadData(publicBrowsingFn);
    blogsTable.grantReadData(publicBrowsingFn);
    accountsTable.grantReadData(publicBrowsingFn);
    usersTable.grantReadWriteData(userManagementFn);
    newsTable.grantReadWriteData(newsManagementFn);
    newsFeedsTable.grantReadWriteData(newsManagementFn);
    industriesTable.grantReadData(newsManagementFn);
    accountsTable.grantReadData(newsManagementFn);
    blogsTable.grantReadWriteData(blogsManagementFn);
    industriesTable.grantReadData(blogsManagementFn);
    useCasesTable.grantReadData(blogsManagementFn);
    accountsTable.grantReadData(blogsManagementFn);
    accountsTable.grantReadWriteData(accountsManagementFn);

    // Copilot Agent permissions
    industriesTable.grantReadData(copilotAgentFn);
    subIndustriesTable.grantReadData(copilotAgentFn);
    copilotAgentFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel'],
      resources: ['*'],
    }));

    // News Agent Orchestrator permissions
    industriesTable.grantReadData(newsAgentOrchestratorFn);
    newsAgentOrchestratorFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['bedrock:InvokeAgent'],
      resources: [
        newsAgent.attrAgentArn,
        `${newsAgent.attrAgentArn}/*`, // Allow access to all agent aliases
      ],
    }));

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
          apigatewayv2.CorsHttpMethod.PATCH,
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

    // Specialist routes - News Management
    addRoute('/specialist/news', apigatewayv2.HttpMethod.GET, newsManagementFn);
    addRoute('/specialist/news', apigatewayv2.HttpMethod.POST, newsManagementFn);
    addRoute('/specialist/news/{id}', apigatewayv2.HttpMethod.PUT, newsManagementFn);
    addRoute('/specialist/news/{id}', apigatewayv2.HttpMethod.DELETE, newsManagementFn);

    // Specialist routes - News Feeds Management
    addRoute('/specialist/news-feeds', apigatewayv2.HttpMethod.GET, newsManagementFn);
    addRoute('/specialist/news-feeds', apigatewayv2.HttpMethod.POST, newsManagementFn);
    addRoute('/specialist/news-feeds/{id}', apigatewayv2.HttpMethod.DELETE, newsManagementFn);

    // Specialist routes - Blogs Management
    addRoute('/specialist/blogs', apigatewayv2.HttpMethod.GET, blogsManagementFn);
    addRoute('/specialist/blogs', apigatewayv2.HttpMethod.POST, blogsManagementFn);
    addRoute('/specialist/blogs/{id}', apigatewayv2.HttpMethod.PUT, blogsManagementFn);
    addRoute('/specialist/blogs/{id}', apigatewayv2.HttpMethod.DELETE, blogsManagementFn);

    // Public routes
    addRoute('/public/industries', apigatewayv2.HttpMethod.GET, publicBrowsingFn);
    addRoute('/public/industries/{id}', apigatewayv2.HttpMethod.GET, publicBrowsingFn);
    addRoute('/public/industries/{id}/sub-industries', apigatewayv2.HttpMethod.GET, publicBrowsingFn);
    addRoute('/public/industries/{id}/news', apigatewayv2.HttpMethod.GET, publicBrowsingFn);
    addRoute('/public/industries/{id}/blogs', apigatewayv2.HttpMethod.GET, publicBrowsingFn);
    addRoute('/public/news/{id}', apigatewayv2.HttpMethod.GET, publicBrowsingFn);
    addRoute('/public/blogs/{id}', apigatewayv2.HttpMethod.GET, publicBrowsingFn);
    addRoute('/public/sub-industries/{id}/use-cases', apigatewayv2.HttpMethod.GET, publicBrowsingFn);
    addRoute('/public/use-cases/{id}', apigatewayv2.HttpMethod.GET, publicBrowsingFn);
    addRoute('/public/use-cases/{id}/solutions', apigatewayv2.HttpMethod.GET, publicBrowsingFn);
    addRoute('/public/use-cases/{id}/blogs', apigatewayv2.HttpMethod.GET, publicBrowsingFn);
    addRoute('/public/use-cases/{id}/customer-cases', apigatewayv2.HttpMethod.GET, publicBrowsingFn);
    addRoute('/public/solutions/{id}', apigatewayv2.HttpMethod.GET, publicBrowsingFn);
    addRoute('/public/solutions/{id}/detail-markdown', apigatewayv2.HttpMethod.GET, publicBrowsingFn);
    addRoute('/public/solutions/{id}/customer-cases', apigatewayv2.HttpMethod.GET, publicBrowsingFn);
    addRoute('/public/documents/{id}/download', apigatewayv2.HttpMethod.GET, documentDownloadFn);

    // Admin routes - News Management
    addRoute('/admin/news', apigatewayv2.HttpMethod.GET, newsManagementFn);
    addRoute('/admin/news', apigatewayv2.HttpMethod.POST, newsManagementFn);
    addRoute('/admin/news/{id}', apigatewayv2.HttpMethod.PUT, newsManagementFn);
    addRoute('/admin/news/{id}', apigatewayv2.HttpMethod.DELETE, newsManagementFn);

    // Admin routes - News Feeds Management
    addRoute('/admin/news-feeds', apigatewayv2.HttpMethod.GET, newsManagementFn);
    addRoute('/admin/news-feeds', apigatewayv2.HttpMethod.POST, newsManagementFn);
    addRoute('/admin/news-feeds/{id}', apigatewayv2.HttpMethod.DELETE, newsManagementFn);

    // Admin routes - Blogs Management
    addRoute('/admin/blogs', apigatewayv2.HttpMethod.GET, blogsManagementFn);
    addRoute('/admin/blogs', apigatewayv2.HttpMethod.POST, blogsManagementFn);
    addRoute('/admin/blogs/{id}', apigatewayv2.HttpMethod.PUT, blogsManagementFn);
    addRoute('/admin/blogs/{id}', apigatewayv2.HttpMethod.DELETE, blogsManagementFn);

    // Admin routes - Accounts Management
    addRoute('/admin/accounts', apigatewayv2.HttpMethod.GET, accountsManagementFn);
    addRoute('/admin/accounts', apigatewayv2.HttpMethod.POST, accountsManagementFn);
    addRoute('/admin/accounts/{id}', apigatewayv2.HttpMethod.PUT, accountsManagementFn);
    addRoute('/admin/accounts/{id}', apigatewayv2.HttpMethod.DELETE, accountsManagementFn);

    // Specialist routes - Accounts (read and create for customer case management)
    addRoute('/specialist/accounts', apigatewayv2.HttpMethod.GET, accountsManagementFn);
    addRoute('/specialist/accounts', apigatewayv2.HttpMethod.POST, accountsManagementFn);

    // Copilot Agent route
    addRoute('/public/copilot/chat', apigatewayv2.HttpMethod.POST, copilotAgentFn);

    // News Agent route
    addRoute('/admin/news-agent/search', apigatewayv2.HttpMethod.POST, newsAgentOrchestratorFn);
    addRoute('/specialist/news-agent/search', apigatewayv2.HttpMethod.POST, newsAgentOrchestratorFn);

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
      customRules: [
        {
          source: '</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>',
          target: '/index.html',
          status: '200',
        },
        {
          source: '/<*>',
          target: '/index.html',
          status: '404-200',
        },
      ],
      environmentVariables: [
        { name: 'VITE_AWS_REGION', value: this.region },
        { name: 'VITE_USER_POOL_ID', value: userPool.userPoolId },
        { name: 'VITE_USER_POOL_CLIENT_ID', value: userPoolClient.userPoolClientId },
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

    // new cdk.CfnOutput(this, 'IdentityPoolId', {
    //   value: identityPool.ref,
    //   description: 'Cognito Identity Pool ID',
    // });

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
