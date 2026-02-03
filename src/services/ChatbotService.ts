// Simple chatbot service for handling basic queries
class ChatbotService {
  // Knowledge base for responses
  private knowledgeBase = {
    greetings: ['hello', 'hi', 'hey', 'greetings'],
    invoices: ['invoice', 'billing', 'payment', 'bill', 'charges', 'money'],
    opportunities: ['opportunity', 'deal', 'sales', 'prospect', 'lead', 'pipeline'],
    proposals: ['proposal', 'quote', 'estimate', 'offer'],
    contracts: ['contract', 'agreement', 'signature', 'sign'],
    help: ['help', 'support', 'assist', 'guide', 'tutorial'],
    features: ['feature', 'function', 'capability', 'what can you do', 'how to'],
    pricing: ['price', 'cost', 'pricing', 'plan', 'subscription', 'monthly', 'yearly']
  };

  // Responses based on category
  private responses = {
    greeting: [
      'Hello! I\'m your ClientWave assistant. How can I help you today?',
      'Hi there! I\'m here to help with your ClientWave questions.',
      'Greetings! What would you like to know about ClientWave?'
    ],
    invoice: [
      'I can help with invoices! You can create, send, and track invoices through your dashboard. Would you like to know more about any specific invoice feature?',
      'Invoices are managed in the billing section. You can create templates, set recurring invoices, and track payments.',
      'For invoicing, you can create professional invoices, customize templates, and send them directly to clients.'
    ],
    opportunity: [
      'Opportunities are tracked in your sales pipeline. You can create new opportunities, track their progress, and analyze your sales performance.',
      'Sales opportunities help you manage your pipeline from initial contact to closed deal.',
      'You can track opportunity value, probability, and stage in the CRM section.'
    ],
    proposal: [
      'We have tools for creating professional proposals. You can customize templates and send them to clients.',
      'Proposals can be created from opportunities and sent to clients for review.',
      'Our proposal system allows you to create beautiful, persuasive documents to win business.'
    ],
    contract: [
      'Contracts can be created and sent for e-signature. You can track the status of all your agreements.',
      'Our contract system supports electronic signatures and document management.',
      'You can create contracts from proposals or opportunities and manage them in one place.'
    ],
    help: [
      'I\'m here to help! You can ask me about invoices, opportunities, proposals, contracts, or any other ClientWave features.',
      'Feel free to ask about any specific feature you\'d like to know more about.',
      'I can provide information about how to use different parts of ClientWave.'
    ],
    feature: [
      'ClientWave offers comprehensive tools for managing clients, opportunities, invoices, proposals, and contracts. What specific feature would you like to learn about?',
      'We provide a complete business management solution. Is there a particular area you\'d like to focus on?',
      'Our platform includes CRM, invoicing, proposal management, and contract tools.'
    ],
    pricing: [
      'For pricing information, please visit our plans page or contact our sales team. We offer various tiers based on your business needs.',
      'Pricing varies by plan and features. You can find detailed pricing information in your account settings.',
      'We offer different pricing tiers to suit businesses of all sizes. Contact us for a personalized quote.'
    ],
    default: [
      'Thanks for your message! I can help you with information about invoices, opportunities, proposals, and contracts. What would you like to know more about?',
      'I\'m here to assist with your ClientWave questions. Could you tell me more specifically what you need help with?',
      'I can provide information about our features. What aspect of ClientWave are you interested in?'
    ]
  };

  // Determine response category based on input
  private determineCategory(input: string): string {
    const lowerInput = input.toLowerCase();

    // Check for greetings first
    if (this.knowledgeBase.greetings.some(greeting => lowerInput.includes(greeting))) {
      return 'greeting';
    }

    // Check for other categories
    if (this.knowledgeBase.invoices.some(term => lowerInput.includes(term))) {
      return 'invoice';
    }
    if (this.knowledgeBase.opportunities.some(term => lowerInput.includes(term))) {
      return 'opportunity';
    }
    if (this.knowledgeBase.proposals.some(term => lowerInput.includes(term))) {
      return 'proposal';
    }
    if (this.knowledgeBase.contracts.some(term => lowerInput.includes(term))) {
      return 'contract';
    }
    if (this.knowledgeBase.help.some(term => lowerInput.includes(term))) {
      return 'help';
    }
    if (this.knowledgeBase.features.some(term => lowerInput.includes(term))) {
      return 'feature';
    }
    if (this.knowledgeBase.pricing.some(term => lowerInput.includes(term))) {
      return 'pricing';
    }

    // Default response
    return 'default';
  }

  // Generate a random response from the category
  public getResponse(input: string): string {
    const category = this.determineCategory(input);
    const responses = this.responses[category as keyof typeof this.responses];
    
    // Select a random response from the category
    const randomIndex = Math.floor(Math.random() * responses.length);
    return responses[randomIndex];
  }
}

export default new ChatbotService();