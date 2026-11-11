import test from 'node:test';
import assert from 'node:assert/strict';
import {validateDeployEnvironment} from './verify-deploy-env.mjs';
const good = {VITE_SUPABASE_URL:'https://yqmcafgnryvsrvalbycz.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_example_public_key_123456'};
test('accepts authorised project and public key',()=>assert.deepEqual(validateDeployEnvironment(good),[]));
test('rejects an unrelated project and credential-bearing URLs',()=>{
  for(const url of ['https://other.supabase.co','http://yqmcafgnryvsrvalbycz.supabase.co','https://name:password@yqmcafgnryvsrvalbycz.supabase.co','https://yqmcafgnryvsrvalbycz.supabase.co/?token=example']) assert.ok(validateDeployEnvironment({...good,VITE_SUPABASE_URL:url}).length);
});
test('rejects absent or secret browser key without revealing it',()=>{
  const secret='sb_secret_do_not_print_this_value';
  const errors=validateDeployEnvironment({...good,VITE_SUPABASE_PUBLISHABLE_KEY:secret});
  assert.ok(errors.length); assert.equal(errors.join('\n').includes(secret),false);
  assert.ok(validateDeployEnvironment({...good,VITE_SUPABASE_PUBLISHABLE_KEY:''}).length);
});
test('rejects service JWT under a misleading VITE variable',()=>{
  const payload=Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url');
  const token=`e30.${payload}.example_signature`;
  const errors=validateDeployEnvironment({...good,VITE_MISC:token});
  assert.ok(errors.length);assert.equal(errors.join('\n').includes(token),false);
});
test('rejects privileged browser variable names but permits server-only secrets',()=>{
  assert.ok(validateDeployEnvironment({...good,VITE_SERVICE_ROLE_KEY:'example'}).length);
  assert.ok(validateDeployEnvironment({...good,VITE_DATABASE_URL:'example'}).length);
  assert.deepEqual(validateDeployEnvironment({...good,SUPABASE_SECRET_KEY:'server-only-example'}),[]);
});
