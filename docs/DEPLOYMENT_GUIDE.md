""# SintraPrime Autonomous Agent - Deployment Guide

This guide provides instructions for deploying the SintraPrime Autonomous Agent to a production environment.

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v20 or later)
- npm (v10 or later)
- Git
- Docker (optional, for containerized deployment)
- A cloud provider account (e.g., AWS, Google Cloud, Azure, Render)

## Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/ihoward40/SintraPrime.git
    cd SintraPrime
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

## Configuration

1.  **Create a `.env` file:**

    Copy the `.env.example` file to a new file named `.env`:

    ```bash
    cp .env.example .env
    ```

2.  **Configure environment variables:**

    Open the `.env` file and fill in the required environment variables, such as:

    - `SINTRAPRIME_ENCRYPTION_KEY`: A 64-character hex string for encrypting secrets.
    - `SHOPIFY_SHOP`: Your Shopify store URL (e.g., `mystore.myshopify.com`).
    - `SHOPIFY_ACCESS_TOKEN`: Your Shopify Admin API access token.
    - `META_ADS_ACCESS_TOKEN`: Your Meta Marketing API access token.
    - `META_ADS_AD_ACCOUNT_ID`: Your Meta Ads account ID (e.g., `act_123456789`).
    - `GOOGLE_DRIVE_ACCESS_TOKEN`: Your Google Drive API access token.
    - `GMAIL_ACCESS_TOKEN`: Your Gmail API access token.

    You can also configure other settings, such as the AI provider and model, the database connection string, and the logging level.

## Running the Application

### Development Mode

To run the application in development mode, use the following command:

```bash
npm run dev
```

This will start the application with hot-reloading, so any changes you make to the code will be automatically applied.

### Production Mode

To run the application in production mode, first build the code:

```bash
npm run build
```

Then, start the application:

```bash
npm start
```

## Deployment

### Docker Deployment

To deploy the application using Docker, you can use the provided `Dockerfile`.

1.  **Build the Docker image:**

    ```bash
    docker build -t sintraprime .
    ```

2.  **Run the Docker container:**

    ```bash
    docker run -p 3000:3000 --env-file .env sintraprime
    ```

    This will start the application in a Docker container and expose it on port 3000.

### Cloud Deployment (Render.com Example)

You can deploy the application to a cloud provider like Render.com.

1.  **Create a new Web Service on Render.**

2.  **Connect your GitHub repository.**

3.  **Configure the build and start commands:**

    - **Build Command:** `npm install && npm run build`
    - **Start Command:** `npm start`

4.  **Add your environment variables** in the Render dashboard.

5.  **Deploy the service.**

Render will automatically build and deploy your application. You can then access it at the provided URL.

## Monitoring and Maintenance

### Logging

The application uses a structured logging format. You can view the logs in the console or in a log management service like Datadog or Logz.io.

### Monitoring

It is recommended to set up monitoring for the application to track its health and performance. Key metrics to monitor include:

- CPU and memory usage
- API response times
- Job queue length
- Error rates

### Backups

Regularly back up the following data:

- The `runs` directory, which contains the audit trail of all actions taken by the system.
- The database, which stores job state, scheduled jobs, and other application data.
- The secrets vault, if you are using a local encryption key.

### Updates

To update the application, pull the latest changes from the Git repository and redeploy.

```bash
git pull
npm install
npm run build
# Restart the application
```
""
