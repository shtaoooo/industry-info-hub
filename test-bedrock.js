const bedrock = require('aws-cdk-lib/aws-bedrock');
console.log('CfnAgent exists:', 'CfnAgent' in bedrock);
console.log('CfnAgentAlias exists:', 'CfnAgentAlias' in bedrock);
console.log('Agent-related exports:', Object.keys(bedrock).filter(k => k.includes('Agent')));
