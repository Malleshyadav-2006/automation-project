import dotenv from 'dotenv';
dotenv.config();
import { runOutreachCycle } from './services/emailService.js';

console.log('Testing outreach cycle...');
runOutreachCycle().then(() => {
  console.log('Done.');
  process.exit(0);
}).catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
