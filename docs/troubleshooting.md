# Troubleshooting

This guide provides solutions for common issues you may encounter while using ClientWave. Follow these steps to resolve problems quickly and efficiently.

For safe production release steps (pre-checks, canary rollout, rollback), use the [Canary Release Runbook](./release-canary.md).

## Authentication Issues

### Login Problems
**Symptom**: Unable to log in to your ClientWave account

**Solutions**:
1. **Check Credentials**: Verify your email and password are correct
2. **Password Reset**: Use the "Forgot Password" link to reset your password
3. **Account Status**: Ensure your account is not suspended or deactivated
4. **Browser Cache**: Clear your browser cache and cookies
5. **Try Different Browser**: Test login in an incognito/private window
6. **Two-Factor Authentication**: If enabled, ensure you're entering the correct code

### Registration Creates User But You Stay Logged Out
**Symptom**: Registration appears to create the user record, but the app still shows you as unauthenticated (same for login).

**Likely cause**:
1. Session cookie is not being stored in the browser (invalid cookie domain or host mismatch).

**Solutions**:
1. **Use One Canonical Host**: Make sure users always sign in on the same domain (`https://www.clientwave.app` recommended).
2. **Check `NEXT_PUBLIC_APP_URL`**: Set it to your canonical URL (for example `https://www.clientwave.app`).
3. **Check `COOKIE_DOMAIN` Format**: If set, it must be a plain domain (for example `.clientwave.app`) with no protocol/path/port.
4. **Inspect Response Headers**: Verify login/register responses include `Set-Cookie: session_token=...`.
5. **Inspect Browser Cookie Storage**: Confirm `session_token` is present after auth request.

**Usage Example**:
```bash
curl -i -X POST https://www.clientwave.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@example.com","password":"StrongPass123!"}'
```

### API Authentication Failures
**Symptom**: API requests return 401 Unauthorized errors

**Solutions**:
1. **Verify API Key**: Ensure your API key is correct and hasn't expired
2. **Check Authorization Header**: Confirm the format: `Authorization: Bearer YOUR_API_KEY`
3. **Key Permissions**: Verify your API key has the necessary permissions
4. **URL Encoding**: Ensure special characters in your API key are properly encoded
5. **HTTPS Requirement**: Ensure you're using HTTPS for all API requests

## Data and Sync Issues

### Missing Data
**Symptom**: Expected data is not appearing in ClientWave

**Solutions**:
1. **Refresh Page**: Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)
2. **Check Filters**: Verify your filters aren't excluding the data
3. **Sync Status**: Check if integrations are properly syncing
4. **Time Zone**: Confirm time zones are set correctly
5. **Permissions**: Verify you have access to view the data
6. **Data Import**: If recently imported, check if import is complete

### Sync Failures
**Symptom**: Integration sync is failing or not updating properly

**Solutions**:
1. **Connection Status**: Check integration status in Settings
2. **Credentials**: Verify third-party app credentials are current
3. **Rate Limits**: Check if you've exceeded API rate limits
4. **Network Issues**: Ensure stable internet connection
5. **Firewall**: Check if corporate firewall is blocking connections
6. **Retry Sync**: Manually trigger a sync in Integration settings

## Database Issues

### "Database unavailable" During Registration
**Symptom**: `/api/auth/register` returns `503 Database unavailable` and signup cannot continue

**What changed**:
1. ClientWave no longer falls back to mock/file-based persistence for auth
2. Registration now requires a working Prisma + PostgreSQL connection in every environment
3. If the database is unavailable, auth fails fast instead of writing local mock files

**Solutions**:
1. **Set DB URLs**: Confirm `DIRECT_URL` and `DATABASE_URL` are present in runtime env (local + deploy)
2. **Connection Priority**: Runtime prefers `DATABASE_URL` first and uses `DIRECT_URL` only as fallback
3. **Check Connectivity**: Ensure the selected URL points to a reachable PostgreSQL instance
4. **Run Migrations**: Apply schema migrations to the target database
5. **Verify Runtime Env**: Confirm your hosting provider actually injected the expected env vars
6. **Verify Runtime Packages**: Ensure `@prisma/client` is installed in `dependencies` (not only `devDependencies`)
7. **Redeploy After Dependency Changes**: A fresh deploy is required after moving Prisma packages
8. **Read Detailed Reason**: If response includes `Prisma unavailable reason: Prisma dependencies are unavailable at runtime`, the runtime cannot load Prisma modules and needs a clean redeploy/install
9. **Prisma 7 Runtime Utils**: If logs show `Cannot find module '@prisma/client-runtime-utils'`, add `@prisma/client-runtime-utils` to runtime dependencies and redeploy
10. **Run Health Probe**: Use `GET /api/health/db` to verify runtime env selection and live DB connectivity
11. **Use Auth Dev Banner**: In development, auth pages show a DB status banner that runs the same health probe before login/register/reset actions

