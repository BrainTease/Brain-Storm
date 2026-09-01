import { readFileSync, writeFileSync } from 'fs';

const files = [
  'apps/backend/src/health/health.controller.ts',
  'apps/backend/src/kyc/kyc.service.ts',
  'apps/backend/src/leaderboard/redis-leaderboard.service.ts',
  'apps/backend/src/notifications/notifications.service.ts',
  'apps/backend/src/payouts/payouts.service.ts',
  'apps/backend/src/stellar/network-monitor.service.ts',
  'apps/backend/src/stellar/soroban-rpc-client.service.ts',
  'apps/backend/src/stellar/stellar.service.soroban-spec.ts',
  'apps/backend/src/stellar/stellar.service.ts',
];

function fixFile(filePath) {
  let content = readFileSync(filePath, 'utf8');

  // Fix: } catch (err) {  ->  } catch (err) { + add type check when using err
  // Fix: } catch (error) { ->  } catch (error: unknown) {

  // Pattern 1: catch (err) { ... err.message ...
  content = content.replace(
    /\} catch \((err|error)\) \{(\s*)([^}]*?)(err|error)\.message/g,
    '} catch ($1: unknown) {$2$3($1 instanceof Error ? $1.message : String($1))'
  );

  // Pattern 2: catch (err) { ... err ...
  content = content.replace(
    /\} catch \((err|error)\) \{(\s*)([^}]*?)(err|error)\./g,
    '} catch ($1: unknown) {$2$3($1 instanceof Error ? $1 : $1)'
  );

  // Pattern 3: catch (err) { ... } where err is not used with .message
  content = content.replace(
    /\} catch \((err|error)\) \{(?!.*\b(err|error)\b)/g,
    '} catch ($1: unknown) {'
  );

  writeFileSync(filePath, content);
  console.log(`Fixed: ${filePath}`);
}

for (const file of files) {
  fixFile(file);
}

console.log('Done');
