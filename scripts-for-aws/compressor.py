import sys
import boto3
import io
from PIL import Image

# Initialize S3 client
s3 = boto3.client('s3')

def compress_image(image_bytes, target_bytes):
    img = Image.open(io.BytesIO(image_bytes))
    
    # Convert PNGs/RGBA to RGB so we can save them as JPEG
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")
        
    low, high = 1, 95
    best_data = None
    
    # Binary search to find the best quality that fits under the target file size
    while low <= high:
        mid = (low + high) // 2
        out_io = io.BytesIO()
        img.save(out_io, format='JPEG', quality=mid)
        size = len(out_io.getvalue())
        
        if size <= target_bytes:
            best_data = out_io.getvalue()
            low = mid + 1  # Try to push the quality a bit higher
        else:
            high = mid - 1 # File is too big, lower the quality
            
    # If even quality=1 is too big, just return the lowest possible quality
    if best_data is None:
        out_io = io.BytesIO()
        img.save(out_io, format='JPEG', quality=1)
        best_data = out_io.getvalue()
        
    return best_data

if __name__ == "__main__":
    # Lambda passes these three arguments via AWS SSM
    bucket = sys.argv[1]
    input_key = sys.argv[2]
    target_bytes = int(sys.argv[3])
    
    filename = input_key.split('/')[-1]
    print(f"Processing {filename} to {target_bytes} bytes...")

    # 1. Download the original image from S3
    file_obj = s3.get_object(Bucket=bucket, Key=input_key)
    image_bytes = file_obj['Body'].read()

    # 2. Compress the image using the binary search algorithm
    compressed_bytes = compress_image(image_bytes, target_bytes)

    # 3. Upload the compressed version to the output/ folder
    # We change the extension to .jpg since Pillow saves it as a JPEG
    new_filename = filename.rsplit('.', 1)[0] + '.jpg'
    output_key = f"output/{new_filename}"
    
    s3.put_object(Bucket=bucket, Key=output_key, Body=compressed_bytes, ContentType='image/jpeg')

    # Note: We intentionally removed the s3.delete_object() line here 
    # so your original file stays safely backed up in the input/ folder!
    
    print(f"Done! Saved compressed image as {output_key}")