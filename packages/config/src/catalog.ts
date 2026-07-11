import modelsJson from './model-catalog.json';
import pricingJson from './pricing-catalog.json';
import platformsJson from './platform-catalog.json';
import {
  CatalogSchema,
  PlatformCatalogSchema,
  PricingCatalogSchema,
} from './catalog-schema';

export class CatalogError extends Error {}
const models = CatalogSchema.parse(modelsJson);
const pricing = PricingCatalogSchema.parse(pricingJson);
const platforms = PlatformCatalogSchema.parse(platformsJson);
export const listCompatibleModels = () =>
  models.models.map((model) => ({
    ...model,
    catalogVersion: models.catalogVersion,
  }));
export function getModel(modelId: string) {
  const model = models.models.find((item) => item.id === modelId);
  if (!model) throw new CatalogError(`Unsupported model: ${modelId}`);
  return { ...model, catalogVersion: models.catalogVersion };
}
export const supportsReasoning = (modelId: string, reasoning: string) =>
  getModel(modelId).reasoning.some((profile) => profile.effort === reasoning);
export function getPlatformPreset(id: string) {
  const preset = platforms.presets.find((item) => item.id === id);
  if (!preset) throw new CatalogError(`Unsupported platform preset: ${id}`);
  return preset;
}
export function getPricing(modelId: string, catalogVersion: string) {
  if (pricing.catalogVersion !== catalogVersion)
    throw new CatalogError(`Unsupported pricing catalog: ${catalogVersion}`);
  const rule = pricing.rules.find((item) => item.modelId === modelId);
  if (!rule)
    throw new CatalogError(`Pricing unavailable for model: ${modelId}`);
  return rule;
}
