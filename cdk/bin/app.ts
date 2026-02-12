#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { IndustryPortalStack } from '../lib/industry-portal-stack';

const app = new cdk.App();

new IndustryPortalStack(app, 'IndustryPortalStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-2',
  },
  stackName: 'industry-portal',
});