**Usage Example**:
```bash
# App-level DB health check
curl -sS http://localhost:3000/api/health/db

# Validate the app has a DB URL at runtime
echo "$DIRECT_URL"
echo "$DATABASE_URL"

# Registration now requires a real DB; if DB is unavailable, this returns 503
curl -i -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@example.com","password":"StrongPass123!"}'
```

### "Column does not exist" Errors
**Symptom**: A Prisma error mentions a missing column (for example, `Contract.pdfUrl`)

**Solutions**:
1. **Check DB Target**: Confirm which database the app is using (`DATABASE_URL`)
2. **Apply Migrations**: Run migrations against the correct environment
3. **Verify Columns**: Query `information_schema.columns` to confirm the column exists
4. **Regenerate Client**: Run `npx prisma generate` if the schema changed
5. **Review Checklist**: Follow the migration checklist in `docs/database/README.md`

**Auth-specific note**:
If login pages log `Prisma session query failed` with `P2022` from `company.findUnique()`, your deployed DB is behind schema (for example missing `Company.stripeFeeResponsibility`). Run migrations in production, then redeploy/restart.

**Usage Example (Message sender role drift)**:
```bash
# Apply pending migrations to production target
npx prisma migrate deploy

# If migration deploy is blocked, apply the missing column manually
psql "$DATABASE_URL" -c 'ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "senderRole" TEXT;'
```

**Chat-specific note**:
If `/api/chat/messages` fails with `P2022` and `The column (not available) does not exist`, this is usually missing `Message.senderRole` in the target database. Apply the same migration/fix above, then redeploy/restart.

### Product Create Fails with "malformed array literal"
**Symptom**: `P2007` from `prisma.product.create()` with text like `malformed array literal`

**Cause**:
1. Prisma schema expects `Product.features` and `Product.tags` as `TEXT`
2. Target database drifted to `TEXT[]` for one or both columns
3. JSON-string list payloads (for example `["tag"]`) are rejected by PostgreSQL array parser

**Solutions**:
1. Deploy the migration that normalizes `Product.features` and `Product.tags` back to `TEXT`
2. Run `npx prisma migrate deploy` in production
3. Retry product create/update

**Usage Example**:
```bash
npx prisma migrate deploy
```

## Performance Issues

### Slow Loading Times
**Symptom**: Pages or data are loading slowly

**Solutions**:
1. **Internet Connection**: Check your internet speed and stability
2. **Browser Extensions**: Disable ad blockers and heavy extensions temporarily
3. **Large Datasets**: Use filters to limit the amount of data displayed
4. **Cache**: Clear browser cache and cookies
5. **Incognito Mode**: Test in an incognito window
6. **Different Device**: Try accessing from a different computer/device

### API Response Delays
**Symptom**: API requests are taking longer than expected

**Solutions**:
1. **Network Latency**: Check your internet connection
2. **Rate Limits**: Verify you're not hitting rate limits
3. **Large Payloads**: Optimize your requests to include only necessary data
4. **Batch Operations**: Use batch endpoints when available
5. **Off-Peak Hours**: Try requests during off-peak hours if possible

## Email and Communication Issues

### Email Delivery Problems
**Symptom**: Clients not receiving proposals, invoices, or other emails

**Solutions**:
1. **Spam Filters**: Check if emails are going to spam/junk folders
2. **Email Addresses**: Verify recipient email addresses are correct
3. **Domain Reputation**: Check if your domain is blacklisted
4. **Sending Limits**: Verify you haven't exceeded email sending limits
5. **Template Issues**: Ensure email templates are properly formatted
6. **Unsubscribe Lists**: Check if recipients have unsubscribed

