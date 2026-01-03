// Script to generate bcrypt hash for admin password
// Run with: node scripts/generate-hash.js

const bcrypt = require('bcryptjs');

const password = process.argv[2] || 'admin123';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
        console.error('Error:', err);
        process.exit(1);
    }
    console.log('\n=== Password Hash Generator ===\n');
    console.log('Password:', password);
    console.log('Hash:', hash);
    console.log('\nUse this hash in your Supabase SQL:\n');
    console.log(`UPDATE users SET password_hash = '${hash}' WHERE email = 'admin@company.com';`);
    console.log('');
});
