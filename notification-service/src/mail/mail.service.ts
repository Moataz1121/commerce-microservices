import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST', 'sandbox.smtp.mailtrap.io'),
      port: this.configService.get<number>('MAIL_PORT', 2525),
      auth: {
        user: this.configService.get<string>('MAIL_USERNAME'),
        pass: this.configService.get<string>('MAIL_PASSWORD'),
      },
    });
  }

  /**
   * Render template and send email.
   *
   * @returns providerMessageId
   */
  async sendMail(
    to: string,
    subject: string,
    templateName: string,
    context: Record<string, string>,
  ): Promise<string> {
    const templateContent = this.loadTemplate(templateName, context);

    const fromAddress = this.configService.get<string>('MAIL_FROM_ADDRESS', 'noreply@example.com');
    const fromName = this.configService.get<string>('MAIL_FROM_NAME', 'Commerce Microservices');

    const info = await this.transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to,
      subject,
      html: templateContent,
    });

    this.logger.log(`Email sent to ${to} via Mailtrap (MessageId: ${info.messageId})`);
    return info.messageId;
  }

  /**
   * Helper method for sending welcome email.
   */
  async sendWelcomeEmail(to: string, name: string): Promise<string> {
    return this.sendMail(
      to,
      'Welcome to our platform!',
      'welcome',
      { name },
    );
  }

  private loadTemplate(templateName: string, context: Record<string, string>): string {
    // Look for template in dist or src
    const pathsToTry = [
      path.join(__dirname, 'templates', `${templateName}.html`),
      path.join(process.cwd(), 'src', 'mail', 'templates', `${templateName}.html`),
      path.join(process.cwd(), 'dist', 'mail', 'templates', `${templateName}.html`),
    ];

    let templatePath = '';
    for (const p of pathsToTry) {
      if (fs.existsSync(p)) {
        templatePath = p;
        break;
      }
    }

    if (!templatePath) {
      throw new Error(`Email template "${templateName}" not found in paths: ${pathsToTry.join(', ')}`);
    }

    let content = fs.readFileSync(templatePath, 'utf-8');

    for (const [key, value] of Object.entries(context)) {
      content = content.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), value);
    }

    return content;
  }
}
