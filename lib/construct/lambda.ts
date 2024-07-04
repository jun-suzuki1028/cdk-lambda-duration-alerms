import { aws_lambda as lambda, Duration } from "aws-cdk-lib";
import { Construct } from "constructs";

export class Lambda extends Construct {
  public readonly functions: lambda.Function[] = [];

  constructor(scope: Construct, id: string) {
    super(scope, id);

    new lambda.Function(this, "CwDurationAlertLambda1", {
      runtime: lambda.Runtime.PYTHON_3_10,
      handler: "index.handler",
      timeout: Duration.seconds(120),
      code: lambda.Code.fromAsset("src"),
    });

    new lambda.Function(this, "CwDurationAlertLambda2", {
      runtime: lambda.Runtime.PYTHON_3_10,
      handler: "index.handler",
      timeout: Duration.seconds(180),
      code: lambda.Code.fromAsset("src"),
    });

    new lambda.Function(this, "CwDurationAlertLambda3", {
      runtime: lambda.Runtime.PYTHON_3_10,
      handler: "index.handler",
      timeout: Duration.seconds(240),
      code: lambda.Code.fromAsset("src"),
    });

    // すべてのLambda関数を取得
    const lambdaFunctions = this.node
      .findAll()
      .filter(
        (child): child is lambda.Function => child instanceof lambda.Function
      );
    this.functions = lambdaFunctions;
  }
}
