# Integrations

The Integrations module connects ClientWave with your existing tools and services, creating a unified ecosystem that maximizes efficiency and minimizes data duplication. Seamlessly connect with the tools your business already uses.

## Core Integrations

### Calendar Systems
#### Google Calendar
- **Two-way Sync**: Events automatically sync in both directions
- **Availability Management**: Block out unavailable times
- **Time Zone Handling**: Automatic adjustment for different regions
- **Public Booking Time Zone Selector**: Visitors can switch display timezone on booking pages without changing host availability rules
- **Meeting Invites**: Send calendar invitations to clients
- **Conflict Prevention**: Avoid double-booking scenarios
- **OAuth Base URL**: Google Calendar OAuth callback and webhook URLs are currently hard-forced to `https://www.clientwave.app` (no localhost/env fallback) to avoid callback drift during production rollout.
- **Connected State UI**: When connected, Settings shows a Stripe-style emerald `Connected` badge with check icon, and the `Disconnect` action appears directly beneath that status indicator.
- **Booking Link Copy**: Scheduling public booking links include a one-click copy action, matching the embed snippet copy workflow.
- **Availability-Gated Share/Embed**: In Scheduling, the `Share & Embed` block appears below availability settings, is greyed out until at least one day is selected, and includes an accordion summary of chosen slots.

**Usage Example (Public Booking Timezone):**
- Open a public booking page and use the **Time zone** dropdown above the calendar.
- Pick a timezone such as `America/New_York`.
- Calendar availability remains based on the host schedule, while slot labels and selected date/time display in the chosen visitor timezone.
- Booking submission is still saved in UTC and synced to calendar integrations as normal.
- The booking panel shows **Meeting length** above slot options so visitors understand session duration before selecting a time.

#### Microsoft Outlook
- **Exchange Support**: Direct integration with Exchange servers
- **Shared Calendars**: Sync with team calendars
- **Meeting Requests**: Handle Outlook meeting workflows
- **Contact Sync**: Share contact information
- **Task Management**: Sync tasks and to-dos

#### Apple Calendar
- **iCloud Sync**: Seamless iCloud calendar integration
- **Device Sync**: Maintain consistency across Apple devices
- **Shared Calendars**: Collaborative calendar access
- **Reminders**: Sync with Apple's reminder system

### Financial Software
#### QuickBooks Online
- **Customer Sync**: Two-way customer information exchange
- **Invoice Transfer**: Send invoices directly to QuickBooks
- **Payment Tracking**: Sync payment information
- **Expense Import**: Bring in expense data
- **Tax Calculations**: Handle tax implications automatically

#### QuickBooks Desktop
- **Data Transfer**: Bridge cloud and desktop environments
- **Backup Sync**: Maintain backup of desktop data
- **Limited Real-Time Sync**: Periodic batch processing
- **Migration Support**: Pathway to cloud solutions

#### Xero
- **Real-Time Sync**: Instantaneous data exchange
- **Bank Feeds**: Direct bank account integration
- **Multi-Currency**: Support for international transactions
- **Payroll Integration**: Employee payment handling
- **Reporting**: Enhanced financial reporting

### Payment Processors
#### Stripe
- **Credit Card Processing**: Accept all major credit cards
- **ACH Transfers**: Bank-to-bank transfer support
- **Subscription Billing**: Recurring payment management
- **Dispute Handling**: Automated chargeback management
- **Fraud Protection**: Built-in fraud detection
- **Connect OAuth Safety**: Stripe Connect return URLs are constrained to in-app relative paths, and Connect token exchange supports `STRIPE_CONNECT_SECRET_KEY` with `STRIPE_SECRET_KEY` fallback.
- **Connect Modes**: The primary **Connect with Stripe** action uses Express onboarding via account links.
- **Alternative Setup Toggle**: A secondary **Alternative Setup** toggle appears under the primary button when not connected.
- **Standard Fallback**: Expanding **Alternative Setup** shows manual instructions and one branded **Start Standard Stripe Connect** button for existing Stripe account linking.
- **Return UX**: After Stripe onboarding redirects back, Business Settings auto-scrolls to the Stripe section for immediate verification and save.
- **Express Webhook UI**: For Express + platform-managed webhook mode, Business Settings shows a simplified “Managed by ClientWave platform” webhook status card instead of detailed manual diagnostics.
- **Stripe Fee Responsibility**: Business Settings includes a Stripe fee responsibility selector:
  - `Business absorbs Stripe fees`
  - `Client pays Stripe fees` (adds processing fee in checkout)
- **Webhook Handling**: Webhook setup is handled automatically by the connect flow; in Stripe configurations that block connected-account endpoints, the app falls back to platform-level webhook handling.
- **Connected Account Visibility**: Business Settings now shows the currently connected Stripe account ID (`acct_...`) in the Stripe connected status block.

#### PayPal
- **Digital Wallet**: Accept PayPal account payments
- **PayPal Credit**: Offer financing options
- **Mass Payments**: Bulk payment distribution
- **Currency Conversion**: International payment support
- **Seller Protection**: Fraud protection features

#### Square
- **In-Person Payments**: Point-of-sale integration
- **Card Reader Support**: Hardware integration
- **Inventory Tracking**: Product and inventory management
- **Receipt Management**: Digital receipt delivery
- **Employee Management**: Staff and commission tracking

## Communication Tools
### Email Platforms
#### Gmail
- **Email Sync**: Two-way email integration
- **Contact Management**: Shared contact lists
- **Calendar Integration**: Event and scheduling sync
- **Attachment Handling**: File sharing capabilities
- **Label Management**: Organize emails by ClientWave status

