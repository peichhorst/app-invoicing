# Webhooks

Webhooks enable real-time notifications from ClientWave to your external applications, allowing you to build responsive integrations that react immediately to changes in your business data.

## Understanding Webhooks

Webhooks are HTTP callbacks that send data from ClientWave to your application whenever specific events occur. Unlike polling, which requires constant checking, webhooks provide instant notifications, ensuring your systems remain synchronized in real-time.

### How Webhooks Work
1. **Configuration**: Register a URL endpoint to receive webhook payloads
2. **Event Occurrence**: ClientWave detects a registered event
3. **HTTP Request**: ClientWave sends a POST request with event data
4. **Processing**: Your application processes the incoming data
5. **Response**: Your application acknowledges receipt with a 200 status code

## Webhook Events

### Opportunity Events
- **`opportunity.created`**: A new opportunity is created in the system
- **`opportunity.updated`**: An opportunity's status or details change
- **`opportunity.status_changed`**: Opportunity moves between pipeline stages
- **`opportunity.closed_won`**: Opportunity converts to a client or project
- **`opportunity.closed_lost`**: Opportunity is marked as lost
- **`opportunity.deleted`**: Opportunity is removed from the system

### Client Events
- **`client.created`**: New client record is added
- **`client.updated`**: Client information is modified
- **`client.contact_added`**: New contact person is added to client
- **`client.deleted`**: Client record is removed

### Proposal Events
- **`proposal.created`**: New proposal is generated
- **`proposal.sent`**: Proposal is sent to the client
- **`proposal.viewed`**: Client opens the proposal
- **`proposal.accepted`**: Client accepts the proposal
- **`proposal.declined`**: Client declines the proposal
- **`proposal.expired`**: Proposal validity period ends
- **`proposal.updated`**: Proposal details are modified

### Invoice Events
- **`invoice.created`**: New invoice is generated
- **`invoice.sent`**: Invoice is sent to the client
- **`invoice.viewed`**: Client opens the invoice
- **`invoice.paid`**: Payment is received for the invoice
- **`invoice.partially_paid`**: Partial payment is received
- **`invoice.overdue`**: Invoice becomes overdue
- **`invoice.refunded`**: Invoice is refunded
- **`invoice.voided`**: Invoice is canceled

### Contract Events
- **`contract.created`**: New contract is generated
- **`contract.sent_for_signature`**: Contract is sent for electronic signature
- **`contract.signed`**: Contract is digitally signed by all parties
- **`contract.executed`**: Contract becomes effective
- **`contract.terminated`**: Contract is ended early
- **`contract.expired`**: Contract validity period ends

### Payment Events
- **`payment.created`**: New payment is recorded
- **`payment.failed`**: Payment attempt fails
- **`payment.disputed`**: Payment is disputed by client
- **`payment.refunded``: Refund is issued

## Setting Up Webhooks

### Creating a Webhook Endpoint

1. **Choose a URL**: Select a publicly accessible URL on your server
2. **Implement Handler**: Create a server endpoint to receive POST requests
3. **Configure Security**: Implement signature verification
4. **Register Hook**: Add the endpoint in ClientWave settings

### Example Webhook Handler (Node.js)
```javascript
const express = require('express');
const crypto = require('crypto');
const app = express();

app.use(express.raw({ type: 'application/json' }));

