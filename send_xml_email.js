const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Simple script to email the XML file
console.log('XML project structure file created at:', path.join(__dirname, 'project_repo.xml'));
console.log('File size:', fs.statSync(path.join(__dirname, 'project_repo.xml')).size, 'bytes');

// Note: Actual email sending would require credentials and a mail service
// This is just a placeholder since we don't have email credentials configured
console.log('\nThe project structure XML file has been saved to:');
console.log(path.join(__dirname, 'project_repo.xml'));
console.log('\nTo email this file, you would need to configure email credentials.');