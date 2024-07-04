import json
import time


def handler(event, context):
    time.sleep(110)
    return {"statusCode": 200, "body": json.dumps("Hello from Lambda!")}
