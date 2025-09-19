// Email service using Nodemailer
// For production, you can integrate with SendGrid, Mailgun, or AWS SES

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialize();
  }

  async initialize() {
    // For development, we'll simulate email sending
    // In production, configure with actual SMTP settings
    console.log('Email service initialized (simulation mode)');
  }

  async sendEmail(to, subject, htmlContent, textContent = null) {
    try {
      // Simulate email sending for development
      console.log(`📧 Email sent to: ${to}`);
      console.log(`📧 Subject: ${subject}`);
      console.log(`📧 Content: ${textContent || htmlContent.substring(0, 100)}...`);
      
      // In production, replace with actual email sending:
      /*
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject,
        text: textContent,
        html: htmlContent,
      });
      return info;
      */
      
      return { success: true, messageId: 'simulated-' + Date.now() };
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  // Email templates
  getEmailTemplate(type, data) {
    const templates = {
      newTenant: {
        subject: `New Tenant Added - ${data.tenantName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">New Tenant Added</h2>
            <p>A new tenant has been added to your property:</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <strong>Name:</strong> ${data.tenantName}<br>
              <strong>Phone:</strong> ${data.phone}<br>
              <strong>Property:</strong> ${data.propertyName}<br>
              <strong>Room:</strong> ${data.roomNumber || 'Not assigned'}<br>
              <strong>Monthly Rent:</strong> ₹${data.monthlyRent}
            </div>
            <p>Please review the tenant details and ensure all documentation is complete.</p>
            <a href="${data.actionUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Tenant Details</a>
          </div>
        `,
        text: `New tenant added: ${data.tenantName} (${data.phone}) at ${data.propertyName}. Monthly rent: ₹${data.monthlyRent}`
      },

      paymentReceived: {
        subject: `Payment Received - ₹${data.amount}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #28a745;">Payment Received</h2>
            <p>A payment has been recorded:</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <strong>Amount:</strong> ₹${data.amount}<br>
              <strong>Type:</strong> ${data.type}<br>
              <strong>Tenant:</strong> ${data.tenantName}<br>
              <strong>Property:</strong> ${data.propertyName}<br>
              <strong>Date:</strong> ${new Date(data.date).toLocaleDateString()}
            </div>
            <a href="${data.actionUrl}" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Payment Details</a>
          </div>
        `,
        text: `Payment received: ₹${data.amount} (${data.type}) from ${data.tenantName} at ${data.propertyName}`
      },

      newComplaint: {
        subject: `New Complaint - ${data.category}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc3545;">New Complaint Submitted</h2>
            <p>A new complaint has been submitted and requires attention:</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <strong>Category:</strong> ${data.category}<br>
              <strong>Description:</strong> ${data.description}<br>
              <strong>Property:</strong> ${data.propertyName}<br>
              <strong>Submitted by:</strong> ${data.tenantName || 'Staff'}<br>
              <strong>Priority:</strong> <span style="color: ${data.priority === 'high' ? '#dc3545' : data.priority === 'medium' ? '#ffc107' : '#28a745'};">${data.priority}</span>
            </div>
            <p>Please review and assign this complaint for resolution.</p>
            <a href="${data.actionUrl}" style="background: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Complaint</a>
          </div>
        `,
        text: `New ${data.category} complaint: ${data.description} at ${data.propertyName}`
      },

      rentReminder: {
        subject: `Rent Due Reminder - ${data.tenantName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ffc107;">Rent Due Reminder</h2>
            <p>This is a reminder that rent payment is due:</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <strong>Tenant:</strong> ${data.tenantName}<br>
              <strong>Room:</strong> ${data.roomNumber}<br>
              <strong>Amount Due:</strong> ₹${data.amount}<br>
              <strong>Due Date:</strong> ${data.dueDate}<br>
              <strong>Days Overdue:</strong> ${data.daysOverdue}
            </div>
            <p>Please follow up with the tenant for payment collection.</p>
            <a href="${data.actionUrl}" style="background: #ffc107; color: black; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Tenant Details</a>
          </div>
        `,
        text: `Rent reminder: ${data.tenantName} owes ₹${data.amount}, ${data.daysOverdue} days overdue`
      },

      lowInventory: {
        subject: `Low Inventory Alert - ${data.itemName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ffc107;">Low Inventory Alert</h2>
            <p>An inventory item is running low and needs restocking:</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <strong>Item:</strong> ${data.itemName}<br>
              <strong>Current Stock:</strong> ${data.currentQuantity} ${data.unit}<br>
              <strong>Minimum Required:</strong> ${data.minQuantity} ${data.unit}<br>
              <strong>Property:</strong> ${data.propertyName}
            </div>
            <p>Please restock this item to avoid service disruptions.</p>
            <a href="${data.actionUrl}" style="background: #ffc107; color: black; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Inventory</a>
          </div>
        `,
        text: `Low inventory: ${data.itemName} - ${data.currentQuantity} ${data.unit} remaining (min: ${data.minQuantity})`
      }
    };

    return templates[type] || null;
  }

  async sendNotificationEmail(userEmail, notificationType, data) {
    try {
      const template = this.getEmailTemplate(notificationType, data);
      if (!template) {
        console.log(`No email template found for notification type: ${notificationType}`);
        return;
      }

      await this.sendEmail(userEmail, template.subject, template.html, template.text);
      return true;
    } catch (error) {
      console.error('Error sending notification email:', error);
      return false;
    }
  }

  // Bulk email sending
  async sendBulkEmails(recipients, subject, htmlContent, textContent = null) {
    try {
      const promises = recipients.map(email => 
        this.sendEmail(email, subject, htmlContent, textContent)
      );
      
      const results = await Promise.allSettled(promises);
      
      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.length - successful;
      
      console.log(`Bulk email results: ${successful} sent, ${failed} failed`);
      
      return { successful, failed };
    } catch (error) {
      console.error('Error sending bulk emails:', error);
      throw error;
    }
  }

  // Weekly/Monthly reports
  async sendReportEmail(userEmail, reportType, reportData) {
    try {
      const subject = `${reportType} Report - ${reportData.propertyName}`;
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
          <h2 style="color: #333;">${reportType} Report</h2>
          <p><strong>Property:</strong> ${reportData.propertyName}</p>
          <p><strong>Period:</strong> ${reportData.period}</p>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0;">
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center;">
              <h3 style="color: #007bff; margin: 0;">Total Revenue</h3>
              <p style="font-size: 24px; font-weight: bold; margin: 5px 0;">₹${reportData.totalRevenue}</p>
            </div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center;">
              <h3 style="color: #28a745; margin: 0;">Occupancy Rate</h3>
              <p style="font-size: 24px; font-weight: bold; margin: 5px 0;">${reportData.occupancyRate}%</p>
            </div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center;">
              <h3 style="color: #dc3545; margin: 0;">Pending Issues</h3>
              <p style="font-size: 24px; font-weight: bold; margin: 5px 0;">${reportData.pendingComplaints}</p>
            </div>
          </div>
          
          <p>For detailed analysis, please log into the system.</p>
          <a href="${reportData.dashboardUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Dashboard</a>
        </div>
      `;

      await this.sendEmail(userEmail, subject, html);
      return true;
    } catch (error) {
      console.error('Error sending report email:', error);
      return false;
    }
  }
}

export default new EmailService();