app.post('/webhooks/clientwave', (req, res) => {
  // Verify webhook signature
  const signature = req.headers['x-clientwave-signature'];
  const secret = process.env.WEBHOOK_SECRET;
  
  const expectedSignature = 'sha256=' + 
    crypto.createHmac('sha256', secret)
          .update(req.body)
          .digest('hex');
  
  if (signature !== expectedSignature) {
    return res.status(401).send('Unauthorized');
  }
  
  const event = JSON.parse(req.body);
  
  switch (event.type) {
    case 'opportunity.created':
      handleOpportunityCreated(event.data);
      break;
    case 'invoice.paid':
      handleInvoicePaid(event.data);
      break;
    case 'proposal.accepted':
      handleProposalAccepted(event.data);
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
  
  res.status(200).send('OK');
});

function handleOpportunityCreated(data) {
  // Process new opportunity
  console.log(`New opportunity: ${data.title}`);
  // Add your custom logic here
}

function handleInvoicePaid(data) {
  // Process paid invoice
  console.log(`Invoice paid: ${data.id}, amount: ${data.amount}`);
  // Add your custom logic here
}

function handleProposalAccepted(data) {
  // Process accepted proposal
  console.log(`Proposal accepted: ${data.title}`);
  // Add your custom logic here
}
```

### Example Webhook Handler (Python)
```python
from flask import Flask, request
import hashlib
import hmac
import json

app = Flask(__name__)

@app.route('/webhooks/clientwave', methods=['POST'])
def webhook_handler():
    # Verify webhook signature
    signature = request.headers.get('X-ClientWave-Signature')
    secret = app.config['WEBHOOK_SECRET']
    
    expected_signature = 'sha256=' + hmac.new(
        secret.encode(),
        request.data,
        hashlib.sha256
    ).hexdigest()
    
    if not hmac.compare_digest(signature, expected_signature):
        return 'Unauthorized', 401
    
    event = json.loads(request.data)
    
    if event['type'] == 'opportunity.created':
        handle_opportunity_created(event['data'])
    elif event['type'] == 'invoice.paid':
        handle_invoice_paid(event['data'])
    elif event['type'] == 'proposal.accepted':
        handle_proposal_accepted(event['data'])
    
    return 'OK', 200

def handle_opportunity_created(data):
    print(f"New opportunity: {data['title']}")
    # Add your custom logic here

def handle_invoice_paid(data):
    print(f"Invoice paid: {data['id']}, amount: {data['amount']}")
    # Add your custom logic here

def handle_proposal_accepted(data):
    print(f"Proposal accepted: {data['title']}")
    # Add your custom logic here
```

## Webhook Payloads

### General Payload Structure
```json
{
  "id": "evt_1234567890",
  "type": "opportunity.created",
  "created_at": "2023-10-01T12:00:00Z",
  "data": {
    // Event-specific data
  },
  "previous_attributes": {
    // Previous values for update events (when applicable)
  }
}
```

### Opportunity Created Payload
```json
{
  "id": "evt_9876543210",
  "type": "opportunity.created",
  "created_at": "2023-10-01T12:00:00Z",
  "data": {
    "id": "opp_12345",
    "title": "New Roof Installation",
    "client_id": "cli_67890",
    "status": "new",
    "estimated_value": 15000,
    "probability": 0.7,
    "description": "Complete roof replacement for residential property",
    "created_at": "2023-10-01T12:00:00Z",
    "updated_at": "2023-10-01T12:00:00Z",
    "custom_fields": {
      "property_type": "single_family",
      "square_footage": 2500
    }
  }
}
```

### Invoice Paid Payload
```json
{
  "id": "evt_1122334455",
  "type": "invoice.paid",
  "created_at": "2023-10-01T14:30:00Z",
  "data": {
    "id": "inv_556677",
    "client_id": "cli_67890",
    "amount": 7500,
    "currency": "USD",
    "paid_amount": 7500,
    "status": "paid",
    "due_date": "2023-09-30",
    "paid_at": "2023-10-01T14:30:00Z",
    "payment_method": "credit_card",
    "transaction_id": "txn_998877",
    "created_at": "2023-09-15T10:00:00Z",
    "updated_at": "2023-10-01T14:30:00Z"
  }
}
```

### Proposal Accepted Payload
```json
{
  "id": "evt_5544332211",
  "type": "proposal.accepted",
  "created_at": "2023-10-01T16:45:00Z",
  "data": {
    "id": "prop_12345",
    "title": "Roof Replacement Project",
    "client_id": "cli_67890",
    "opportunity_id": "opp_12345",
    "status": "accepted",
    "accepted_at": "2023-10-01T16:45:00Z",
    "total_amount": 14250,
    "accepted_by": {
      "name": "John Smith",
      "email": "john@clientcompany.com",
      "ip_address": "192.168.1.1"
    },
    "created_at": "2023-09-25T09:00:00Z",
    "updated_at": "2023-10-01T16:45:00Z"
  }
}
```

## Security

### Signature Verification
All webhooks include a signature in the `X-ClientWave-Signature` header that allows you to verify the request originated from ClientWave.

The signature is calculated using HMAC with SHA-256 and your webhook secret:
```
signature = 'sha256=' + HMAC_SHA256(payload, secret)
```

### Best Practices
- **Always verify signatures** before processing webhook data
- **Store your webhook secret securely** and never expose it in client-side code
- **Use HTTPS** for your webhook endpoints
- **Validate data** before processing to prevent injection attacks
- **Implement rate limiting** to prevent abuse

## Reliability

### Retry Mechanism
ClientWave automatically retries failed webhook deliveries with exponential backoff:
- First retry: 1 minute
- Second retry: 5 minutes
- Third retry: 15 minutes
- Fourth retry: 30 minutes
- Fifth retry: 1 hour

If delivery fails after 5 attempts, the webhook is marked as failed and requires manual intervention.

### Handling Failures
Your webhook endpoint should respond with a 2xx status code to acknowledge successful receipt. Any other status code will trigger retries.

### Idempotency
Webhook events include unique IDs to help you detect and handle duplicate deliveries:

```python
def handle_webhook_event(event):
    # Check if this event ID has already been processed
    if event_exists(event['id']):
        return  # Skip duplicate event
    
    # Process the event
    process_event(event)
    
    # Mark event as processed
    mark_event_processed(event['id'])
```

## Configuration

### Managing Webhooks
1. **Navigate to Settings**: Go to Settings > Webhooks in ClientWave
2. **Add New Webhook**: Click "Add Webhook" and enter your endpoint URL
3. **Select Events**: Choose which events to subscribe to
4. **Set Secret**: Enter a secret for signature verification
5. **Save Configuration**: Save your webhook settings

### Testing Webhooks
ClientWave provides a test endpoint to verify your webhook configuration:

```
POST /webhooks/test
```

This endpoint sends a test event to your configured webhook URL to verify connectivity and signature verification.

### Debugging
- **Request Logging**: Log all incoming webhook requests for debugging
- **Status Monitoring**: Monitor webhook delivery status in your dashboard
- **Error Notifications**: Set up alerts for failed deliveries
- **Payload Inspection**: Examine the structure and content of webhook payloads

## Common Use Cases

### Inventory Management
Trigger inventory updates when invoices are paid or proposals are accepted:
```javascript
if (event.type === 'invoice.paid') {
  updateInventoryLevels(event.data.line_items);
}
```

### Project Management
Create project tasks when proposals are accepted:
```javascript
if (event.type === 'proposal.accepted') {
  createProjectTasks(event.data.id, event.data.line_items);
}
```

### Accounting Integration
Sync financial data with external accounting systems:
```javascript
if (event.type === 'invoice.paid') {
  syncPaymentToAccounting(event.data);
}
```

### Notification Systems
Send alerts to team members about important events:
```javascript
if (event.type === 'opportunity.created') {
  notifySalesTeam(event.data);
}
```

## Troubleshooting

### Common Issues
- **SSL Certificate Problems**: Ensure your endpoint uses valid SSL certificates
- **Firewall Restrictions**: Verify that ClientWave IPs can reach your endpoint
- **Signature Mismatch**: Double-check your secret and signature calculation
- **Slow Response Times**: Optimize your webhook handler for quick responses
- **Duplicate Processing**: Implement idempotency to handle retries properly

## Support

For questions about webhooks, consult our [FAQ](./faq.md) or contact support at [support@clientwave.app](mailto:support@clientwave.app).