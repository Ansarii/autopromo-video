# Security Policy

## Supported Versions

Currently, we support the following versions of AutoPromo Video:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of AutoPromo Video seriously. If you believe you have found a security vulnerability, please report it to us as soon as possible.

**Please do not report security vulnerabilities via public GitHub issues.**

Instead, please follow these steps:

1. Send an email to [INSERT SECURITY EMAIL ADDRESS] with details of the vulnerability.
2. Include a description of the issue, steps to reproduce it, and the potential impact.
3. We will acknowledge receipt of your report within 48 hours and provide a timeline for a fix.

## Security Best Practices

When deploying AutoPromo Video, we recommend the following security measures:

- **Environment Variables**: Never commit your `.env` file to version control.
- **Rate Limiting**: Use the built-in rate limiting to prevent abuse.
- **Sanitization**: Ensure all input URLs and parameters are validated (handled by the core logic, but verify custom integrations).
- **Private Buckets**: Ensure your Cloudflare R2 or AWS S3 buckets are configured with appropriate access controls.
- **Dependency Updates**: Keep your dependencies up to date by regularly running `npm update`.
