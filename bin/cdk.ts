#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { OverBudgetAutomation } from '../lib/cdk-stack';

const app = new cdk.App();
new OverBudgetAutomation(app, 'OverBudgetAutomation');
