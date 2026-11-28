import { XboxConnectionConfig } from '../types/xbox';
import { INITIAL_CONFIG } from './mockXboxData';

export interface SavedProfile {
  id: string;
  name: string;
  updatedAt: string;
  config: XboxConnectionConfig;
}

const STORAGE_KEY_PROFILES = 'xbox_gdk_linux_saved_profiles_v1';
const STORAGE_KEY_ACTIVE_PROFILE = 'xbox_gdk_linux_active_profile_id';
const STORAGE_KEY_AUTO_CONNECT = 'xbox_gdk_linux_auto_connect';

export const DEFAULT_PROFILES: SavedProfile[] = [
  {
    id: 'prof-scarlett-lab',
    name: 'Series X DevKit (Scarlett Lab) [0x4001]',
    updatedAt: new Date().toISOString(),
    config: {
      ...INITIAL_CONFIG,
      ip: '192.168.1.100',
      user: 'DevToolsUser',
      password: 'w^&_zG0W_(5p)0',
      machineName: 'XDK-SERIESX-LAB01',
      devkitModel: 'Series X (Scarlett)',
      deviceId: '04829103-6281-4239-A193-8B391D92801F',
      hardwareMode: 'DevKit',
      modeCode: '4001',
      hexCode: '0x4001',
      serialNumber: '129840291048',
      consoleId: '02-4820-9104-2918',
      motherboardRev: 'Scarlett SOC Rev 1.2',
      securityFuses: 'Production Fused (0x0F) DevKit Override',
      port: '11443',
      debugPort: '11443',
      ftpPort: '21',
      smbPort: '445',
    },
  },
  {
    id: 'prof-lockhart-qa',
    name: 'Series S TestKit (Lockhart QA) [0x6001]',
    updatedAt: new Date().toISOString(),
    config: {
      ...INITIAL_CONFIG,
      ip: '192.168.1.105',
      machineName: 'XDK-SERIESS-QA02',
      devkitModel: 'Series S (Lockhart)',
      deviceId: '71038291-1192-4918-B204-1C283F91024E',
      hardwareMode: 'TestKit',
      modeCode: '6001',
      hexCode: '0x6001',
      serialNumber: '129840291992',
      consoleId: '02-4820-9104-7714',
      motherboardRev: 'Lockhart SOC Rev 1.1',
      securityFuses: 'Test Signing Whitelist (0x6001)',
      port: '11443',
      debugPort: '11443',
      ftpPort: '21',
      smbPort: '445',
    },
  },
  {
    id: 'prof-custom-devkit',
    name: 'Retail Console Sandbox [0x2001]',
    updatedAt: new Date().toISOString(),
    config: {
      ...INITIAL_CONFIG,
      ip: '192.168.1.150',
      machineName: 'XBOX-DEVMODE-RETAIL',
      devkitModel: 'Custom XDK',
      sandboxId: 'RETAIL',
      deviceId: '93810294-8172-4019-C829-5D193A82910B',
      hardwareMode: 'Retail',
      modeCode: '2001',
      hexCode: '0x2001',
      serialNumber: '129840293301',
      consoleId: '02-4820-9104-3301',
      motherboardRev: 'Scarlett SOC Rev 1.0',
      securityFuses: 'Production Fuses Blown (0x2001)',
      port: '11443',
      debugPort: '11443',
      ftpPort: '21',
      smbPort: '445',
    },
  },
];

export function loadSavedProfiles(): SavedProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let didMigrate = false;
        const mapped = parsed.map((p) => {
          const cfg = p.config || {};
          const modeCode = cfg.modeCode || INITIAL_CONFIG.modeCode;
          const hexCode = cfg.hexCode || `0x${modeCode}`;
          const hardwareMode = cfg.hardwareMode || (
            modeCode === '2001' ? 'Retail' :
            modeCode === '6001' ? 'TestKit' :
            modeCode === '8001' ? 'Manufacturing' :
            modeCode === '0001' ? 'SafeMode' : 'DevKit'
          );

          const mergedGroups = Array.isArray(cfg.localGroups) && cfg.localGroups.length > 0
            ? [
                ...cfg.localGroups,
                ...(INITIAL_CONFIG.localGroups || []).filter(
                  (ig) => !cfg.localGroups.some((cg: any) => cg.id === ig.id || cg.name === ig.name)
                ),
              ]
            : INITIAL_CONFIG.localGroups || [];

          const rawUsers = Array.isArray(cfg.localUsers) && cfg.localUsers.length > 0
            ? cfg.localUsers
            : INITIAL_CONFIG.localUsers || [];

          const normalizedUsers = rawUsers.map((u: any) => {
            const memberGroups = mergedGroups.filter((g: any) =>
              (Array.isArray(u.groups) && u.groups.includes(g.name)) ||
              (Array.isArray(u.groupIds) && (u.groupIds.includes(g.sid) || u.groupIds.includes(g.id))) ||
              (Array.isArray(g.members) && g.members.some((m: string) => m.toLowerCase() === String(u.username || '').toLowerCase()))
            );
            const names = Array.from(new Set([...(Array.isArray(u.groups) ? u.groups : []), ...memberGroups.map((g: any) => g.name)]));
            const ids = Array.from(new Set([...(Array.isArray(u.groupIds) ? u.groupIds : []), ...memberGroups.map((g: any) => g.sid)]));
            return { ...u, groups: names, groupIds: ids };
          });

          const currentUsername = cfg.username;
          const resolvedUsername = currentUsername && currentUsername !== 'DevUser' ? currentUsername : INITIAL_CONFIG.username;
          if (!currentUsername || currentUsername === 'DevUser') {
            didMigrate = true;
          }

          return {
            ...p,
            config: {
              ...INITIAL_CONFIG,
              ...cfg,
              deviceId: cfg.deviceId || INITIAL_CONFIG.deviceId,
              hardwareMode,
              modeCode,
              hexCode,
              serialNumber: cfg.serialNumber || INITIAL_CONFIG.serialNumber,
              consoleId: cfg.consoleId || INITIAL_CONFIG.consoleId,
              motherboardRev: cfg.motherboardRev || INITIAL_CONFIG.motherboardRev,
              securityFuses: cfg.securityFuses || INITIAL_CONFIG.securityFuses,
              customPorts: cfg.customPorts && cfg.customPorts.length > 0
                ? cfg.customPorts
                : INITIAL_CONFIG.customPorts,
              localGroups: mergedGroups,
              localUsers: normalizedUsers,
              username: resolvedUsername,
            },
          };
        });
        if (didMigrate) {
          saveProfiles(mapped);
        }
        return mapped;
      }
    }
  } catch (e) {
    console.warn('Failed to read saved profiles from localStorage:', e);
  }
  // Initialize default profiles
  saveProfiles(DEFAULT_PROFILES);
  return DEFAULT_PROFILES;
}

