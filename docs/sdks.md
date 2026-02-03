# Software Development Kits (SDKs)

ClientWave SDKs provide convenient libraries for integrating with our platform in various programming languages. These SDKs abstract away the complexities of API authentication, request formatting, and response parsing.

## Available SDKs

### Official SDKs
- **JavaScript/Node.js**: Full-featured SDK for server-side and client-side applications
- **Python**: Comprehensive library with async support
- **PHP**: PSR-compliant SDK for PHP applications
- **Ruby**: Ruby gem with Rails integration
- **Java**: Enterprise-grade SDK with Spring Boot integration
- **C#**: .NET Framework and .NET Core support

## JavaScript/Node.js SDK

### Installation
```bash
npm install @clientwave/sdk
```

### Initialization
```javascript
const ClientWave = require('@clientwave/sdk');

const clientWave = new ClientWave({
  apiKey: process.env.CLIENTWAVE_API_KEY,
  baseURL: 'https://api.clientwave.app/v1', // Optional, defaults to production
  timeout: 30000 // Optional, request timeout in milliseconds
});
```

### Usage Examples

#### Working with Opportunities
```javascript
// Create a new opportunity
const opportunity = await clientWave.opportunities.create({
  title: 'New Roof Installation',
  clientId: 'cli_12345',
  estimatedValue: 15000,
  description: 'Complete roof replacement for residential property',
  tags: ['construction', 'residential']
});

// Get all opportunities
const opportunities = await clientWave.opportunities.list({
  status: 'qualified',
  limit: 10
});

// Update an opportunity
const updatedOpportunity = await clientWave.opportunities.update('opp_12345', {
  status: 'proposed',
  estimatedValue: 16000
});
```

#### Working with Clients
```javascript
// Create a new client
const client = await clientWave.clients.create({
  name: 'Smith Construction',
  email: 'contact@smithconstruction.com',
  phone: '+15551234567',
  address: {
    street: '123 Main St',
    city: 'San Diego',
    state: 'CA',
    zip: '92101',
    country: 'US'
  }
});

// Search for clients
const clients = await clientWave.clients.search({
  industry: 'construction',
  tags: ['commercial']
});
```

#### Working with Proposals
```javascript
// Create a proposal
const proposal = await clientWave.proposals.create({
  title: 'Roof Replacement Project',
  clientId: 'cli_12345',
  description: 'Complete roof replacement with premium materials',
  validUntil: '2023-12-01',
  lineItems: [
    {
      description: 'Roof tear-off',
      quantity: 1,
      unitPrice: 1500,
      taxRate: 0.08
    },
    {
      description: 'Shingle installation',
      quantity: 2500,
      unitPrice: 3.50,
      taxRate: 0.08
    }
  ]
});

// Send a proposal to a client
await clientWave.proposals.send('prop_12345');
```

#### Working with Invoices
```javascript
// Create an invoice
const invoice = await clientWave.invoices.create({
  clientId: 'cli_12345',
  dueDate: '2023-12-01',
  notes: 'Thank you for your business!',
  lineItems: [
    {
      description: 'Roof installation labor',
      quantity: 40,
      unitPrice: 50,
      taxRate: 0.08
    }
  ]
});

// Record a payment
await clientWave.invoices.recordPayment('inv_12345', {
  amount: 5000,
  paymentMethod: 'credit_card',
  transactionId: 'txn_98765'
});
```

### Error Handling
```javascript
try {
  const opportunity = await clientWave.opportunities.create({
    title: 'New Project',
    clientId: 'cli_12345'
  });
} catch (error) {
  if (error.isClientWaveError) {
    console.log(`ClientWave Error: ${error.message}`);
    console.log(`Error Code: ${error.code}`);
    console.log(`HTTP Status: ${error.statusCode}`);
    console.log(`Details:`, error.details);
  } else {
    console.log('Unexpected error:', error);
  }
}
```

### Async/Await with Promises
```javascript
// Using promises
clientWave.opportunities.list({ status: 'new' })
  .then(opportunities => {
    console.log(`${opportunities.length} opportunities found`);
  })
  .catch(error => {
    console.error('Error fetching opportunities:', error);
  });
```

## Python SDK

### Installation
```bash
pip install clientwave
```

### Initialization
```python
import clientwave

cw = clientwave.ClientWave(
    api_key='your_api_key_here',
    base_url='https://api.clientwave.app/v1',  # Optional
    timeout=30  # Optional, request timeout in seconds
)
```

### Usage Examples

#### Working with Opportunities
```python
# Create a new opportunity
opportunity = cw.opportunities.create(
    title='New Roof Installation',
    client_id='cli_12345',
    estimated_value=15000,
    description='Complete roof replacement for residential property'
)

# Get all opportunities
opportunities = cw.opportunities.list(status='qualified', limit=10)

# Update an opportunity
updated_opportunity = cw.opportunities.update(
    'opp_12345',
    status='proposed',
    estimated_value=16000
)
```

