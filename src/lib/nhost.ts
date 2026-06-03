const subdomain = import.meta.env.VITE_NHOST_SUBDOMAIN;
const region = import.meta.env.VITE_NHOST_REGION;

export const isNhostConfigured = Boolean(subdomain && region);

export const nhostEnv = {
  subdomain: subdomain ?? "",
  region: region ?? "",
};