### Calendar Integration Issues
**Symptom**: Calendar events not syncing properly

**Solutions**:
1. **Calendar Permissions**: Verify ClientWave has proper calendar permissions
2. **Sync Settings**: Check calendar sync frequency settings
3. **Conflicting Events**: Look for overlapping events causing conflicts
4. **Time Zones**: Ensure time zones are consistent across systems
5. **Re-authentication**: Disconnect and reconnect your calendar integration

### Google Busy Times Not Blocking Slots
**Symptom**: You have events on Google Calendar, but booking slots still appear open in ClientWave

**Cause**:
1. Busy periods are returned from Google in UTC
2. Slot generation must be computed in the host user's timezone before overlap checks
3. If slot times are built in server-local time, overlap detection can miss busy windows

**Solutions**:
1. **Confirm Connection**: Verify the host account is connected to Google Calendar
2. **Check Host Timezone**: Ensure the host user profile timezone is correct
3. **Use Updated Build**: Deploy the scheduling availability route that converts host local slot times to UTC before comparing to Google `freeBusy`
4. **Retest Endpoint**: Call `GET /api/scheduling/{slug}/availability` and verify `bookedSlots` includes entries with source from Google in server logs

**Usage Example**:
```bash
curl -sS "http://localhost:3000/api/scheduling/<host-slug>/availability"
```

## Payment Processing Issues

### Failed Payments
**Symptom**: Payment processing is failing for clients

**Solutions**:
1. **Payment Method**: Verify the client's payment method is valid and current
2. **Processing Limits**: Check if transaction exceeds limits
3. **Gateway Status**: Verify payment gateway is operational
4. **Insufficient Funds**: Confirm the payment method has sufficient funds
5. **Card Verification**: Ensure CVV and billing address match records
6. **Security Blocks**: Check if the transaction was flagged by fraud prevention

### ACH Not Showing in Checkout
**Symptom**: ACH (bank account) does not appear on the invoice payment form even after enabling it in Stripe.

**Cause**:
1. ClientWave now controls invoice checkout methods using company settings.
2. Checkout uses explicit Stripe `payment_method_types` instead of fully automatic method selection.
3. ACH only appears when both are true:
4. `Settings -> Business -> Stripe -> Accepted Online Payment Methods -> ACH` is enabled.
5. The connected Stripe account is eligible for `us_bank_account`.

**Solutions**:
1. In ClientWave Business Settings, confirm `ACH (US bank account)` toggle is enabled.
2. Keep `Card` enabled unless you intentionally want ACH-only checkout.
3. In Stripe for the connected account, confirm ACH is enabled and account capabilities are complete.
4. Save settings, then open a new invoice payment page and retest.

### Refund Processing
**Symptom**: Unable to process refunds or refunds not appearing

**Solutions**:
1. **Refund Window**: Verify the refund is within the allowed timeframe
2. **Original Transaction**: Confirm the original transaction exists
3. **Processing Method**: Ensure using the same payment method as original
4. **Gateway Status**: Check payment gateway for any issues
5. **Documentation**: Keep records of refund transactions

### Stripe Payment Succeeds But Invoice Status Does Not Update
**Symptom**: Customer payment completes in Stripe, but invoice/payment status in ClientWave stays unpaid or unchanged.

**Quick checks in app**:
1. Open **Settings -> Business -> Stripe**.
2. Review the **Stripe Webhook Health** panel:
3. Confirm **Mode** is expected (`Platform Managed` for Express/Custom, or `Manual` when using manual secret flow).
4. Confirm **Status** is `Verified` (or review the `Last Error` message).
5. Click **Retry Webhook Sync** to refresh webhook setup metadata.

**Common fixes**:
1. **Wrong signing secret**: Ensure the webhook secret in env/manual entry matches the exact Stripe endpoint.
2. **Wrong event scope**: In Stripe, endpoint must receive events from connected accounts when using Connect.
3. **Missing events**: Include `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`, and refund events.
4. **Test/live mismatch**: Test secret does not verify live events and vice versa.
5. **Endpoint exists but no secret shown**: Stripe often does not return `secret` when retrieving an existing endpoint. Re-running webhook sync should reuse stored secret or create a fresh endpoint to capture one.
6. **Platform-managed fallback**: If `STRIPE_WEBHOOK_SECRET` is configured, Platform Managed mode can still be marked `Verified` even when a per-account secret is unavailable.
7. **Express account UI**: Express accounts are platform-managed and should not require manual webhook secret entry in Settings. If manual webhook fields appear for an Express account, verify `Company.stripeAccountType` is `express` and refresh settings metadata.

