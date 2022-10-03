import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import * as Cdk from '../lib/cdk-stack';

// Put your tests below:
test('Test_1', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new Cdk.OverBudgetAutomation(app, 'MyTestStack');
  // THEN

  const template = Template.fromStack(stack);
  
});
