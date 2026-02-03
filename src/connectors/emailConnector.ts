/**
 * Email Connector - Send and manage emails
 * 
 * Supports Gmail API and generic SMTP
 */

import { Connector } from '../types/index.js';

export interface EmailConfig {
  type: 'gmail' | 'smtp';
  // Gmail config
  accessToken?: string;
  // SMTP config
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  password?: string;
}

export class EmailConnector implements Connector {
  name = 'email';
  type = 'communication';
  
  private config: EmailConfig;
  private authenticated = false;

  constructor(config: EmailConfig) {
    this.config = config;
  }

  /**
   * Authenticate
   */
  async authenticate(): Promise<void> {
    if (this.config.type === 'gmail') {
      await this.authenticateGmail();
    } else {
      await this.authenticateSMTP();
    }
    this.authenticated = true;
  }

  /**
   * Authenticate with Gmail
   */
  private async authenticateGmail(): Promise<void> {
    try {
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Gmail authentication failed');
      }
    } catch (error) {
      throw new Error(`Gmail authentication failed: ${error}`);
    }
  }

  /**
   * Authenticate with SMTP (test connection)
   */
  private async authenticateSMTP(): Promise<void> {
    // In a real implementation, this would test the SMTP connection
    // For now, we'll just validate the config
    if (!this.config.host || !this.config.user || !this.config.password) {
      throw new Error('SMTP configuration incomplete');
    }
  }

  /**
   * Make an API call
   */
  async call(method: string, args: any): Promise<any> {
    if (!this.authenticated) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    if (method === 'send') {
      return this.sendEmail(args);
    } else if (method === 'list') {
      return this.listEmails(args);
    } else {
      throw new Error(`Unknown method: ${method}`);
    }
  }

  /**
   * Send an email
   */
  async sendEmail(email: {
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject: string;
    body: string;
    html?: string;
    attachments?: any[];
  }): Promise<any> {
    if (this.config.type === 'gmail') {
      return this.sendGmailEmail(email);
    } else {
      return this.sendSMTPEmail(email);
    }
  }

  /**
   * Send email via Gmail API
   */
  private async sendGmailEmail(email: any): Promise<any> {
    // Create the email message in RFC 2822 format
    const to = Array.isArray(email.to) ? email.to.join(',') : email.to;
    const message = [
      `To: ${to}`,
      email.cc ? `Cc: ${Array.isArray(email.cc) ? email.cc.join(',') : email.cc}` : '',
      `Subject: ${email.subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      email.html || email.body
    ].filter(Boolean).join('\n');

    // Encode the message in base64url format
    const encodedMessage = btoa(message).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw: encodedMessage })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to send email: ${JSON.stringify(error)}`);
    }

    return response.json();
  }

  /**
   * Send email via SMTP
   */
  private async sendSMTPEmail(email: any): Promise<any> {
    // Use Node.js built-in net module for SMTP
    const net = await import('node:net');
    const tls = await import('node:tls');
    
    return new Promise((resolve, reject) => {
      const host = this.config.host!;
      const port = this.config.port || 587;
      const secure = this.config.secure ?? (port === 465);
      
      // Create connection
      const socket = secure 
        ? tls.connect(port, host)
        : net.connect(port, host);

      let response = '';
      let step = 0;

      const to = Array.isArray(email.to) ? email.to.join(',') : email.to;
      const from = this.config.user!;

      socket.on('data', (data) => {
        response = data.toString();
        console.log('SMTP:', response);

        // SMTP conversation
        if (response.startsWith('220') && step === 0) {
          socket.write(`EHLO ${host}\r\n`);
          step = 1;
        } else if (response.startsWith('250') && step === 1) {
          socket.write('AUTH LOGIN\r\n');
          step = 2;
        } else if (response.startsWith('334') && step === 2) {
          socket.write(Buffer.from(this.config.user!).toString('base64') + '\r\n');
          step = 3;
        } else if (response.startsWith('334') && step === 3) {
          socket.write(Buffer.from(this.config.password!).toString('base64') + '\r\n');
          step = 4;
        } else if (response.startsWith('235') && step === 4) {
          socket.write(`MAIL FROM:<${from}>\r\n`);
          step = 5;
        } else if (response.startsWith('250') && step === 5) {
          socket.write(`RCPT TO:<${to}>\r\n`);
          step = 6;
        } else if (response.startsWith('250') && step === 6) {
          socket.write('DATA\r\n');
          step = 7;
        } else if (response.startsWith('354') && step === 7) {
          const message = [
            `From: ${from}`,
            `To: ${to}`,
            `Subject: ${email.subject}`,
            email.html ? 'Content-Type: text/html; charset=utf-8' : 'Content-Type: text/plain; charset=utf-8',
            '',
            email.html || email.body,
            '.'
          ].join('\r\n');
          
          socket.write(message + '\r\n');
          step = 8;
        } else if (response.startsWith('250') && step === 8) {
          socket.write('QUIT\r\n');
          socket.end();
          resolve({ success: true, messageId: response.split(' ')[1] });
        } else if (response.startsWith('5')) {
          reject(new Error(`SMTP error: ${response}`));
          socket.end();
        }
      });

      socket.on('error', (error) => {
        reject(new Error(`SMTP connection error: ${error.message}`));
      });

      socket.on('close', () => {
        if (step < 8) {
          reject(new Error('SMTP connection closed prematurely'));
        }
      });
    });
  }

  /**
   * List emails
   */
  async listEmails(options: {
    maxResults?: number;
    query?: string;
  } = {}): Promise<any> {
    if (this.config.type !== 'gmail') {
      throw new Error('List emails is only supported for Gmail');
    }

    const params = new URLSearchParams({
      maxResults: String(options.maxResults || 10)
    });

    if (options.query) {
      params.append('q', options.query);
    }

    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to list emails');
    }

    return response.json();
  }

  /**
   * Get email by ID
   */
  async getEmail(messageId: string): Promise<any> {
    if (this.config.type !== 'gmail') {
      throw new Error('Get email is only supported for Gmail');
    }

    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`, {
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get email');
    }

    return response.json();
  }
}