**Usage Example**:
```bash
# Verify webhook endpoint is reachable
curl -i https://www.clientwave.app/api/stripe/webhook
```

## Integration Issues

### Third-Party Connection Failures
**Symptom**: Integrations with other services are not working

**Solutions**:
1. **Re-authentication**: Re-authorize the integration connection
2. **API Limits**: Check if you've hit API rate limits
3. **Credential Updates**: Verify third-party credentials are current
4. **Service Status**: Check the third-party service status page
5. **Webhook Issues**: Verify webhook endpoints are accessible
6. **Data Mapping**: Confirm field mappings are correct

### Production Login/Register Fails (Works Locally)
**Symptom**: Authentication works on localhost but fails in production.

**Checks**:
1. **Email normalization**: Login/register now trims + lowercases emails and uses case-insensitive lookup.
2. **Cookie domain**: Verify `COOKIE_DOMAIN`/`NEXT_PUBLIC_APP_URL` align with your live host (`clientwave.app` vs `www.clientwave.app`).
3. **HTTPS required**: Production session cookie is `secure=true`; non-HTTPS hosts will not keep the cookie.
4. **Session write**: Confirm `Session` rows are being created on login/register.

**Quick verification**:
1. Register with mixed-case email (e.g. `User@Example.com`), then login with lowercase.
2. In browser DevTools, confirm `session_token` is set after login response.

### Resources: "Unable to create resource"
**Symptom**: Creating a resource from the Resources page fails with "Unable to create resource".

**What changed**:
1. Resource creation now tries multiple payload shapes for `visibleToRoles`, `visibleToPositions`, and `acknowledgedBy` to support mixed/legacy DB schemas.
2. The Resources form now surfaces server `details` when available instead of only a generic message.

**Quick checks**:
1. Confirm your user is `OWNER`, `ADMIN`, or `SUPERADMIN`.
2. Confirm the user has a `companyId`.
3. Re-submit and read the full error text shown in the form (now includes backend details).

### Data Mapping Problems
**Symptom**: Data isn't transferring correctly between systems

**Solutions**:
1. **Field Mapping**: Verify field mappings are correct in integration settings
2. **Data Types**: Check that data types match between systems
3. **Required Fields**: Ensure all required fields are mapped
4. **Sync Direction**: Confirm the direction of data sync is correct
5. **Transformation Rules**: Check any data transformation rules

## Reporting and Analytics Issues

### Incorrect Data in Reports
**Symptom**: Reports show incorrect or incomplete data

**Solutions**:
1. **Date Ranges**: Verify the correct date ranges are selected
2. **Filters**: Check if filters are excluding relevant data
3. **Data Sources**: Confirm reports are pulling from correct data sources
4. **Calculation Methods**: Verify calculation formulas are correct
5. **Caching**: Refresh the report to clear any cached data

### Report Generation Failures
**Symptom**: Reports fail to generate or time out

**Solutions**:
1. **Data Volume**: Reduce the date range or filters to limit data volume
2. **System Resources**: Check if the system is experiencing high load
3. **Export Format**: Try different export formats
4. **Scheduled Reports**: Consider using scheduled reports for large datasets
5. **Contact Support**: For persistent issues, contact support for investigation

## Mobile App Issues

### App Crashes
**Symptom**: Mobile app crashes or freezes

**Solutions**:
1. **Update App**: Ensure you're using the latest version
2. **Clear Cache**: Clear the app's cache and data
3. **Storage Space**: Verify your device has sufficient storage
4. **Reinstall**: Uninstall and reinstall the app
5. **Device Compatibility**: Check if your device meets minimum requirements

### Sync Problems
**Symptom**: Mobile app data doesn't sync with web version

**Solutions**:
1. **Internet Connection**: Ensure stable internet connection
2. **Background Refresh**: Enable background app refresh
3. **Sync Settings**: Check sync frequency settings
4. **Manual Sync**: Try manually triggering a sync
5. **Account Status**: Verify account is active and not suspended