#### Working with Clients
```python
# Create a new client
client = cw.clients.create(
    name='Smith Construction',
    email='contact@smithconstruction.com',
    phone='+15551234567',
    address={
        'street': '123 Main St',
        'city': 'San Diego',
        'state': 'CA',
        'zip': '92101',
        'country': 'US'
    }
)

# Search for clients
clients = cw.clients.search(industry='construction', tags=['commercial'])
```

#### Working with Proposals
```python
# Create a proposal
proposal = cw.proposals.create(
    title='Roof Replacement Project',
    client_id='cli_12345',
    description='Complete roof replacement with premium materials',
    valid_until='2023-12-01',
    line_items=[
        {
            'description': 'Roof tear-off',
            'quantity': 1,
            'unit_price': 1500,
            'tax_rate': 0.08
        }
    ]
)

# Send a proposal
cw.proposals.send('prop_12345')
```

### Error Handling
```python
from clientwave import ClientWaveError

try:
    opportunity = cw.opportunities.create(
        title='New Project',
        client_id='cli_12345'
    )
except ClientWaveError as e:
    print(f"ClientWave Error: {e.message}")
    print(f"Error Code: {e.code}")
    print(f"HTTP Status: {e.status_code}")
except Exception as e:
    print(f"Unexpected error: {e}")
```

### Async Support (Python 3.7+)
```python
import asyncio
import clientwave.asyncio as clientwave_async

async def create_opportunity():
    cw = clientwave_async.ClientWave(api_key='your_api_key_here')
    
    opportunity = await cw.opportunities.create(
        title='New Project',
        client_id='cli_12345',
        estimated_value=5000
    )
    
    return opportunity

# Run the async function
opportunity = asyncio.run(create_opportunity())
```

## PHP SDK

### Installation
```bash
composer require clientwave/clientwave-php
```

### Initialization
```php
<?php
require_once 'vendor/autoload.php';

use ClientWave\ClientWave;

$cw = new ClientWave([
    'api_key' => 'your_api_key_here',
    'base_uri' => 'https://api.clientwave.app/v1', // Optional
    'timeout' => 30 // Optional, request timeout in seconds
]);
```

### Usage Examples

#### Working with Opportunities
```php
// Create a new opportunity
$opportunity = $cw->opportunities()->create([
    'title' => 'New Roof Installation',
    'client_id' => 'cli_12345',
    'estimated_value' => 15000,
    'description' => 'Complete roof replacement for residential property'
]);

// Get all opportunities
$opportunities = $cw->opportunities()->list(['status' => 'qualified', 'limit' => 10]);

// Update an opportunity
$updatedOpportunity = $cw->opportunities()->update('opp_12345', [
    'status' => 'proposed',
    'estimated_value' => 16000
]);
```

#### Working with Clients
```php
// Create a new client
$client = $cw->clients()->create([
    'name' => 'Smith Construction',
    'email' => 'contact@smithconstruction.com',
    'phone' => '+15551234567',
    'address' => [
        'street' => '123 Main St',
        'city' => 'San Diego',
        'state' => 'CA',
        'zip' => '92101',
        'country' => 'US'
    ]
]);
```

### Error Handling
```php
use ClientWave\Exception\ClientWaveException;

try {
    $opportunity = $cw->opportunities()->create([
        'title' => 'New Project',
        'client_id' => 'cli_12345'
    ]);
} catch (ClientWaveException $e) {
    echo "ClientWave Error: " . $e->getMessage() . "\n";
    echo "Error Code: " . $e->getCode() . "\n";
    echo "HTTP Status: " . $e->getHttpStatusCode() . "\n";
} catch (Exception $e) {
    echo "Unexpected error: " . $e->getMessage() . "\n";
}
```

## Ruby SDK

### Installation
```bash
gem install clientwave
```

### Initialization
```ruby
require 'clientwave'

cw = ClientWave::Client.new(
  api_key: 'your_api_key_here',
  base_url: 'https://api.clientwave.app/v1', # Optional
  timeout: 30 # Optional, request timeout in seconds
)
```

### Usage Examples

#### Working with Opportunities
```ruby
# Create a new opportunity
opportunity = cw.opportunities.create(
  title: 'New Roof Installation',
  client_id: 'cli_12345',
  estimated_value: 15000,
  description: 'Complete roof replacement for residential property'
)

# Get all opportunities
opportunities = cw.opportunities.list(status: 'qualified', limit: 10)

# Update an opportunity
updated_opportunity = cw.opportunities.update(
  'opp_12345',
  status: 'proposed',
  estimated_value: 16000
)
```

### Error Handling
```ruby
begin
  opportunity = cw.opportunities.create(
    title: 'New Project',
    client_id: 'cli_12345'
  )
rescue ClientWave::ClientWaveError => e
  puts "ClientWave Error: #{e.message}"
  puts "Error Code: #{e.code}"
  puts "HTTP Status: #{e.http_status}"
rescue StandardError => e
  puts "Unexpected error: #{e.message}"
end
```

