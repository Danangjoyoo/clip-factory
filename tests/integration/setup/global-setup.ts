import { waitForServices } from './wait-for-services';
export default async function globalSetup() { if (process.env.RUN_INTEGRATION === '1') await waitForServices(); }
