import {
  aws_cloudwatch as cloudwatch,
  aws_lambda as lambda,
} from "aws-cdk-lib";
import { Construct } from "constructs";

export class CloudWatch extends Construct {
  constructor(
    scope: Construct,
    id: string,
    lambdaFunctions: lambda.Function[]
  ) {
    super(scope, id);
    // 各Lambda関数に対してアラームを作成
    lambdaFunctions.forEach((lambdaFunction) => {
      this.createDurationAlarm(lambdaFunction);
    });
  }
  private createDurationAlarm(lambdaFunction: lambda.Function) {
    const timeout = lambdaFunction.timeout?.toSeconds() ?? 3;
    const alarmThreshold = timeout * 0.8;

    new cloudwatch.Alarm(this, `${lambdaFunction.node.id}DurationAlarm`, {
      metric: lambdaFunction.metricDuration(),
      threshold: alarmThreshold,
      evaluationPeriods: 1,
      alarmDescription: `Alarm when ${lambdaFunction.node.id} duration exceeds ${alarmThreshold} seconds`,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
  }
}
