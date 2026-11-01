import { figue } from 'figue';

export const config = figue({
  app: {
    version: {
      doc: 'Application current version',
      format: 'string',
      default: '0.0.0',
      env: 'PACKAGE_VERSION',
    },
    lastCommitSha: {
      doc: 'Application last commit SHA version',
      format: 'string',
      default: '',
      env: 'VITE_VERCEL_GIT_COMMIT_SHA',
    },
    baseUrl: {
      doc: 'Application base url',
      format: 'string',
      default: '/',
      env: 'BASE_URL',
    },
    env: {
      doc: 'Application current env',
      format: 'enum',
      values: ['production', 'development', 'preview', 'test'],
      default: 'development',
      env: 'VITE_VERCEL_ENV',
    },
  },
  plausible: {
    isTrackerEnabled: {
      doc: 'Is the tracker enabled',
      format: 'boolean',
      default: false,
      env: 'VITE_TRACKER_ENABLED',
    },
    domain: {
      doc: 'Plausible current domain',
      format: 'string',
      default: '',
      env: 'VITE_PLAUSIBLE_DOMAIN',
    },
    apiHost: {
      doc: 'Plausible remote api host',
      format: 'string',
      default: '',
      env: 'VITE_PLAUSIBLE_API_HOST',
    },
    trackLocalhost: {
      doc: 'Enable or disable localhost tracking by plausible',
      format: 'boolean',
      default: false,
    },
  },
  showBanner: {
    doc: 'Show the banner',
    format: 'boolean',
    default: false,
    env: 'VITE_SHOW_BANNER',
  },
  showSponsorBanner: {
    doc: 'Show the sponsor banner',
    format: 'boolean',
    default: false,
    env: 'VITE_SHOW_SPONSOR_BANNER',
  },
  googleAds: {
    enabled: {
      doc: 'Enable Google Ads',
      format: 'boolean',
      default: true,
      env: 'VITE_GOOGLE_ADS_ENABLED',
    },
    client: {
      doc: 'Google AdSense Client ID',
      format: 'string',
      default: 'ca-pub-2658825517759002',
      env: 'VITE_GOOGLE_ADS_CLIENT',
    },
    toolPageSlot: {
      doc: 'Google AdSense Slot ID for Tool Page Bottom',
      format: 'string',
      default: '',
      env: 'VITE_GOOGLE_ADS_TOOL_SLOT',
    },
    homePageSlot: {
      doc: 'Google AdSense Slot ID for Home Page',
      format: 'string',
      default: '',
      env: 'VITE_GOOGLE_ADS_HOME_SLOT',
    },
  },
})
  .loadEnv({
    ...import.meta.env,
    // Because the string 'import.meta.env.PACKAGE_VERSION' is statically replaced during build time (see 'define' in vite.config.ts)
    PACKAGE_VERSION: import.meta.env.PACKAGE_VERSION,
  })
  .validate()
  .getConfig();
