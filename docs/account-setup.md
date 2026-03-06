# Account Setup Guide

Setting up your ClientWave account is straightforward and can be completed in just a few minutes. This guide will walk you through each step to ensure your account is properly configured for maximum efficiency.

## Initial Registration

1. **Visit** [app.clientwave.app](https://app.clientwave.app) and click "Sign Up"
2. **Enter your email** and create a secure password
3. **Verify your email** by clicking the link sent to your inbox
4. **Complete the onboarding survey** to help us customize your experience

## Company Profile Setup

### Basic Information
- **Company Name**: Enter your business name exactly as it should appear on documents
- **Legal Entity**: Specify if you're a sole proprietorship, LLC, corporation, etc.
- **Tax ID**: Add your EIN or SSN for tax purposes
- **Business Description**: Brief description of your services

### Company Name Source Of Truth
- **Workspace accounts**: `Company.name` is the canonical business name.
- **Personal accounts (no workspace yet)**: `User.companyName` is used as a fallback label.
- **Expected behavior**: Once a user is attached to a company, UI and outbound messages should prefer the company record.

**Usage Example**
```ts
const companyName = user.company?.name || user.companyName || 'ClientWave';
```

### Contact Information
- **Primary Phone**: The main number clients should use to reach you
- **Email**: Professional email address for client communication
- **Address**: Physical business address (this will appear on invoices)
- **Service Areas**: Define your primary service regions

### Branding Elements
- **Logo Upload**: Upload a high-resolution version of your logo (PNG, JPG, or SVG)
- **Colors**: Define your brand colors that will be used throughout the platform
- **Tagline**: Your company's slogan or value proposition
- **Header Wordmark**: ClientWave brand text is shown as connected single-line text (`ClientWave`) with slightly larger sizing for clearer mobile and PWA headers
- **Link Preview Metadata**: Social/text preview title, description, and image are configured in `src/app/layout.tsx` using Open Graph and Twitter metadata

## User Profile Configuration

### Personal Information
- **Full Name**: Your name as it should appear to clients
- **Title**: Your role (Owner, Project Manager, etc.)
- **Photo**: Professional headshot for client-facing communications
- **Bio**: Brief professional background information

### Permissions & Roles
- **Admin Rights**: Determine what administrative functions you have
- **Team Members**: Add and configure access for other team members
- **Notification Preferences**: Set up how and when you receive alerts

### Invite Onboarding Behavior
- If an invited user has no `companyName`, onboarding now prefills the profile name from the invited `name`.
- Profile fields (including phone) are synced from latest saved values when the page refreshes.

**Usage Example**
```ts
const displayName = user.companyName?.trim() || user.name?.trim() || '';
```

### Business Settings Access Rules
- The **Business** tab is available only to `OWNER`, `ADMIN`, or `SUPERADMIN`.
- Standard `USER` roles should manage personal profile fields in **Profile** and cannot save company-level business settings.
- A `401/403` while saving company phone/settings indicates role or session authorization, not a phone-format issue.

## Service Categories Setup

Define the types of services you offer:
1. **Service Groups**: Organize services into logical categories
2. **Standard Pricing**: Set baseline rates for common services
3. **Custom Fields**: Add specific details that apply to your industry

## Integration Connections

### Calendar Integration
- Connect your preferred calendar system (Google Calendar, Outlook)
- Set up automatic scheduling rules
- Configure availability settings

### Financial Integration
- Link your banking and payment accounts
- Configure payment processor details (Stripe and manual options)
- Configure tax settings and categories

### Communication Tools
- Set up SMS integration for direct client communication
- Configure email templates and signatures
- Establish notification preferences

## Verification and Compliance

- **License Information**: Upload copies of relevant licenses
- **Insurance Details**: Add insurance information for client confidence
- **Banking Information**: Verify bank accounts for payment processing
- **Tax Forms**: Complete necessary tax documentation

## Final Steps

1. **Review all information** for accuracy
2. **Test integrations** to ensure they're working properly
3. **Customize templates** with your branding and standard terms
4. **Set up your first client** to ensure everything is working

## Pro Upgrade Checkout

- The Pro upgrade flow is displayed as one continuous white section.
- Features and secure checkout are presented in the same container for visual consistency.
- The payment form is embedded into that section (no separate nested checkout card).

**Usage Example**
```tsx
<CheckoutForm
  amount={effectiveAmount}
  intentEndpoint="/api/payments/create-subscription-intent"
  saveCardContext="recurring"
  embedded
/>
```

## Support

If you encounter any issues during setup, contact our support team at [support@clientwave.app](mailto:support@clientwave.app) or use the in-app chat feature.
