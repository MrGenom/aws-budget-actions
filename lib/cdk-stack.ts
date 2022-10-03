import { Construct } from 'constructs';
import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import * as budget from 'aws_budget_notifier'
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Chain, StateMachine, Succeed } from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';

// Enter your email address if you would like to be notified of budget changes by email:
const myEmailAddress = ''

export class OverBudgetAutomation extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const actionLambdaRolePolicyStatement = new PolicyStatement({
      actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
      resources: ["*"]
    });

    const actionLambdaRole = new iam.Role(this, 'ActionLambdaRole', {
      roleName: this.stackName + "_actionLambdaRole",
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    actionLambdaRole.addToPolicy(actionLambdaRolePolicyStatement);

    const actionLambda = new lambda.NodejsFunction(this, 'ActionLambda', {
      entry: 'functions/action-lambda/handler.ts',
      handler: 'handler',
      role: actionLambdaRole,
      runtime: Runtime.NODEJS_14_X,
      functionName: this.stackName + "_actionLambda",
      logRetention: RetentionDays.ONE_DAY,
      timeout: Duration.seconds(25),
    });

    const actionLambdaTask = new LambdaInvoke(this, 'ActionLambdaTask', {
      lambdaFunction: actionLambda,
    });

    const success = new Succeed(this, 'Done!');

    const stepFunctionDefinition = Chain.start(actionLambdaTask)
      .next(success);

    const stateMachineRole = new iam.Role(this, 'StateMachineRole', {
      roleName: this.stackName + "_stateMachineRole",
      assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
    });

    const stateMachine = new StateMachine(this, 'StateMachine', {
      definition: stepFunctionDefinition,
      stateMachineName: this.stackName + "_stateMachine",
      role: stateMachineRole
    });

    const mainLambdaRolePolicyStatement = new PolicyStatement({
      actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
      resources: ["*"]
    });

    const mainLambdaRole = new iam.Role(this, 'MainLambdaRole', {
      roleName: this.stackName + "_mainLambdaRole",
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    mainLambdaRole.addToPolicy(mainLambdaRolePolicyStatement);

    const mainLambda = new lambda.NodejsFunction(this, 'MainLambda', {
      entry: 'functions/main-lambda/handler.ts',
      handler: 'handler',
      role: mainLambdaRole,
      runtime: Runtime.NODEJS_14_X,
      functionName: this.stackName + "_mainLambda",
      timeout: Duration.seconds(25),
      logRetention: RetentionDays.ONE_DAY,
      environment: {
        STATE_MACHINE_ARN: stateMachine.stateMachineArn
      }
    });

    const snsTopic = new sns.Topic(this, 'SnsTopic', {
      topicName: this.stackName + "_snsTopic"
    });

    if (typeof myEmailAddress != 'undefined' && myEmailAddress) {
      snsTopic.addSubscription(new subs.EmailSubscription(myEmailAddress));
    }
    snsTopic.addSubscription(new subs.LambdaSubscription(mainLambda));
    stateMachine.grantStartExecution(mainLambda);

    const customBudget = new budget.BudgetNotifier(this, 'CustomBudget', {
      limit: 2,
      threshold: 5,
      unit: "USD",
      timeUnit: budget.TimeUnit.MONTHLY,
      notificationType: budget.NotificationType.ACTUAL,
      topicArn: snsTopic.topicArn
    });

    snsTopic.grantPublish(new iam.ServicePrincipal('budgets.amazonaws.com'));
  }
}
