import boto3
import re
import urllib.parse

ssm = boto3.client('ssm')

# Replace this with your actual Ubuntu EC2 Instance ID
INSTANCE_ID = 'i-0be3fcbf37cb4eef1' 

def lambda_handler(event, context):
    # Get the bucket and file name from the S3 event
    bucket = event['Records'][0]['s3']['bucket']['name']
    key = urllib.parse.unquote_plus(event['Records'][0]['s3']['object']['key'])
    
    # Extract the target size from the filename
    filename = key.split('/')[-1]
    match = re.search(r'_(\d+)(KB|MB)\.', filename, re.IGNORECASE)
    
    if not match:
        print(f"Skipping {filename} - No valid size parameter found.")
        return {'statusCode': 400, 'body': 'No size parameter'}
        
    size = int(match.group(1))
    unit = match.group(2).upper()
    target_bytes = size * 1024 if unit == 'KB' else size * 1024 * 1024

    # The exact terminal command we want the EC2 instance to run
    command = f"python3 /home/ubuntu/compressor.py {bucket} {key} {target_bytes}"
    
    # Send the command to EC2 via SSM
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={'commands': [command]}
    )
    
    print(f"Command sent to EC2: {command}")
    return {'statusCode': 200, 'body': 'Command dispatched to EC2'}