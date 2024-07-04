#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { CdkCwDurationAlertStack } from "../lib/cdk-cw-duration-alert-stack";

const app = new cdk.App();
new CdkCwDurationAlertStack(app, "CdkCwDurationAlertStack", {});
