const path = require('path');

// Load environment from repository .env (adjust path as needed)
const dotenv = require('dotenv');
const fs = require('fs');

// Optionally force loading the repository .env and override existing env vars
const forceEnv = process.argv.includes('--force-env') || process.env.FORCE_ENV === 'true';
const envPath = path.resolve(__dirname, '../.env');
if (forceEnv) {
  console.log('Forcing load of .env (override=true) from', envPath);
  dotenv.config({ path: envPath, override: true });
} else {
  dotenv.config({ path: envPath });
}

// Diagnostic: print whether SMTP env vars are present (mask sensitive values)
const mask = (v) => (v ? v.replace(/.(?=.{4})/g, '*') : v);
console.log('SMTP_HOST=', process.env.SMTP_HOST || '<not set>');
console.log('SMTP_PORT=', process.env.SMTP_PORT || '<not set>');
console.log('SMTP_USER=', process.env.SMTP_USER ? mask(process.env.SMTP_USER) : '<not set>');
console.log('SMTP_PASS set=', process.env.SMTP_PASS ? 'yes' : 'no');
console.log('SMTP_USER contains "your-"?', process.env.SMTP_USER ? String(process.env.SMTP_USER).includes('your-') : 'n/a');
console.log('SMTP_PASS contains "your-"?', process.env.SMTP_PASS ? String(process.env.SMTP_PASS).includes('your-') : 'n/a');

// Require the project's email service which will initialize based on process.env
const emailService = require('../src/services/email.service');

(async () => {
  try {
    // Recipient priority: CLI arg > TEST_TO env var > SMTP_USER env var
    const cliArg = process.argv[2];
    const to = cliArg || process.env.TEST_TO || process.env.SMTP_USER;
    if (!to) {
      console.error('No recipient specified. Provide as CLI arg or set TEST_TO or SMTP_USER in .env');
      process.exit(2);
    }
    console.log('Using recipient:', to);
    const invitationData = {
      groupName: 'Local Test Group',
      inviterName: 'Dev Test',
      invitationLink: 'https://example.com/accept?token=testtoken'
    };

    console.log('Test: sending invitation email to', to);
  // Provide both full name and handle for clearer recipient-facing formatting
  invitationData.inviterFullName = invitationData.inviterFullName || 'Local Tester';
  invitationData.inviterHandle = invitationData.inviterHandle || 'local-tester';
  const result = await emailService.sendInvitationEmail(to, invitationData);
    console.log('Test send result:', result);
    process.exit(0);
  } catch (err) {
    console.error('Test send failed:', err);
    process.exit(1);
  }
})();
