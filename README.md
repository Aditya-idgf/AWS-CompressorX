# 🚀 CompressX – Event-Driven Cloud Image Compression

CompressX is a **highly scalable, fully decoupled cloud application** that compresses images to exact target file sizes using a **custom binary-search quality algorithm**. Built entirely on **AWS**, the system leverages an **event-driven architecture** so that the web server remains fast and responsive while a dedicated worker node handles the computationally intensive image compression tasks in the background.

---

# ✨ Features

### Target-Size Compression

Users can specify an **exact maximum file size** (e.g., 100KB, 500KB, 2MB).
The backend dynamically adjusts image quality to fit within the requested size.

### Event-Driven Processing

Uploading an image to **Amazon S3** automatically triggers an **AWS Lambda function**, which dispatches the compression job to the worker node.

### Decoupled Architecture

The **web frontend** and the **image processing worker** run on separate **EC2 instances**, ensuring the web server remains responsive even during heavy compute workloads.

### Secure Delivery

Compressed images are delivered using **time-limited pre-signed S3 URLs**, ensuring secure and seamless downloads.

### Responsive UI

A **modern interface built with Tailwind CSS**, optimized for both desktop and mobile devices.

---

# 🛠️ Tech Stack

## Frontend

* HTML5
* Vanilla JavaScript
* Tailwind CSS

## Web Server

* Python
* Flask
* Waitress / Gunicorn
* Ubuntu (EC2)

## Worker Node

* Python
* Pillow (PIL)
* Ubuntu (EC2)

## Cloud Infrastructure (AWS)

### Amazon S3

Object storage used for:

* `input/` folder → uploaded images
* `output/` folder → compressed images

### AWS Lambda

Triggers background processing when a new object is created in the `input/` folder.

### AWS Systems Manager (SSM)

Securely executes remote shell commands on the **Worker EC2 instance** from the Lambda function.

### Amazon EC2

Two separate instances:

* **Web Server Instance**
* **Worker Processing Instance**

### AWS IAM

Implements **least-privilege role-based access control** for all services.

---

# 🏗️ Architecture Flow

1. **Upload**

   * User uploads an image through the **Flask web interface**.

2. **Storage**

   * The web server generates a **UUID** and uploads the image to the **S3 `input/` folder**.

3. **Trigger**

   * An **S3 PutObject event** triggers the **AWS Lambda function**.

4. **Dispatch**

   * Lambda extracts the requested file size from the filename and uses **AWS SSM** to run a remote command on the **Worker EC2 instance**.

5. **Compute**

   * The worker instance:

     * Downloads the image from S3
     * Runs the compression algorithm using **Pillow**
     * Uploads the compressed file to **S3 `output/`**

6. **Delivery**

   * The web server polls the **output folder**.
   * Once the compressed file appears:

     * A **pre-signed S3 URL** is generated
     * The client automatically downloads the compressed image.

---

# ⚙️ The Compression Algorithm

Traditional compression tools rely on a **static quality percentage**, which often produces inconsistent file sizes.

CompressX instead uses a **Binary Search Algorithm** to determine the **optimal JPEG quality level (1–95)**.

The algorithm:

1. Defines a search range for JPEG quality.
2. Compresses the image using the midpoint quality.
3. Measures the resulting file size.
4. Adjusts the search range depending on whether the result is above or below the target size.
5. Repeats until the **largest possible quality value that fits under the target size** is found.

This guarantees the **highest possible visual fidelity** for the requested file size.

---

# 🚀 Setup & Deployment

## 1. AWS IAM Requirements

Ensure appropriate roles and permissions:

### Web EC2

* `AmazonS3FullAccess`

### Worker EC2

* `AmazonS3FullAccess`
* `AmazonSSMManagedInstanceCore`

### Lambda Function

* `AWSLambdaBasicExecutionRole`
* Inline policy allowing:

  * `ssm:SendCommand`

---

## 2. S3 Configuration

Create a bucket and two folders:

```
input/
output/
```

Configure **Event Notifications**:

* Trigger: `ObjectCreated`
* Prefix: `input/`
* Destination: **AWS Lambda**

---

## 3. Worker Node Setup (`compressor.py`)

Install dependencies:

```bash
sudo apt update
sudo apt install python3-pip

pip3 install boto3 pillow
```

The worker script is executed remotely via **AWS Systems Manager (SSM)** and receives the following parameters:

* `Bucket`
* `Key`
* `TargetBytes`

---

## 4. Web Server Setup (`app.py`)

Install dependencies:

```bash
sudo apt update
sudo apt install python3-pip

pip3 install flask boto3
```

Run the application:

```bash
python3 app.py
```

Ensure **port 5000** is open in the EC2 **Security Group**.

---

# 🔮 Future Enhancements

### Custom Domain

Use **AWS Route 53** to map a custom domain to the application.

### HTTPS Security

Secure the web server with **SSL/TLS** using:

* Let's Encrypt
* AWS Certificate Manager

### Automated Cleanup

Configure **S3 Lifecycle Rules** to automatically delete original images after **24 hours**.

---

# 📌 Project Summary

CompressX demonstrates how **event-driven cloud architecture** can be used to build scalable backend systems. By combining **AWS S3, Lambda, EC2, and Systems Manager**, the application achieves:

* High scalability
* Fault-tolerant processing
* Secure file delivery
* Efficient compute offloading

The architecture ensures that heavy image processing workloads never affect the responsiveness of the web application.
