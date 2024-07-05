## はじめに

Lambda を利用するシステムを運用していると、タイムアウトしてしまうケースに遭遇しますよね。

例えば、最初のデータ量は少なかったのに、いつの間にか肥大化してタイムアウトしてしまう…。

こうしたケースは事前にメモリサイズの増量やタイムアウトの時間を伸ばす対応をしておきたいです。

しかし Lambda の数が多いと管理仕切れないことも多く、エラーが起きて初めて気づくこともありそうです。

そんなとき設定されたタイムアウトより前のアラートを設定しておき、タイムアウト前に気づくことができればと考え、CDK でまとめて設定するコードを書いてみました。

## 作成したコード

以下のリポジトリに保存しています。

https://github.com/jun-suzuki1028/cdk-lambda-duration-alerms

作成するリソースは後述しますが、ポイントを抜粋しているため詳細はリポジトリを確認してください。

### Lambda

Lambda 関数は例としてタイムアウトの時間変えたものを 3 つ作成します。

```typescript
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
```
このタイムアウトの時間を元に後程 CloudWatch Alerm を設定します。

最後に全ての Lambda 関数を取得しているところは単純にリストへ push してもよかったのですが、強制的に全 Lambda 関数を拾うために書いてます。可読性的には「ちょっとイマイチかも…」と思ったりしたので、設定したい Lambda と分けたい場合は修正してください。

### CloudWatch Alerm

先ほど定義した Lambda 関数のリストからアラームを設定していきます。

今回は Lambda 関数のタイムアウトを取得し、設定されている時間の 8 割以上時間がかかった場合はアラートをあげる CloudWatch Alerm を Lambda 関数分作成しています。

```typescript
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
```

これだけで後から Lambda を増やしても、自動でアラームを作成してくれます。1 つ 1 つリソースを定義しなくてもいいのが CDK のいいところですね。

## デプロイ

この CDK をデプロイして、設定された値を確認してみます。

リソースを確認すると Lambda3 つに対し、アラームも 3 つ作成されてますね。

![cdk-cw-duration-alert1](https://devio2024-media.developers.io/image/upload/v1720145585/2024/07/05/bf0p82rldq642e2l2wtp.png)

1 つ目の Lambda はタイムアウトを 120 秒で設定したので、アラームは 8 割の 96 秒が設定されていました。

![cdk-cw-duration-alert2](https://devio2024-media.developers.io/image/upload/v1720145585/2024/07/05/kkmswm31fiprtwwasvfc.png)

試しに以下のコードで Lambda を 110 秒待機するように設定し、アラーム状態になるか確認してみます。

```python
import json
import time

def handler(event, context):
    time.sleep(110)
    return {"statusCode": 200, "body": json.dumps("Hello from Lambda!")}
```

想定通り、110 秒実行したためタイムアウトに迫っているアラートが起こりました。

![cdk-cw-duration-alert3](https://devio2024-media.developers.io/image/upload/v1720145585/2024/07/05/yjbjnk8rol9ztu9admgb.png)

他デプロイした 2 つ 180 秒をタイムアウトに設定した CloudWatch アラームは 144 秒、240 秒を設定したアラームは 192 秒になっていました。問題なく Lambda のタイムアウトから計算されていますね。

![cdk-cw-duration-alert4](https://devio2024-media.developers.io/image/upload/v1720145585/2024/07/05/wypeiuazjuy1sdk3eopw.png)

![cdk-cw-duration-alert5](https://devio2024-media.developers.io/image/upload/v1720145585/2024/07/05/ehrpbsn93ingxfejuyrt.png)

無事少ないコード量で Lambda のタイムアウト前に発火するアラームの設定ができました。

##　まとめ
AWS CDK で Lambda 関数の実行時間監視を一括設定するコードを書いてみました。

Lambda を使ったシステム運用時にお役に立てば嬉しいです。

今回はアラームを設定するのが目的だったため触れていませんが、実装する場合は通知方法も検討しましょう。

https://dev.classmethod.jp/articles/aws-chatbot-custom-notification/