## Common Error Messages

### "404 Not Found"
**Meaning**: The requested resource doesn't exist
**Solutions**:
- Check the URL for typos
- Verify you have permission to access the resource
- Refresh the page to reload the navigation

### "500 Internal Server Error"
**Meaning**: Temporary server issue
**Solutions**:
- Wait a few minutes and try again
- Refresh the page
- Contact support if the issue persists

### "Unable to create resource"
**Symptom**: Creating a resource fails even when title and URL are filled.

**Cause**:
1. Resource visibility/acknowledgment fields are persisted as serialized text in the database.
2. Sending raw arrays or relation-connect payloads can fail resource creation in some environments.
3. Role restrictions can block creation if the user is not `OWNER`, `ADMIN`, or `SUPERADMIN`.

**Solutions**:
1. Ensure resource create writes `companyId` directly and stores `visibleToRoles`, `visibleToPositions`, and `acknowledgedBy` in the format expected by the current DB schema.
2. Keep a compatibility fallback in the create API so both legacy JSON-string storage and string-array storage are accepted.
3. Confirm the logged-in user role has resource management permissions (`OWNER`, `ADMIN`, `SUPERADMIN`).
4. Ensure resource list/read paths parse stored visibility text back into arrays before rendering.

### "Rate Limit Exceeded"
**Meaning**: You've exceeded API or action limits
**Solutions**:
- Wait until the rate limit resets
- Spread out your requests over time
- Upgrade your plan if you consistently hit limits

### "Connection Timeout"
**Meaning**: Request took too long to complete
**Solutions**:
- Check your internet connection
- Try again later
- Simplify your request if possible

### "You must belong to a company before creating clients"
**Symptom**: Add Client page shows company-required warning even though your user is already linked to a company in the database

**Cause**:
1. Frontend helper request (`/api/auth/me`) returned an unexpected shape or missing `companyId`
2. Client gate logic read `user.companyId` only and treated missing data as no membership

**Solutions**:
1. Ensure `/api/auth/me` includes a `user` object with `companyId` (and keep top-level compatibility if needed)
2. Refresh the session (log out/in) after company membership updates
3. Reload the Add Client page after deploy to clear stale client-side state

### Invoice Edit Opens Blank and Creates New Invoice
**Symptom**: Clicking Edit on an invoice opens the invoice editor without existing data, and saving creates a new invoice

**Cause**:
1. Invoice editor route did not apply `?edit=<invoiceId>` mode
2. Form submit path used create-only logic instead of updating existing invoice

**Expected Behavior**:
1. `Edit` loads existing invoice values into the form
2. Saving in edit mode sends `PUT /api/invoices/{id}` and updates the same invoice record

### Meeting Type Toggle Saves but UI Doesn’t Confirm
**Symptom**: In Availability/Scheduling, toggling a meeting type (for example Phone call) appears to change but save confirmation is missing or the setting reverts

**Cause**:
1. Profile update payload can send booleans while server parsing expects string values
2. Scheduling tab can submit availability without a client-side success callback, so no local “Saved!” indicator is shown

**Solutions**:
1. Ensure server boolean parsing accepts both boolean and string inputs
2. Preserve existing boolean settings when a field is omitted from payload
3. Ensure the Scheduling form has a submit callback to trigger the local saved state indicator

### Buffer Behavior in Scheduling
**Expected Behavior**:
1. Slot generation uses `duration + buffer` spacing by default
2. Buffer changes the next available start time automatically
3. Example: duration 30 + buffer 15 gives starts like 9:00, 9:45, 10:30
4. Booking and reschedule validation use the same slot grid

**If slots look too restricted**:
1. Check for overlapping Google busy events
2. Check canceled status (`CANCELLED`) so old bookings are not still counted
3. Refresh `/api/scheduling/{slug}/availability` and verify blocked slots are only around real busy periods

### Owner Cannot Cancel a Booked Slot
**Symptom**: You can see booked appointments in Scheduling, but there is no action to cancel and reopen a slot

