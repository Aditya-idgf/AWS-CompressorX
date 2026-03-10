from flask import Flask, request, jsonify, render_template
import boto3
from botocore.config import Config
import time
import uuid

app = Flask(__name__)

# Initializing S3 client with your specific region and the required V4 signature
s3 = boto3.client('s3', region_name='ap-south-1', config=Config(signature_version='s3v4'))
BUCKET = 'img-strg'

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400

    file = request.files['image']
    target_size = request.form.get('size', '500KB') # Default to 500KB

    # 1. Create a unique filename so multiple users don't overwrite each other
    ext = file.filename.split('.')[-1]
    unique_id = str(uuid.uuid4())[:8]
    input_filename = f"{unique_id}_{target_size}.{ext}"

    # 2. Upload to S3 input/ folder
    s3.upload_fileobj(file, BUCKET, f"input/{input_filename}")

    # 3. Wait for the background EC2 instance to process it
    # Note: The compression script always saves the output as .jpg!
    output_key = f"output/{unique_id}_{target_size}.jpg"

    max_retries = 30 # Check for 60 seconds max
    for _ in range(max_retries):
        try:
            # Check if the compressed file exists in the output folder yet
            s3.head_object(Bucket=BUCKET, Key=output_key)

            # File exists! Generate a secure download link
            # The ResponseContentDisposition forces the browser's "Save As" / download behavior
            url = s3.generate_presigned_url(
                ClientMethod='get_object',
                Params={
                    'Bucket': BUCKET, 
                    'Key': output_key,
                    'ResponseContentDisposition': f'attachment; filename="compressed_{target_size}.jpg"'
                },
                ExpiresIn=3600
            )
            return jsonify({'download_url': url})
        except:
            time.sleep(2) # Wait 2 seconds and check again

    return jsonify({'error': 'Timeout waiting for compression'}), 504

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)