#### Outlook Email
- **Exchange Integration**: Direct server connection
- **Shared Mailboxes**: Team email access
- **Rules Integration**: Automated email processing
- **Contact Synchronization**: Unified contact management
- **Calendar Sync**: Meeting and appointment coordination

### SMS Services
#### Twilio
- **Programmatic Messaging**: Send/receive SMS programmatically
- **MMS Support**: Image and media message capabilities
- **International Coverage**: Global SMS delivery
- **Messaging Logs**: Complete message history
- **Opt-Out Management**: Compliance with messaging regulations

#### Plivo
- **Bulk Messaging**: High-volume SMS capabilities
- **Voice Integration**: Combine voice and SMS
- **Analytics**: Detailed messaging metrics
- **Webhook Support**: Real-time event notifications
- **Number Pooling**: Shared number resources

## Project Management
### Task and Workflow Tools
#### Trello
- **Card Sync**: Synchronize project cards
- **Board Integration**: Mirror ClientWave projects
- **Member Management**: Team collaboration features
- **Power-Ups**: Enhanced functionality extensions
- **Automation**: Trigger actions based on card changes

#### Asana
- **Project Mapping**: Align projects between platforms
- **Task Assignment**: Share task responsibilities
- **Timeline Integration**: Coordinate project schedules
- **Dependency Management**: Track task interdependencies
- **Reporting**: Cross-platform performance metrics

### Time Tracking
#### Toggl
- **Time Entry Sync**: Automatic time tracking
- **Project Billing**: Link tracked time to invoices
- **Team Management**: Track multiple team members
- **Reporting**: Detailed time analysis
- **Integration Triggers**: Start/stop based on ClientWave activities

## Marketing Automation
### Email Marketing Platforms
#### Mailchimp
- **Audience Sync**: Share contact lists
- **Campaign Integration**: Trigger campaigns from ClientWave
- **Segmentation**: Create targeted audiences
- **Analytics**: Track campaign performance
- **Automation**: Triggered email sequences

#### Constant Contact
- **Contact Management**: Maintain unified contact database
- **Event Promotion**: Promote appointments and events
- **Newsletter Integration**: Include ClientWave updates
- **List Segmentation**: Target specific client groups
- **Performance Tracking**: Monitor email engagement

## File Storage and Sharing
### Cloud Storage
#### Dropbox
- **File Sync**: Automatic document synchronization
- **Shared Folders**: Collaborative document access
- **Version Control**: Track document changes
- **Link Sharing**: Secure file sharing capabilities
- **Storage Quotas**: Manage space allocation

#### Google Drive
- **Document Integration**: Native Google Docs support
- **Sharing Permissions**: Control access levels
- **Collaboration**: Real-time document editing
- **Folder Structure**: Organize files by project
- **Sync Settings**: Configure automatic synchronization

#### OneDrive
- **Office Integration**: Seamless Office suite compatibility
- **File Sharing**: Enterprise-grade sharing features
- **Version History**: Maintain document revision history
- **Security Controls**: Advanced security and compliance
- **Sync Management**: Control synchronization behavior

## Setup Process

### Integration Configuration
1. **Access Settings**: Navigate to Integrations section
2. **Select Integration**: Choose desired integration
3. **Authenticate**: Provide necessary credentials
4. **Configure Settings**: Set up data mapping and sync rules
5. **Test Connection**: Verify integration functionality
6. **Activate**: Enable the integration

### Data Mapping
- **Field Mapping**: Align fields between systems
- **Sync Direction**: Configure one-way or two-way sync
- **Sync Frequency**: Set update intervals
- **Conflict Resolution**: Define how conflicts are handled
- **Data Validation**: Ensure data integrity

## Best Practices

### Security Considerations
- **OAuth Authentication**: Use secure authentication methods
- **API Key Management**: Safely store and rotate credentials
- **Data Encryption**: Ensure encrypted data transmission
- **Access Controls**: Limit integration permissions
- **Audit Trails**: Monitor integration activity

### Performance Optimization
- **Selective Sync**: Only sync necessary data
- **Batch Processing**: Optimize for large data volumes
- **Error Handling**: Implement retry mechanisms
- **Monitoring**: Track integration health
- **Rate Limiting**: Respect API rate limits

### Maintenance
- **Regular Testing**: Verify integration functionality
- **Update Compatibility**: Ensure compatibility with updates
- **Backup Procedures**: Maintain data safety
- **Documentation**: Keep integration documentation current
- **User Training**: Educate team on integration features

## Troubleshooting

### Common Issues
- **Authentication Problems**: Credential and permission errors
- **Sync Failures**: Data not transferring between systems
- **Rate Limiting**: API limits affecting performance
- **Data Conflicts**: Discrepancies between systems
- **Connection Timeouts**: Network-related issues
- **Stripe Connect loss-responsibility block**: If Stripe returns a notice to review connected-account loss responsibilities, complete that one-time setup at `https://dashboard.stripe.com/settings/connect/platform-profile`, then retry connecting.
- **Connected-account webhook restriction**: Some Stripe account/platform configurations block creating webhook endpoints directly on connected accounts. In that case, ClientWave falls back to platform Connect webhook handling and marks webhook mode/status accordingly.

## Support

For questions about integrations, consult our [FAQ](./faq.md) or contact support at [support@clientwave.app](mailto:support@clientwave.app).