export function saveProfiles(profiles: SavedProfile[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
  } catch (e) {
    console.error('Failed to save profiles to localStorage:', e);
  }
}

export function getActiveProfileId(): string {
  try {
    const active = localStorage.getItem(STORAGE_KEY_ACTIVE_PROFILE);
    if (active && active !== 'prof-custom-devkit') return active;
  } catch (e) {
    // Ignore error
  }
  return DEFAULT_PROFILES[0].id;
}

export function setActiveProfileId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_PROFILE, id);
  } catch (e) {
    // Ignore error
  }
}

export function saveCurrentConfigToActiveProfile(config: XboxConnectionConfig, activeProfileId: string): SavedProfile[] {
  const profiles = loadSavedProfiles();
  const index = profiles.findIndex((p) => p.id === activeProfileId);
  const now = new Date().toISOString();

  if (index >= 0) {
    profiles[index] = {
      ...profiles[index],
      updatedAt: now,
      config: { ...config },
    };
  } else {
    // Create new profile with this config
    profiles.push({
      id: activeProfileId,
      name: config.machineName || 'Custom Xbox Profile',
      updatedAt: now,
      config: { ...config },
    });
  }

  saveProfiles(profiles);
  return profiles;
}

export function createNewProfile(name: string, templateConfig?: XboxConnectionConfig): SavedProfile {
  const profiles = loadSavedProfiles();
  const newId = `prof-${Date.now()}`;
  const newProfile: SavedProfile = {
    id: newId,
    name,
    updatedAt: new Date().toISOString(),
    config: templateConfig ? { ...templateConfig } : { ...INITIAL_CONFIG, machineName: name },
  };
  profiles.push(newProfile);
  saveProfiles(profiles);
  setActiveProfileId(newId);
  return newProfile;
}

export function deleteProfile(id: string): SavedProfile[] {
  let profiles = loadSavedProfiles();
  if (profiles.length <= 1) {
    throw new Error('Cannot delete the last remaining connection profile.');
  }
  profiles = profiles.filter((p) => p.id !== id);
  saveProfiles(profiles);
  return profiles;
}

export function exportSettingsAsJson(profiles: SavedProfile[], activeId: string): string {
  const exportPayload = {
    appName: 'Xbox GDK Linux Studio',
    version: '1.2.0',
    exportedAt: new Date().toISOString(),
    activeProfileId: activeId,
    profiles,
    linuxCliConfig: {
      ip: profiles.find((p) => p.id === activeId)?.config.ip || '192.168.1.100',
      port: profiles.find((p) => p.id === activeId)?.config.port || '11443',
      debug_port: profiles.find((p) => p.id === activeId)?.config.debugPort || '11443',
      ftp_port: profiles.find((p) => p.id === activeId)?.config.ftpPort || '21',
      user: profiles.find((p) => p.id === activeId)?.config.username || 'admin',
      password: profiles.find((p) => p.id === activeId)?.config.password || 'password',
    },
  };
  return JSON.stringify(exportPayload, null, 2);
}

export function importSettingsFromJson(jsonString: string): { profiles: SavedProfile[]; activeId: string } {
  const data = JSON.parse(jsonString);
  if (!data || !Array.isArray(data.profiles) || data.profiles.length === 0) {
    throw new Error('Invalid settings JSON format: missing profiles array.');
  }
  saveProfiles(data.profiles);
  const activeId = data.activeProfileId || data.profiles[0].id;
  setActiveProfileId(activeId);
  return { profiles: data.profiles, activeId };
}
