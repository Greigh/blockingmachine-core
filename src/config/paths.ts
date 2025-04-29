import { join } from 'path';

export interface PathsConfig {
  input: {
    dir: string;
    personalList: string;
    thirdPartyFilters: string;
  };
  logs: {
    dir: string;
    processing: string;
  };
  output: {
    dir: string;
    adguardDns: string;
    adguardBrowser: string;
    browserRules: string;
    hosts: string;
    dnsmasq: string;
    bind: string;
    unbound: string;
    privoxy: string;
    shadowrocket: string;
  };
}

export function createPaths(baseDir: string): PathsConfig {
  const filtersDir = join(baseDir, 'filters');
  
  return {
    input: {
      dir: join(filtersDir, 'input'),
      personalList: join(filtersDir, 'input', 'personal_list.txt'),
      thirdPartyFilters: join(filtersDir, 'input', 'thirdPartyFilters.txt'),
    },
    logs: {
      dir: join(baseDir, 'logs'),
      processing: join(baseDir, 'logs', 'processing-errors.json'),
    },
    output: {
      dir: join(filtersDir, 'output'),
      adguardDns: join(filtersDir, 'output', 'adguardDns.txt'),
      adguardBrowser: join(filtersDir, 'output', 'adguardBrowser.txt'),
      browserRules: join(filtersDir, 'output', 'genericBrowserRules.txt'),
      hosts: join(filtersDir, 'output', 'hosts.txt'),
      dnsmasq: join(filtersDir, 'output', 'dnsmasq.conf'),
      bind: join(filtersDir, 'output', 'named.conf'),
      unbound: join(filtersDir, 'output', 'unbound.conf'),
      privoxy: join(filtersDir, 'output', 'privoxy.action'),
      shadowrocket: join(filtersDir, 'output', 'shadowrocket.conf'),
    },
  };
}