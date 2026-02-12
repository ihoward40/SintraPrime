# SintraPrime Autonomous Agent - User Guide

Welcome to the SintraPrime Autonomous Agent! This guide will walk you through the process of using the system to automate your tasks and workflows.

## Getting Started

To get started, you can interact with the system through the web UI, CLI, or API.

### Web UI

The web UI provides a user-friendly interface for submitting tasks, monitoring progress, and approving actions. To access the UI, navigate to the provided URL in your web browser.

### Command-Line Interface (CLI)

The CLI allows you to interact with the system from your terminal. You can use it to:

- Submit new tasks
- Check the status of jobs
- View reports
- Approve or reject pending actions

To use the CLI, run the following command:

```bash
npm run dev -- "/your-command"
```

For example, to submit a new task:

```bash
npm run dev -- "/task submit --prompt \"Research the latest trends in AI for e-commerce\""
```

### API

The API allows you to integrate SintraPrime with your own applications and workflows. You can use it to programmatically submit tasks, retrieve results, and manage jobs.

Refer to the API documentation for detailed information on endpoints and usage.

## Submitting Tasks

To submit a task, provide a clear and concise prompt describing what you want to achieve. The more specific you are, the better the agent will be able to understand and execute your request.

**Good prompt:**

> "Analyze our Shopify sales data for the last 30 days, identify the top 5 best-selling products, and generate a report with a bar chart visualizing the sales of each product."

**Bad prompt:**

> "Look at our sales."

## Approving Actions

For security and governance, certain actions require your approval before they can be executed. These include:

- Spending money (e.g., launching ad campaigns, purchasing services)
- Making changes to your accounts (e.g., updating Shopify settings, modifying ad campaigns)
- Sending emails to external contacts
- Performing destructive actions (e.g., deleting files, canceling orders)

When an action requires your approval, the job will be paused, and you will be notified through the web UI, email, or Slack. You can then review the proposed action and either approve or reject it.

## Viewing Reports

The system automatically generates daily reports that provide an overview of its activities, including:

- The number of jobs executed
- The success rate of jobs
- The total amount of money spent
- Key performance indicators (KPIs)
- Alerts for any issues or anomalies

Reports can be delivered to you via email, Slack, or the web UI. You can also download them in various formats, including PDF, CSV, and Markdown.

## Human-in-the-Loop

In some cases, the agent may encounter a situation that it cannot handle on its own, such as:

- Solving a CAPTCHA
- Providing a two-factor authentication (2FA) code
- Making a decision that requires human judgment

When this happens, the job will be paused, and you will be prompted to provide the necessary input. Once you have provided the required information, the job will resume from where it left off.

## Best Practices

- **Be specific in your prompts:** The more detail you provide, the better the agent will be able to understand and execute your request.
- **Set clear constraints:** If you have any constraints, such as a budget or a deadline, be sure to include them in your prompt.
- **Monitor job progress:** Keep an eye on the progress of your jobs through the web UI or CLI. This will allow you to catch any issues early on.
- **Review reports regularly:** The daily reports provide valuable insights into the agent's activities and can help you identify areas for improvement.
- **Provide feedback:** If you encounter any issues or have any suggestions for improvement, please provide feedback to the development team. This will help us make the system better for everyone.
