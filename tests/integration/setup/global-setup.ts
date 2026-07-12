import { setIntegrationEnvDefaults } from './env-defaults';
import teardown from './global-teardown';
import { waitForServices } from './wait-for-services';
export default async function globalSetup() {
  setIntegrationEnvDefaults();
  if (process.env.RUN_INTEGRATION === '1') await waitForServices();
  return teardown;
}
