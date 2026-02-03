# API Reference

The ClientWave API provides programmatic access to all platform features, enabling custom integrations and automation. This comprehensive reference covers all endpoints, authentication methods, and implementation examples.

## API Basics

### Base URL
```
https://api.clientwave.app/v1
```

### Authentication
All API requests require authentication using Bearer tokens:

```
Authorization: Bearer YOUR_API_TOKEN
```

To obtain an API token:
1. Log into your ClientWave account
2. Navigate to **Settings > API Access**
3. Generate a new token with appropriate permissions
4. Store the token securely

### Rate Limits
- **Standard Users**: 1,000 requests per hour
- **Premium Users**: 10,000 requests per hour
- **Enterprise Users**: Custom rate limits

Rate limits reset hourly and are indicated in response headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1634567890
```

### Response Format
All responses are returned in JSON format with standard HTTP status codes:

```
Status: 200 OK
Content-Type: application/json

{
  "success": true,
  "data": { ... },
  "timestamp": "2023-10-01T12:00:00Z"
}
```

## Opportunities API

### Get All Opportunities
```
GET /opportunities
```

**Parameters:**
- `status` (optional): Filter by status (new, qualified, proposed, won, lost)
- `assigned_to` (optional): Filter by assigned user ID
- `created_after` (optional): ISO 8601 date
- `limit` (optional): Number of results (default: 50, max: 100)
- `offset` (optional): Pagination offset

**Example Request:**
```bash
curl -X GET \
  "https://api.clientwave.app/v1/opportunities?status=qualified&limit=10" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "opportunities": [
      {
        "id": "opp_12345",
        "title": "New Roof Installation",
        "client_id": "cli_67890",
        "status": "qualified",
        "estimated_value": 15000,
        "probability": 0.7,
        "created_at": "2023-10-01T10:00:00Z",
        "updated_at": "2023-10-01T12:00:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_count": 45
    }
  }
}
```

### Create Opportunity
```
POST /opportunities
```

**Request Body:**
```json
{
  "title": "New Roof Installation",
  "client_id": "cli_67890",
  "description": "Complete roof replacement for residential property",
  "estimated_value": 15000,
  "estimated_close_date": "2023-11-15",
  "probability": 0.7,
  "tags": ["construction", "residential"],
  "custom_fields": {
    "property_type": "single_family",
    "square_footage": 2500
  }
}
```

### Get Opportunity Details
```
GET /opportunities/{id}
```

### Update Opportunity
```
PUT /opportunities/{id}
```

### Delete Opportunity
```
DELETE /opportunities/{id}
```

## Clients API

### Get All Clients
```
GET /clients
```

**Parameters:**
- `tag` (optional): Filter by tag
- `industry` (optional): Filter by industry
- `created_after` (optional): ISO 8601 date
- `limit` (optional): Number of results (default: 50, max: 100)
- `offset` (optional): Pagination offset

**Example Request:**
```bash
curl -X GET \
  "https://api.clientwave.app/v1/clients?industry=construction&limit=5" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

### Create Client
```
POST /clients
```

**Request Body:**
```json
{
  "name": "Smith Construction",
  "email": "contact@smithconstruction.com",
  "phone": "+15551234567",
  "address": {
    "street": "123 Main St",
    "city": "San Diego",
    "state": "CA",
    "zip": "92101",
    "country": "US"
  },
  "industry": "construction",
  "website": "https://smithconstruction.com",
  "tags": ["commercial", "high-value"],
  "custom_fields": {
    "license_number": "ABC123456",
    "insurance_valid_until": "2024-12-31"
  }
}
```

## Proposals API

### Get All Proposals
```
GET /proposals
```

**Parameters:**
- `status` (optional): draft, sent, accepted, declined, expired
- `client_id` (optional): Filter by client
- `opportunity_id` (optional): Filter by opportunity
- `created_after` (optional): ISO 8601 date
- `limit` (optional): Number of results (default: 50, max: 100)

### Create Proposal
```
POST /proposals
```

**Request Body:**
```json
{
  "title": "Roof Replacement Project",
  "client_id": "cli_67890",
  "opportunity_id": "opp_12345",
  "description": "Complete roof replacement with premium materials",
  "valid_until": "2023-11-01",
  "terms": "Payment due within 30 days of completion",
  "line_items": [
    {
      "description": "Roof tear-off",
      "quantity": 1,
      "unit_price": 1500,
      "tax_rate": 0.08
    },
    {
      "description": "Shingle installation",
      "quantity": 2500,
      "unit_price": 3.50,
      "tax_rate": 0.08
    }
  ],
  "discount_percentage": 5.0,
  "custom_fields": {
    "project_manager": "John Doe",
    "estimated_hours": 40
  }
}
```