## Java SDK

### Installation (Maven)
```xml
<dependency>
  <groupId>com.clientwave</groupId>
  <artifactId>clientwave-java-sdk</artifactId>
  <version>1.0.0</version>
</dependency>
```

### Installation (Gradle)
```gradle
implementation 'com.clientwave:clientwave-java-sdk:1.0.0'
```

### Initialization
```java
import com.clientwave.ClientWave;
import com.clientwave.config.ClientWaveConfig;

ClientWaveConfig config = ClientWaveConfig.builder()
    .apiKey("your_api_key_here")
    .baseUrl("https://api.clientwave.app/v1") // Optional
    .timeout(30) // Optional, request timeout in seconds
    .build();

ClientWave cw = new ClientWave(config);
```

### Usage Examples

#### Working with Opportunities
```java
// Create a new opportunity
Opportunity opportunity = cw.opportunities().create(OpportunityCreateRequest.builder()
    .title("New Roof Installation")
    .clientId("cli_12345")
    .estimatedValue(BigDecimal.valueOf(15000))
    .description("Complete roof replacement for residential property")
    .build());

// Get all opportunities
OpportunityListResponse opportunities = cw.opportunities().list(ListOpportunitiesRequest.builder()
    .status(OpportunityStatus.QUALIFIED)
    .limit(10)
    .build());
```

### Error Handling
```java
try {
    Opportunity opportunity = cw.opportunities().create(OpportunityCreateRequest.builder()
        .title("New Project")
        .clientId("cli_12345")
        .build());
} catch (ClientWaveException e) {
    System.out.println("ClientWave Error: " + e.getMessage());
    System.out.println("Error Code: " + e.getCode());
    System.out.println("HTTP Status: " + e.getStatusCode());
} catch (Exception e) {
    System.out.println("Unexpected error: " + e.getMessage());
}
```

## C# SDK

### Installation (NuGet)
```bash
Install-Package ClientWave.SDK
```

### Initialization
```csharp
using ClientWave;

var config = new ClientWaveConfig
{
    ApiKey = "your_api_key_here",
    BaseUrl = "https://api.clientwave.app/v1", // Optional
    Timeout = TimeSpan.FromSeconds(30) // Optional
};

var cw = new ClientWaveClient(config);
```

### Usage Examples

#### Working with Opportunities
```csharp
// Create a new opportunity
var opportunity = await cw.Opportunities.CreateAsync(new OpportunityCreateRequest
{
    Title = "New Roof Installation",
    ClientId = "cli_12345",
    EstimatedValue = 15000,
    Description = "Complete roof replacement for residential property"
});

// Get all opportunities
var opportunities = await cw.Opportunities.ListAsync(new ListOpportunitiesRequest
{
    Status = OpportunityStatus.Qualified,
    Limit = 10
});
```

### Error Handling
```csharp
try
{
    var opportunity = await cw.Opportunities.CreateAsync(new OpportunityCreateRequest
    {
        Title = "New Project",
        ClientId = "cli_12345"
    });
}
catch (ClientWaveException ex)
{
    Console.WriteLine($"ClientWave Error: {ex.Message}");
    Console.WriteLine($"Error Code: {ex.Code}");
    Console.WriteLine($"HTTP Status: {ex.StatusCode}");
}
catch (Exception ex)
{
    Console.WriteLine($"Unexpected error: {ex.Message}");
}
```

## Advanced Features

### Custom HTTP Clients
Most SDKs allow you to provide custom HTTP clients for advanced configuration:

```javascript
// JavaScript - Custom axios instance
import axios from 'axios';

const customAxios = axios.create({
  timeout: 60000,
  headers: {
    'User-Agent': 'MyApp/1.0'
  }
});

const clientWave = new ClientWave({
  apiKey: process.env.CLIENTWAVE_API_KEY,
  httpClient: customAxios
});
```

### Request Interceptors
```javascript
// Add authentication header to all requests
clientWave.httpClient.interceptors.request.use(
  (config) => {
    config.headers.Authorization = `Bearer ${process.env.API_TOKEN}`;
    return config;
  },
  (error) => Promise.reject(error)
);
```

### Response Interceptors
```javascript
// Log all responses
clientWave.httpClient.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.data);
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data);
    return Promise.reject(error);
  }
);
```

## Migration Guides

### Upgrading SDK Versions
When upgrading SDKs, check the changelog for breaking changes. Most SDKs follow semantic versioning, so minor version upgrades should be backward compatible.

### Legacy API Migration
If migrating from a legacy API, use the SDK's compatibility layer if available, or gradually migrate functionality to use the new SDK methods.

## Support

For questions about SDKs, consult our [FAQ](./faq.md) or contact support at [support@clientwave.app](mailto:support@clientwave.app).