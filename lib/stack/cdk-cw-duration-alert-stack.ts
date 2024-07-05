import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Lambda } from "../construct/lambda";
import { CloudWatch } from "../construct/cloudwatch";

export class CdkCwDurationAlertStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const lambda = new Lambda(this, "lambdaFunctions");

    new CloudWatch(this, "CloudWatch", lambda.functions);
  }
}