**Expected Behavior**:
1. When the authenticated user is the booking owner, each active booking shows an `x` cancel action
2. Each active booking also shows `rs` to reschedule
3. Each appointment row shows a trash action for permanent delete
4. Clicking `x` opens a confirmation modal
5. Confirming sets booking status to `CANCELLED`
6. Cancelled bookings no longer block availability slots
7. Clicking `rs` opens a reschedule modal to pick new date/time
8. Rescheduling updates the booking, attempts to update Google Calendar, and sends reschedule notifications
9. Trash delete permanently removes the booking row and attempts to remove linked Google events
10. If the booking was mirrored to Google Calendar, cancellation attempts to remove the Google event and notify attendees
11. Cancellation emails are sent to both the client and owner

**If it does not work**:
1. Verify the request to `DELETE /api/scheduling/{slug}/admin-bookings?bookingId=...` returns `200`
2. Confirm booking `status` is `CANCELLED` in DB
3. Refresh scheduling/public booking pages to reload availability

### Can't find booking link or embed code in Scheduling
**Symptom**: You can't find your public booking link or scheduler embed snippet where it used to be in the form.

**Expected Behavior**:
1. In the Scheduling page, the public link and embed snippet are grouped in a `Share & Embed` block below the availability form.
2. `Share & Embed` is disabled until at least one availability day is selected.
3. The section includes an accordion summary of selected availability slots.

### PWA Theme Only Partially Updates
**Symptom**: In mobile/PWA, switching back to light mode updates page background but inner app containers remain dark

**Solutions**:
1. Ensure theme class is applied to both `html` and `body`
2. Prefer app-shell backgrounds based on CSS variables (`--background`) for consistent theme sync
3. Hard-refresh PWA after deploy to clear stale cached CSS/JS
4. Ensure `prefers-color-scheme: dark` rules do not override explicit `.light` mode on `:root`
5. For fixed headers/nav, prefer explicit theme-state classes over `dark:*` only utilities to avoid stale class mismatches on mobile
6. For dashboard cards/widgets (business info, username, unread messages, quick actions), prefer CSS-variable surfaces (`--color-surface`, `--color-border`, `--foreground`) over mixed `dark:*` panel classes
7. Keep login/auth pages (including root `AuthPageClient` at `/`) explicitly light-styled by default (white backgrounds, dark text) to avoid phone-only dark rendering drift

## Diagnostic Information

### Gathering Information for Support
When contacting support, provide:
1. **Detailed Description**: What you were trying to do
2. **Steps to Reproduce**: Exact steps that led to the issue
3. **Error Messages**: Exact text of any error messages
4. **Screenshots**: Visual evidence when helpful
5. **Time and Date**: When the issue occurred
6. **Device/OS**: Your device and operating system
7. **Browser**: If using web app, your browser and version
8. **API Requests**: If applicable, request/response details

### Browser Developer Tools
For web application issues:
1. Open browser developer tools (F12)
2. Check the Console tab for JavaScript errors
3. Check the Network tab for failed requests
4. Take screenshots of any errors shown

### API Debugging
For API issues:
1. Use tools like Postman or cURL for testing
2. Log request/response headers and bodies
3. Check rate limit headers in responses
4. Verify authentication headers are properly formatted

## Prevention Tips

### Regular Maintenance
- **Update Regularly**: Keep your apps and integrations updated
- **Clean Data**: Regularly review and clean up old data
- **Backup**: Maintain backups of critical data
- **Monitor**: Regularly check system status and performance

### Best Practices
- **Strong Passwords**: Use strong, unique passwords
- **Two-Factor Authentication**: Enable 2FA for security
- **Permission Management**: Regularly review user permissions
- **Training**: Ensure team members are properly trained
- **Documentation**: Keep processes documented

## When to Contact Support

Contact support when:
- Issues persist after trying troubleshooting steps
- You encounter errors not covered in this guide
- You need help with configuration or setup
- You experience data loss or security concerns
- You have questions about advanced features

## Support Channels

- **Email**: support@clientwave.app
- **Live Chat**: Available in-app during business hours
- **Phone**: 1-800-CLIENTWAVE (business hours only)
- **Knowledge Base**: https://help.clientwave.app
- **Community Forum**: https://community.clientwave.app

## Support Response Times

- **Critical Issues**: 1-4 hours during business hours
- **Standard Issues**: 4-24 hours
- **Feature Requests**: 24-48 hours
- **General Questions**: 24-48 hours

For urgent issues outside business hours, contact emergency support at emergency@clientwave.app.
