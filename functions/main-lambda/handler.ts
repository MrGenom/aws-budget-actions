import { StepFunctions } from 'aws-sdk';

export const handler = async function (event: any) {
    const STATE_MACHINE_ARN = process.env.STATE_MACHINE_ARN!;

    const params: StepFunctions.StartExecutionInput = {
        stateMachineArn: STATE_MACHINE_ARN,
    };

    const stepFn = new StepFunctions();
    const { executionArn, startDate } = await stepFn.startExecution(params).promise();

    return {
        statusCode: 200,
        body: JSON.stringify({
            executionArn,
            startDate,
        }),
    };
};