### Send Proposal
```
POST /proposals/{id}/send
```

### Accept Proposal
```
POST /proposals/{id}/accept
```

## Invoices API

### Get All Invoices
```
GET /invoices
```

**Parameters:**
- `status` (optional): draft, sent, paid, partially_paid, overdue, void
- `client_id` (optional): Filter by client
- `created_after` (optional): ISO 8601 date
- `due_after` (optional): Filter by due date
- `limit` (optional): Number of results (default: 50, max: 100)

### Create Invoice
```
POST /invoices
```

**Request Body:**
```json
{
  "client_id": "cli_67890",
  "due_date": "2023-11-01",
  "po_number": "PO-2023-001",
  "notes": "Thank you for your business!",
  "payment_terms": "Net 30 days",
  "line_items": [
    {
      "description": "Roof installation labor",
      "quantity": 40,
      "unit_price": 50,
      "tax_rate": 0.08
    },
    {
      "description": "Materials",
      "quantity": 1,
      "unit_price": 5000,
      "tax_rate": 0.08
    }
  ],
  "discount_amount": 100,
  "custom_fields": {
    "project_reference": "ROOF-2023-001",
    "billing_contact": "Jane Smith"
  }
}
```

### Send Invoice
```
POST /invoices/{id}/send
```

### Record Payment
```
POST /invoices/{id}/payments
```

**Request Body:**
```json
{
  "amount": 5000,
  "payment_method": "credit_card",
  "transaction_id": "txn_12345",
  "notes": "Partial payment for roof installation"
}
```

## Contracts API

### Get All Contracts
```
GET /contracts
```

**Parameters:**
- `status` (optional): draft, pending_signature, executed, terminated, expired
- `client_id` (optional): Filter by client
- `created_after` (optional): ISO 8601 date
- `limit` (optional): Number of results (default: 50, max: 100)

### Create Contract
```
POST /contracts
```

**Request Body:**
```json
{
  "title": "Roof Installation Contract",
  "client_id": "cli_67890",
  "proposal_id": "prop_12345",
  "start_date": "2023-11-01",
  "end_date": "2023-11-15",
  "contract_value": 7000,
  "payment_schedule": [
    {
      "amount": 2100,
      "due_date": "2023-11-01",
      "description": "50% deposit"
    },
    {
      "amount": 2100,
      "due_date": "2023-11-08",
      "description": "Progress payment"
    },
    {
      "amount": 2800,
      "due_date": "2023-11-15",
      "description": "Final payment"
    }
  ],
  "terms": "Standard construction terms apply",
  "custom_fields": {
    "project_manager": "John Doe",
    "insurance_certificate_required": true
  }
}
```

### Send for Signature
```
POST /contracts/{id}/send-signature
```

## Webhooks API

### Create Webhook Subscription
```
POST /webhooks
```

**Request Body:**
```json
{
  "url": "https://yourapp.com/webhooks/clientwave",
  "events": ["opportunity.created", "invoice.paid", "proposal.accepted"],
  "secret": "your_webhook_secret"
}
```

### Webhook Events
The following events are available for subscription:

- `opportunity.created` - New opportunity created
- `opportunity.updated` - Opportunity status changed
- `opportunity.closed_won` - Opportunity converted to client
- `opportunity.closed_lost` - Opportunity lost
- `client.created` - New client added
- `client.updated` - Client information changed
- `proposal.sent` - Proposal sent to client
- `proposal.accepted` - Proposal accepted
- `proposal.declined` - Proposal declined
- `invoice.created` - New invoice created
- `invoice.sent` - Invoice sent to client
- `invoice.paid` - Payment received
- `invoice.overdue` - Invoice is overdue
- `contract.executed` - Contract signed and executed

## Error Handling

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `204` - No Content
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Unprocessable Entity
- `429` - Too Many Requests
- `500` - Internal Server Error

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    }
  }
}
```

## SDKs and Libraries

### Official SDKs
- JavaScript/Node.js
- Python
- PHP
- Ruby
- Java

### Example Usage (JavaScript)
```javascript
const ClientWave = require('@clientwave/sdk');

const client = new ClientWave({
  apiKey: 'YOUR_API_KEY'
});

// Create a new opportunity
const opportunity = await client.opportunities.create({
  title: 'New Project',
  clientId: 'cli_12345',
  estimatedValue: 5000
});
```

## Support

For API-related questions, consult our [FAQ](./faq.md) or contact support at [support@clientwave.app](mailto:support@clientwave.app).