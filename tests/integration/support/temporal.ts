export const temporalAddress = process.env.TEMPORAL_ADDRESS ?? '127.0.0.1:7233';
export async function temporalHealth() { const response = await fetch(`http://${temporalAddress}/health`); return response.ok; }
