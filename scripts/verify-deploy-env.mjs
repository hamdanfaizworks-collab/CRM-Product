import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadEnv} from 'vite';

const expectedOrigin = 'https://yqmcafgnryvsrvalbycz.supabase.co';
function privilegedJwt(value) {
  const token = String(value || '').replace(/^Bearer\s+/i, '');
  if (token.split('.').length !== 3) return false;
  try {
    const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return ['service_role', 'supabase_admin'].includes(claims.role);
  } catch { return false; }
}

export function validateDeployEnvironment(env) {
  const errors = [];
  const rawUrl = String(env.VITE_SUPABASE_URL || '').trim();
  try {
    const url = new URL(rawUrl);
    if (url.origin !== expectedOrigin || !['','/'].includes(url.pathname) || url.search || url.hash || url.username || url.password) errors.push('VITE_SUPABASE_URL must point to the authorised TTM Supabase project over HTTPS.');
  } catch { errors.push('VITE_SUPABASE_URL is required and must be a valid HTTPS URL.'); }
  const key = String(env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim();
  if (!/^sb_publishable_[A-Za-z0-9_-]{16,500}$/.test(key)) errors.push('VITE_SUPABASE_PUBLISHABLE_KEY must contain a modern publishable key.');
  for (const [name, value] of Object.entries(env)) {
    if (!name.startsWith('VITE_')) continue;
    if (/(?:SECRET|SERVICE_ROLE|SERVICE_KEY|PRIVATE_KEY|ACCESS_TOKEN|DATABASE_URL|DB_PASSWORD)/i.test(name) || /^\s*sb_secret_/i.test(String(value)) || privilegedJwt(value)) {
      errors.push(`${name}: privileged credentials are forbidden in browser build variables.`);
    }
  }
  return [...new Set(errors)];
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    // Same file precedence as a Vite production build; existing process variables win.
    const env = {...loadEnv('production', process.cwd(), ''), ...process.env};
    const errors = validateDeployEnvironment(env);
    if (errors.length) {
      console.error('Hostinger deployment environment validation failed:');
      for (const error of errors) console.error(`- ${error}`);
      process.exitCode = 1;
    } else console.log('Hostinger deployment environment validated: authorised project and public browser configuration.');
  } catch {
    console.error('Hostinger deployment environment could not be read. Check local environment file syntax and installed dependencies.');
    process.exitCode = 1;
  }
}
