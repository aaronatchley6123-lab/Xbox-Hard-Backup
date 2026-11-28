import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Download, 
  Upload, 
  Plus, 
  Trash2, 
  Copy, 
  Eye, 
  EyeOff, 
  Check, 
  RotateCcw,
  Sliders,
  Shield,
  Server,
  Fingerprint,
  Key,
  Cpu,
  Lock,
  Unlock,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  Calendar,
  Clock,
  Sparkles,
  History,
  Users,
  UserCheck,
  UserPlus,
  UserX,
  UserCog,
  FileText,
  Send,
  Search,
  Zap
} from 'lucide-react';
import { XboxConnectionConfig, ConsoleModel, CustomPortEntry, XboxModeCode, XboxLapsConfig, LapsAuditEntry, XboxLocalUser, XboxLocalGroup } from '../types/xbox';
import { SavedProfile, exportSettingsAsJson, importSettingsFromJson } from '../services/storageService';
import { XBOX_MODES, getModeDetail, INITIAL_LAPS_CONFIG, INITIAL_LAPS_AUDIT_LOGS, generateSecureLapsPassword, INITIAL_LOCAL_USERS, INITIAL_LOCAL_GROUPS } from '../services/mockXboxData';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: XboxConnectionConfig;
  onUpdateConfig: (newConfig: XboxConnectionConfig) => void;
  profiles: SavedProfile[];
  activeProfileId: string;
  onSelectProfile: (id: string) => void;
  onSaveProfile: (config: XboxConnectionConfig, profileId: string) => void;
  onCreateProfile: (name: string, template?: XboxConnectionConfig) => void;
  onDeleteProfile: (id: string) => void;
  onImportProfiles: (importedProfiles: SavedProfile[], activeId: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  profiles,
  activeProfileId,
  onSelectProfile,
  onSaveProfile,
  onCreateProfile,
  onDeleteProfile,
  onImportProfiles,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const [isAddingCustomPort, setIsAddingCustomPort] = useState(false);
  const [newPortName, setNewPortName] = useState('');
  const [newPortNumber, setNewPortNumber] = useState('');
  const [newPortProto, setNewPortProto] = useState<'TCP' | 'UDP'>('TCP');
  const [newPortDesc, setNewPortDesc] = useState('');
  const [newPortType, setNewPortType] = useState<CustomPortEntry['serviceType']>('Profiler');
  const [probingPortId, setProbingPortId] = useState<string | null>(null);

  // Local draft state
  // Local draft state
  const [draftConfig, setDraftConfig] = useState<XboxConnectionConfig>({
    ...config,
    lapsConfig: config.lapsConfig || INITIAL_LAPS_CONFIG,
    localUsers: config.localUsers || INITIAL_LOCAL_USERS,
    localGroups: config.localGroups || INITIAL_LOCAL_GROUPS,
  });

  useEffect(() => {
    setDraftConfig({
      ...config,
      lapsConfig: config.lapsConfig || INITIAL_LAPS_CONFIG,
      localUsers: config.localUsers || INITIAL_LOCAL_USERS,
      localGroups: config.localGroups || INITIAL_LOCAL_GROUPS,
    });
    if (config.localUsers) {
      setLocalUsers(config.localUsers);
    }
    if (config.localGroups) {
      setLocalGroups(config.localGroups);
    }
  }, [config, activeProfileId]);

  // Modal active category tab
  const [activeSection, setActiveSection] = useState<'all' | 'connection' | 'modes' | 'ports' | 'signin'>('all');

  // LAPS state
  const [showLapsPassword, setShowLapsPassword] = useState(false);
  const [copiedLapsPassword, setCopiedLapsPassword] = useState(false);
  const [isResettingLaps, setIsResettingLaps] = useState(false);
  const [isUniversalResetting, setIsUniversalResetting] = useState(false);
  const [lapsResetFeedback, setLapsResetFeedback] = useState<string | null>(null);
  const [autoSyncWdpPassword, setAutoSyncWdpPassword] = useState(true);
  const [lapsAuditLogs, setLapsAuditLogs] = useState<LapsAuditEntry[]>(INITIAL_LAPS_AUDIT_LOGS);

  // Local users & groups state
  const [localUsers, setLocalUsers] = useState<XboxLocalUser[]>(config.localUsers || INITIAL_LOCAL_USERS);
  const [localGroups, setLocalGroups] = useState<XboxLocalGroup[]>(config.localGroups || INITIAL_LOCAL_GROUPS);
  const [userManagementView, setUserManagementView] = useState<'users' | 'groups'>('users');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<string | null>(INITIAL_LOCAL_USERS[1]?.id || INITIAL_LOCAL_USERS[0].id);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isAddingLocalUser, setIsAddingLocalUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newUserRole, setNewUserRole] = useState<'Developer' | 'Administrator' | 'Standard' | 'TestGamer'>('Developer');
  const [newUserPass, setNewUserPass] = useState('XboxDev2026!');
  const [newUserDesc, setNewUserDesc] = useState('');
  const [userFeedback, setUserFeedback] = useState<string | null>(null);

  // Employee Reset Modal state (Studio Admin tool)
  const [resetModalUser, setResetModalUser] = useState<XboxLocalUser | null>(null);
  const [tempGeneratedPassword, setTempGeneratedPassword] = useState('XboxDev2026!');
  const [ticketReason, setTicketReason] = useState('IT-HD-74920: WORKGROUP\\DevUser SMB & WDP Logon Reset');
  // Must default to FALSE: Windows/Xbox SMB (srv2.sys) and WDP HTTP Basic Auth reject accounts with PwdLastSet=0 with NT_STATUS_LOGON_FAILURE
  const [requirePasswordChangeNextLogon, setRequirePasswordChangeNextLogon] = useState(false);
  const [unlockAccountOnReset, setUnlockAccountOnReset] = useState(true);
  const [syncSmbDeveloperFolder, setSyncSmbDeveloperFolder] = useState(true);
  // Forgot-Username Protection: Sync the same password across Selected User + DevUser + DevToolsUser + admin + SshUser
  const [syncAllCommonAliases, setSyncAllCommonAliases] = useState(true);
  const [generatedHandoverNote, setGeneratedHandoverNote] = useState<string | null>(null);
  const [copiedHandover, setCopiedHandover] = useState(false);
  const [ntLogonFixStatus, setNtLogonFixStatus] = useState<string | null>(null);
  const [selectedGroupForDetail, setSelectedGroupForDetail] = useState<string | null>(INITIAL_LOCAL_GROUPS[1]?.id || INITIAL_LOCAL_GROUPS[0].id);
  const [groupMemberDrafts, setGroupMemberDrafts] = useState<Record<string, string>>({});
  const [selectedGroupToAdd, setSelectedGroupToAdd] = useState<string>(INITIAL_LOCAL_GROUPS[0].id);
  const [customGroupIdInput, setCustomGroupIdInput] = useState<string>('');

  React.useEffect(() => {
    setDraftConfig({
      ...config,
      lapsConfig: config.lapsConfig || INITIAL_LAPS_CONFIG,
      localUsers: config.localUsers || INITIAL_LOCAL_USERS,
      localGroups: config.localGroups || INITIAL_LOCAL_GROUPS,
    });
    setLocalUsers(config.localUsers || INITIAL_LOCAL_USERS);
    setLocalGroups(config.localGroups || INITIAL_LOCAL_GROUPS);
  }, [config, isOpen]);

  if (!isOpen) return null;

  const handleFieldChange = (field: keyof XboxConnectionConfig, value: any) => {
    setDraftConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleLapsFieldChange = (field: keyof XboxLapsConfig, value: any) => {
    setDraftConfig((prev) => ({
      ...prev,
      lapsConfig: {
        ...(prev.lapsConfig || INITIAL_LAPS_CONFIG),
        [field]: value,
      },
    }));
  };

  // Helper: Get currently selected user object (defaults to active config.username or DevUser, auto-creates if custom)
  const getSelectedUserObj = (): XboxLocalUser => {
    const found = localUsers.find((u) => u.id === selectedUserForDetail);
    if (found) return found;
    const cleanActive = (draftConfig.username || '').replace(/^.*[\\/]/, '').trim();
    if (cleanActive) {
      const byActive = localUsers.find((u) => u.username.toLowerCase() === cleanActive.toLowerCase());
      if (byActive) return byActive;
    }
    return localUsers.find((u) => u.username === 'DevUser') || localUsers[0];
  };

  const commitUsersAndGroups = (nextUsers: XboxLocalUser[], nextGroups: XboxLocalGroup[]) => {
    setLocalUsers(nextUsers);
    setLocalGroups(nextGroups);
    setDraftConfig((prev) => {
      const updated = { ...prev, localUsers: nextUsers, localGroups: nextGroups };
      onUpdateConfig(updated);
      onSaveProfile(updated, activeProfileId);
      return updated;
    });
    if (resetModalUser) {
      const refreshed = nextUsers.find(
        (u) => u.id === resetModalUser.id || u.username.toLowerCase() === resetModalUser.username.toLowerCase()
      );
      if (refreshed) setResetModalUser(refreshed);
    }
  };

  const ensureUserExistsInList = (users: XboxLocalUser[], username: string): XboxLocalUser[] => {
    const clean = username.replace(/^.*[\\/]/, '').trim();
    if (!clean) return users;
    if (users.some((u) => u.username.toLowerCase() === clean.toLowerCase())) return users;
    const newEntry: XboxLocalUser = {
      id: `user-${Date.now()}`,
      username: clean,
      displayName: `${clean} (Active Kit Account)`,
      sid: `S-1-5-21-3948201948-2849102934-104928103-${Math.floor(1100 + Math.random() * 8000)}`,
      role: 'Developer',
      status: 'Active',
      isLapsProtected: false,
      lastLogin: 'Active Session',
      passwordLastSet: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
      description: 'Auto-provisioned active console login account.',
      homeDirectory: `D:\\DevelopmentFiles\\${clean}`,
      privileges: ['SeDebugPrivilege', 'SeBatchLogonRight', 'SeNetworkLogonRight'],
      groups: [],
      groupIds: [],
    };
    return [...users, newEntry];
  };

  // Select a user row and sync targetAccount so LAPS & Reset always act on the SELECTED user
  const handleSelectUserRow = (user: XboxLocalUser) => {
    setSelectedUserForDetail(user.id);
    const cleanUsername = user.username.replace(/^.*[\\/]/, '');
    setDraftConfig((prev) => ({
      ...prev,
      username: cleanUsername,
      lapsConfig: {
        ...(prev.lapsConfig || INITIAL_LAPS_CONFIG),
        targetAccount: cleanUsername,
      },
    }));
  };

  // Studio Admin: Universal LAPS Reset Command (Targets SELECTED user + optional alias sync for forgetful devs)
  const handleUniversalLapsReset = () => {
    setIsUniversalResetting(true);
    setLapsResetFeedback(null);

    setTimeout(() => {
      const selectedObj = getSelectedUserObj();
      const targetUsername = (selectedObj?.username || draftConfig.lapsConfig?.targetAccount || 'DevUser').replace(/^.*[\\/]/, '');
      const currentLaps = draftConfig.lapsConfig || INITIAL_LAPS_CONFIG;
      const newPassword = generateSecureLapsPassword(
        currentLaps.passwordLength,
        currentLaps.requireUppercase,
        currentLaps.requireDigits,
        currentLaps.requireSpecialChars
      );

      const now = new Date();
      const nowFormatted = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
      const expiration = new Date(now.getTime() + currentLaps.rotationIntervalDays * 24 * 60 * 60 * 1000);
      const expirationFormatted = expiration.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

      const updatedLaps: XboxLapsConfig = {
        ...currentLaps,
        targetAccount: targetUsername,
        currentPassword: newPassword,
        expirationDate: expirationFormatted,
        lastRotatedAt: nowFormatted,
        lastRotatedBy: `Universal LAPS Reset (Target: WORKGROUP\\${targetUsername})`,
        status: 'Compliant',
      };

      const aliasNote = syncAllCommonAliases
        ? ` + Alias-Synced [DevUser, DevToolsUser, admin, SshUser]`
        : '';

      const newAudit: LapsAuditEntry = {
        id: `laps-log-${Date.now()}`,
        timestamp: nowFormatted,
        event: 'PasswordReset',
        triggeredBy: 'Universal Reset Command (Selected Account)',
        account: `WORKGROUP\\${targetUsername}${aliasNote}`,
        result: 'Success',
        details: `Universal reset executed for selected account WORKGROUP\\${targetUsername}. PwdMustChange=0 (SMB3/NTLMv2 ready).${syncAllCommonAliases ? ' Password mirrored to DevUser, DevToolsUser, admin & SshUser so developers never fail logon if they forget their username.' : ''}`,
      };

      setLapsAuditLogs((prev) => [newAudit, ...prev]);

      // Update selected user (and fallback alias accounts if syncAllCommonAliases is enabled)
      setLocalUsers((prev) =>
        prev.map((u) => {
          const isTarget = u.username.toLowerCase() === targetUsername.toLowerCase();
          const isCommonAlias = syncAllCommonAliases && ['devuser', 'devtoolsuser', 'administrator', 'sshuser', 'wpdaccessuser'].includes(u.username.toLowerCase());
          if (isTarget || isCommonAlias) {
            return {
              ...u,
              status: isTarget ? 'Active' : u.status === 'Disabled' ? 'Disabled' : 'LapsManaged',
              passwordLastSet: `${nowFormatted} (${isTarget ? 'Selected Target' : 'Alias-Synced'}, PwdMustChange=0)`,
            };
          }
          return u;
        })
      );

      setDraftConfig((prev) => ({
        ...prev,
        username: targetUsername,
        password: autoSyncWdpPassword ? newPassword : prev.password,
        lapsConfig: updatedLaps,
      }));

      setIsUniversalResetting(false);
      setLapsResetFeedback(
        `[RESET SUCCESS FOR WORKGROUP\\${targetUsername}] Rotated selected account "${targetUsername}" (PwdMustChange=0).${
          syncAllCommonAliases ? ' Also synced password across DevUser, DevToolsUser, admin & SshUser for devs who forget their username!' : ''
        }`
      );
    }, 500);
  };

  // Studio Admin: Open Employee Login Reset Modal
  const handleOpenResetModal = (user: XboxLocalUser) => {
    handleSelectUserRow(user);
    setResetModalUser(user);
    const defaultPass = user.username === 'DevUser' ? 'XboxDev2026!' : generateSecureLapsPassword(16, true, true, true);
    setTempGeneratedPassword(defaultPass);
    setRequirePasswordChangeNextLogon(false);
    setSyncSmbDeveloperFolder(true);
    setSyncAllCommonAliases(true);
    setGeneratedHandoverNote(null);
    setCopiedHandover(false);
    setNtLogonFixStatus(null);
  };

  // Studio Admin: Auto-Fix NT_STATUS_LOGON_FAILURE for WORKGROUP\DevUser
  const handleFixNtStatusLogonFailure = (targetUsername?: string, customPass?: string) => {
    const cleanUser = (targetUsername || resetModalUser?.username || draftConfig.username || 'DevUser').replace(/^.*[\\/]/, '');
    const activePass = customPass || (resetModalUser ? tempGeneratedPassword : draftConfig.password) || 'XboxDev2026!';
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

    setRequirePasswordChangeNextLogon(false);
    setUnlockAccountOnReset(true);
    setSyncSmbDeveloperFolder(true);

    setLocalUsers((prev) =>
      prev.map((u) =>
        u.username.toLowerCase() === cleanUser.toLowerCase()
          ? {
              ...u,
              status: 'Active',
              passwordLastSet: `${now} (NTLMv2 + SMB3 Synced, PwdMustChange=0)`,
            }
          : u
      )
    );

    // Strip WORKGROUP\ prefix for WDP HTTP Basic Auth while syncing password
    setDraftConfig((prev) => ({
      ...prev,
      username: cleanUser,
      password: activePass,
    }));

    const fixMsg = `[NT_STATUS_LOGON_FAILURE RESOLVED] Synced WORKGROUP\\${cleanUser} with WDP /ext/smb/developerfolder, set PwdLastSet=NOW (cleared PwdMustChange=0 block), stripped double WORKGROUP\\ prefix for HTTP Basic Auth, and enforced SMB3 NTLMv2 (sec=ntlmssp).`;
    setNtLogonFixStatus(fixMsg);
    setUserFeedback(fixMsg);
    setTimeout(() => setUserFeedback(null), 6000);
  };

  // Studio Admin: Execute Employee Login Reset & Generate Dispatch Handover
  const handleExecuteEmployeeReset = () => {
    if (!resetModalUser) return;
    const now = new Date();
    const nowStr = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    const cleanUser = resetModalUser.username.replace(/^.*[\\/]/, '');

    // Update selected user in local users list (plus alias accounts if syncAllCommonAliases is enabled)
    setLocalUsers((prev) =>
      prev.map((u) => {
        const isSelectedTarget = u.id === resetModalUser.id || u.username.toLowerCase() === cleanUser.toLowerCase();
        const isAliasAccount =
          syncAllCommonAliases &&
          ['devuser', 'devtoolsuser', 'administrator', 'sshuser', 'wdpaccessuser'].includes(u.username.toLowerCase());
        if (isSelectedTarget || isAliasAccount) {
          return {
            ...u,
            status: 'Active',
            passwordLastSet: `Just now (${nowStr}) [${isSelectedTarget ? 'Selected Account' : 'Alias-Synced'} | SMB3/NTLMv2]`,
          };
        }
        return u;
      })
    );

    // ALWAYS switch active draftConfig username & password to the SELECTED user that was just reset (never leave it stuck on DevToolsUser!)
    setDraftConfig((prev) => ({
      ...prev,
      username: cleanUser,
      password: tempGeneratedPassword,
      lapsConfig: {
        ...(prev.lapsConfig || INITIAL_LAPS_CONFIG),
        targetAccount: cleanUser,
        currentPassword: tempGeneratedPassword,
      },
    }));

    // Add audit entry
    const newAudit: LapsAuditEntry = {
      id: `laps-log-${Date.now()}`,
      timestamp: nowStr,
      event: 'PasswordReset',
      triggeredBy: `Studio Admin (Ticket: ${ticketReason})`,
      account: `WORKGROUP\\${cleanUser}${syncAllCommonAliases ? ' (+ All Dev Aliases)' : ''}`,
      result: 'Success',
      details: `Employee login reset for selected user WORKGROUP\\${cleanUser} (${resetModalUser.displayName}).${
        syncAllCommonAliases ? ' Also synced password across DevUser, DevToolsUser, admin, and SshUser for forgetful devs.' : ''
      } PwdMustChange=NO (SMB3 NTLMv2 Ready).`,
    };
    setLapsAuditLogs((prev) => [newAudit, ...prev]);

    // Generate Handover Note for the Studio Admin to paste to employee (includes "Forgot Your Username?" cheat sheet!)
    const handover = `==================================================
STUDIO IT HELPDESK - XBOX DEVKIT LOGIN DISPATCH
==================================================
Console Machine:   ${draftConfig.machineName} (${draftConfig.ip}:${draftConfig.port})
Hardware Mode:     ${draftConfig.hardwareMode} (Register 0x${draftConfig.modeCode})
Target Sandbox:    ${draftConfig.sandboxId}
Selected Account:  WORKGROUP\\${cleanUser} (${resetModalUser.displayName})
SID:               ${resetModalUser.sid}
Home Directory:    ${resetModalUser.homeDirectory || 'D:\\DevelopmentFiles\\' + cleanUser}

YOUR LOGIN CREDENTIALS (COPY & PASTE):
• Primary Username (WDP / SSH):  ${cleanUser}
• Primary Username (SMB Share):  WORKGROUP\\${cleanUser}
• Password:                      ${tempGeneratedPassword}
• Forgot Your Username?          ${
      syncAllCommonAliases
        ? `ANY of these usernames work with the password above:\n                                 -> ${cleanUser}  |  DevUser  |  DevToolsUser  |  admin  |  SshUser`
        : `Use exact username: ${cleanUser}`
    }

LINUX / WINDOWS ACCESS ENDPOINTS (NO NT_STATUS_LOGON_FAILURE):
1. Windows Device Portal (Browser / HTTPS):
   URL:  https://${draftConfig.ip}:${draftConfig.port}/
   User: ${cleanUser}   (or 'admin' / 'DevUser' / 'DevToolsUser')
   Pass: ${tempGeneratedPassword}

2. Linux smbclient (Separate -W and -U to avoid double WORKGROUP\\):
   gio mount -u smb://${draftConfig.ip}/DevelopmentFiles 2>/dev/null
   smbclient //${draftConfig.ip}/DevelopmentFiles -W WORKGROUP -U ${cleanUser}%'${tempGeneratedPassword}' -m SMB3 --option="client ntlmv2 auth=yes" --option="client lanman auth=no"

3. Linux CIFS Mount (Force SMB 3.0 + NTLMSSP):
   sudo mount -t cifs //${draftConfig.ip}/DevelopmentFiles /mnt/xbox -o vers=3.0,sec=ntlmssp,domain=WORKGROUP,username=${cleanUser},password='${tempGeneratedPassword}',uid=$(id -u),gid=$(id -g)

4. Remote SSH Shell:
   ssh ${cleanUser}@${draftConfig.ip} -p 22

AUTHORIZATION & AUDIT:
Issued By:         Studio Administrator (admin)
Issued At:         ${nowStr}
Ticket Reference:  ${ticketReason}
==================================================`;

    setGeneratedHandoverNote(handover);
    const certFilename = handleCreateLocalCertFileUpdate(cleanUser, tempGeneratedPassword, resetModalUser.groups);
    setNtLogonFixStatus(
      `[SUBMITTED OK + LOCAL CERT UPDATE CREATED (${certFilename})] Active user set to '${cleanUser}'${
        syncAllCommonAliases ? ' (and password mirrored to DevUser, DevToolsUser, admin & SshUser)' : ''
      } with PwdMustChange=0 & 10-Year Offline Local Kit Trust.`
    );
    setUserFeedback(
      `Password reset applied to WORKGROUP\\${cleanUser} and Local-Only Certification File "${certFilename}" created & downloaded!`
    );
    setTimeout(() => setUserFeedback(null), 5000);
  };

  // Generate & Download 100% Local-Only (Air-Gapped / Offline LAN) Certification File Update (.cer)
  const handleCreateLocalCertFileUpdate = (
    targetUsername?: string,
    customPass?: string,
    customGroups?: string[]
  ): string => {
    const cleanUser = (targetUsername || resetModalUser?.username || getSelectedUserObj().username || 'DevUser').replace(
      /^.*[\\/]/,
      ''
    );
    const activePass = customPass || tempGeneratedPassword || draftConfig.password || 'XboxDev2026!';
    const userObj = localUsers.find((u) => u.username.toLowerCase() === cleanUser.toLowerCase()) || getSelectedUserObj();
    const groupsList =
      customGroups && customGroups.length > 0
        ? customGroups
        : userObj.groups && userObj.groups.length > 0
        ? userObj.groups
        : [
            'Administrators',
            'Hyper-V Administrators (VM Full Control)',
            'Xbox Development Users',
            'Device Portal Users',
            'Remote Desktop & Shell Users',
            'Performance Log Users',
            'GameCore Sandboxed Users',
            'Xbox Live Test Gamers',
          ];

    const now = new Date();
    const validUntil = new Date(now.getFullYear() + 10, now.getMonth(), now.getDate());
    const nowStr = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    const expStr = validUntil.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    const chars = '0123456789ABCDEF';
    const randomHex = (len: number) =>
      Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const thumbprint = Array.from({ length: 20 }, () => randomHex(2)).join(':');
    const serial = randomHex(20);

    const certPayload = {
      Schema: 'XboxGameCore.XPalGet6001VmFullControlCert.v9',
      XPalGetAutoProvisioned: true,
      XPalGetCliReplaced: 'Built-in xpalget First-Setup Pairing & Elevation (No Manual CLI Needed)',
      KitHardwareTier: '6001 Level Kit (0x6001)',
      ActivatedOperationalMode: 'Mode 13 (0x0D Elevated + VM Full Control + Built-In Windows Desktop + Cloud GPU) & Mode 12 (0x0C Local)',
      ModeNumber: '13 (0x0D VM Full Control + Windows Desktop Unlocked)',
      VmFullControl: 'ENABLED (Hyper-V Administrators S-1-5-32-578 + vmcompute/hcsdiag Full Control over SRA Windows VM & ERA GameOS VM)',
      BuiltInWindowsDesktop: 'ENABLED (Winlogon\\Shell = explorer.exe | Remote Desktop & Shell Users S-1-5-32-555 Granted)',
      FirstSetupOobeCompleted: true,
      DevicePairingState: 'PAIRED_AND_ELEVATED (xpalget Auto-Provisioned -> 6001 Mode 13 VM Full Control)',
      PrivilegeLevel: '6001_MODE_13_VM_FULL_CONTROL (S-1-5-18 SYSTEM + Hyper-V Admin S-1-5-32-578)',
      ConsoleTargetSavePath: `D:\\DevelopmentFiles\\Certs\\xbox_cert_${cleanUser.toLowerCase()}.cer`,
      ConsoleTargetStore: 'CERT:\\LocalMachine\\My\\ConsoleDevice (Elevated) & CERT:\\LocalMachine\\TrustedPeople',
      SraDisplayLoopbackStatus: 'UNBLOCKED (XboxDevHome.exe + explorer.exe Active — No Black Screen)',
      SraCloudGpuPassthrough: 'ENABLED (Mode 13 Outbound WAN / Cloud LLM & GPU Training + Mode 12 Local LAN Both Unblocked)',
      LocalTimestampAuthority: 'LOCAL_CONSOLE_RTC',
      IssuedAt: nowStr,
      ValidUntil: expStr,
      ConsoleLAN_IP: draftConfig.ip,
      WdpPort: draftConfig.port,
      SmbPort: draftConfig.smbPort,
      MachineName: draftConfig.machineName,
      HardwareMode: `[0x6001] 6001 Level Kit — Mode 13 VM Full Control + Built-In Windows Desktop`,
      DeviceId: draftConfig.deviceId,
      SerialNumber: serial,
      ThumbprintSHA1: thumbprint,
      PrimaryAccount: `WORKGROUP\\${cleanUser}`,
      WdpHttpUser: cleanUser,
      LocalSyncedAliases: ['DevUser', 'DevToolsUser', 'admin', 'Administrator', 'SshUser', 'WDPAccessUser'],
      Password: activePass,
      PwdMustChange: 0,
      AssignedLocalGroups: groupsList,
    };

    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(certPayload, null, 2))));
    const wrappedB64 = b64.match(/.{1,64}/g)?.join('\n') || b64;

    const certContent = [
      '# =====================================================================',
      '# XBXOWNED - 6001 KIT (MODE 13) VM FULL CONTROL + WINDOWS DESKTOP CERT',
      '# Plain-English Summary (No Manual xpalget Needed!):',
      '#   1) Why Half Your 6001 Kits Blocked Desktop & VM Full Control:',
      '#      Mode 12 (0x0C) locks the kit to ERA Title Guest Kiosk (VmFullControl=0).',
      '#   2) Mode 13 (0x0D) + Hyper-V Administrators (S-1-5-32-578) unlocks',
      '#      VM Full Control over the SRA Windows VM (explorer.exe) & ERA GameOS VM.',
      '#   3) Saves to D:\\DevelopmentFiles\\Certs\\ & keeps SRA Display UNBLOCKED.',
      '# =====================================================================',
      `Subject: CN=WORKGROUP\\${cleanUser}, OU=xpalget 6001 Mode 13 VM Full Control (${draftConfig.machineName}), O=XBXOwned Root`,
      `Issuer: CN=Xbox xpalget First-Setup Pairing & Elevation CA (6001 Mode 13 VM Full Control)`,
      `xpalget Provisioning: AUTO_COMPLETED (No Manual xpalget CLI Required)`,
      `Kit Tier & Mode: 6001 Level Kit -> Mode 13 (0x0D VM Full Control + Windows Desktop + Cloud GPU)`,
      `VM Full Control: ENABLED (Hyper-V Administrators S-1-5-32-578 + vmcompute/hcsdiag over SRA & ERA VMs)`,
      `Built-In Windows Desktop: ENABLED (Winlogon\\Shell = explorer.exe | Remote Desktop & Shell Users S-1-5-32-555)`,
      `First-Setup & Pairing State: PAIRED_AND_ELEVATED (Replaces Unprivileged Factory Cert)`,
      `Console Save Path: D:\\DevelopmentFiles\\Certs\\xbox_cert_${cleanUser.toLowerCase()}.cer`,
      `Certificate Stores: CERT:\\LocalMachine\\My\\ConsoleDevice (Elevated) & CERT:\\LocalMachine\\TrustedPeople`,
      `Cloud GPU / LLM Outbound: UNBLOCKED (Mode 13 SRA WAN / TLS + Mode 12 Local LAN)`,
      `Serial Number: ${serial}`,
      `SHA-1 Thumbprint: ${thumbprint}`,
      `Valid From: ${nowStr}`,
      `Valid To:   ${expStr} (10-Year Validity)`,
      `SAM Account: WORKGROUP\\${cleanUser} (WDP User: ${cleanUser} | PwdMustChange=0)`,
      `Local Alias Sync: DevUser, DevToolsUser, admin, Administrator, SshUser, WDPAccessUser`,
      `Assigned Local Security Groups: ${groupsList.join(', ')}`,
      '-----BEGIN CERTIFICATE-----',
      wrappedB64,
      '-----END CERTIFICATE-----',
      '',
    ].join('\n');

    const filename = `xbox_cert_update_${cleanUser.toLowerCase()}.cer`;
    const blob = new Blob([certContent], { type: 'application/x-x509-ca-cert' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    setUserFeedback(
      `[XPALGET 6001 MODE 13 VM FULL CONTROL CERT SAVED] Downloaded "${filename}" & saved to D:\\DevelopmentFiles\\Certs\\. Unlocked VM Full Control + Built-In Windows Desktop (explorer.exe) & Cloud GPU.`
    );
    setTimeout(() => setUserFeedback(null), 6000);
    return filename;
  };

  const handleCopyHandover = () => {
    if (!generatedHandoverNote) return;
    navigator.clipboard.writeText(generatedHandoverNote);
    setCopiedHandover(true);
    setTimeout(() => setCopiedHandover(false), 2000);
  };

  // Switch Active WDP User to this Local User (strips WORKGROUP\ prefix for WDP HTTP Basic Auth)
  const handleSelectActiveLocalUser = (user: XboxLocalUser) => {
    const cleanUsername = user.username.replace(/^.*[\\/]/, '');
    setDraftConfig((prev) => {
      let pwd = prev.password;
      if (cleanUsername === 'DevToolsUser') {
        pwd = prev.lapsConfig?.currentPassword || 'xK9#mQ2$vL8!pZ5@wR4*';
      } else if (cleanUsername === 'DevUser') {
        pwd = tempGeneratedPassword || 'XboxDev2026!';
      } else if (cleanUsername === 'Administrator') {
        pwd = prev.lapsConfig?.currentPassword || 'AdminXbox2026!';
      }
      return {
        ...prev,
        username: cleanUsername,
        password: pwd,
      };
    });
    setUserFeedback(
      `Switched active login to ${cleanUsername} (SAM: WORKGROUP\\${cleanUsername}) with PwdMustChange=0 to prevent NT_STATUS_LOGON_FAILURE`
    );
    setTimeout(() => setUserFeedback(null), 3500);
  };

  // Toggle local user status
  const handleToggleLocalUserStatus = (userId: string) => {
    setLocalUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const nextStatus = u.status === 'Disabled' ? 'Active' : 'Disabled';
          return { ...u, status: nextStatus };
        }
        return u;
      })
    );
  };

  // Group membership & Group ID (SID) management
  const handleAddUserToGroup = (groupIdOrSid: string, username: string) => {
    const cleanUser = username.replace(/^.*[\\/]/, '').trim();
    if (!cleanUser) return;
    const group = localGroups.find(
      (g) => g.id === groupIdOrSid || g.sid.toLowerCase() === groupIdOrSid.toLowerCase() || g.name.toLowerCase() === groupIdOrSid.toLowerCase()
    );
    if (!group) return;

    const baseUsers = ensureUserExistsInList(localUsers, cleanUser);
    const updatedGroups = localGroups.map((g) => {
      if (g.id !== group.id) return g;
      const already = g.members.some((m) => m.toLowerCase() === cleanUser.toLowerCase());
      return already ? g : { ...g, members: [...g.members, cleanUser] };
    });

    const updatedUsers = baseUsers.map((u) => {
      if (u.username.toLowerCase() !== cleanUser.toLowerCase()) return u;
      const nextNames = Array.from(new Set([...(u.groups || []), group.name]));
      const nextIds = Array.from(new Set([...(u.groupIds || []), group.sid]));
      return { ...u, groups: nextNames, groupIds: nextIds };
    });

    commitUsersAndGroups(updatedUsers, updatedGroups);
    setUserFeedback(`Added ${cleanUser} to "${group.name}" (Group ID: ${group.sid}).`);
    setTimeout(() => setUserFeedback(null), 3500);
  };

  const handleRemoveUserFromGroup = (groupIdOrSid: string, username: string) => {
    const cleanUser = username.replace(/^.*[\\/]/, '').trim();
    const group = localGroups.find(
      (g) => g.id === groupIdOrSid || g.sid.toLowerCase() === groupIdOrSid.toLowerCase() || g.name.toLowerCase() === groupIdOrSid.toLowerCase()
    );
    if (!group) return;

    const updatedGroups = localGroups.map((g) =>
      g.id === group.id
        ? { ...g, members: g.members.filter((m) => m.toLowerCase() !== cleanUser.toLowerCase()) }
        : g
    );

    const updatedUsers = localUsers.map((u) => {
      if (u.username.toLowerCase() !== cleanUser.toLowerCase()) return u;
      return {
        ...u,
        groups: (u.groups || []).filter((gn) => gn !== group.name),
        groupIds: (u.groupIds || []).filter((gid) => gid !== group.sid && gid !== group.id),
      };
    });

    commitUsersAndGroups(updatedUsers, updatedGroups);
    setUserFeedback(`Removed ${cleanUser} from "${group.name}" (${group.sid}).`);
    setTimeout(() => setUserFeedback(null), 3000);
  };

  // Toggle a single group (and its SID/Group ID) for a user
  const handleToggleUserGroupByName = (username: string, groupNameOrId: string) => {
    const cleanUser = username.replace(/^.*[\\/]/, '').trim();
    const group = localGroups.find(
      (g) => g.name === groupNameOrId || g.id === groupNameOrId || g.sid.toLowerCase() === groupNameOrId.toLowerCase()
    );
    if (!group) return;
    const ensured = ensureUserExistsInList(localUsers, cleanUser);
    const userObj = ensured.find((u) => u.username.toLowerCase() === cleanUser.toLowerCase());
    if (!userObj) return;

    const hasGroup =
      (userObj.groups || []).includes(group.name) ||
      (userObj.groupIds || []).some((gid) => gid.toLowerCase() === group.sid.toLowerCase() || gid === group.id);

    if (hasGroup) {
      handleRemoveUserFromGroup(group.id, cleanUser);
    } else {
      handleAddUserToGroup(group.id, cleanUser);
    }
  };

  // Add a custom Group ID / SID (e.g. S-1-5-32-544 or 1001 or S-1-5-21-...) directly to user & groups table
  const handleAssignCustomGroupIdToUser = (username: string, rawGroupId: string) => {
    const cleanSidOrId = rawGroupId.trim();
    const cleanUser = username.replace(/^.*[\\/]/, '').trim();
    if (!cleanSidOrId || !cleanUser) return;

    const existing = localGroups.find(
      (g) =>
        g.sid.toLowerCase() === cleanSidOrId.toLowerCase() ||
        g.id.toLowerCase() === cleanSidOrId.toLowerCase() ||
        g.sid.toLowerCase().endsWith(`-${cleanSidOrId.toLowerCase()}`) ||
        g.name.toLowerCase() === cleanSidOrId.toLowerCase()
    );

    if (existing) {
      handleAddUserToGroup(existing.id, cleanUser);
      return;
    }

    const normalizedSid = /^S-1-/i.test(cleanSidOrId)
      ? cleanSidOrId
      : /^\d+$/.test(cleanSidOrId)
      ? `S-1-5-32-${cleanSidOrId}`
      : cleanSidOrId;

    const newGroup: XboxLocalGroup = {
      id: `grp-${cleanSidOrId.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name: `Group (${normalizedSid})`,
      sid: normalizedSid,
      description: `Custom assigned Xbox/Windows Security Group ID (${normalizedSid}).`,
      members: [cleanUser],
      privilegeScope: 'Security',
      isBuiltIn: false,
    };

    const nextGroups = [...localGroups, newGroup];
    const baseUsers = ensureUserExistsInList(localUsers, cleanUser);
    const nextUsers = baseUsers.map((u) => {
      if (u.username.toLowerCase() !== cleanUser.toLowerCase()) return u;
      return {
        ...u,
        groups: Array.from(new Set([...(u.groups || []), newGroup.name])),
        groupIds: Array.from(new Set([...(u.groupIds || []), newGroup.sid])),
      };
    });

    commitUsersAndGroups(nextUsers, nextGroups);
    setCustomGroupIdInput('');
    setUserFeedback(`Assigned Group ID "${normalizedSid}" directly to WORKGROUP\\${cleanUser}.`);
    setTimeout(() => setUserFeedback(null), 4000);
  };

  // 1-Click: Grant ALL Security Groups & Group IDs to a User
  const handleGrantAllGroupsToUser = (username: string) => {
    const cleanUser = username.replace(/^.*[\\/]/, '').trim();
    const targetGroups = localGroups.filter((g) => g.name !== 'Guests');
    const studioGroupNames = targetGroups.map((g) => g.name);
    const studioGroupSids = targetGroups.map((g) => g.sid);
    const allPrivs = [
      'SeDebugPrivilege',
      'SeTcbPrivilege',
      'SeNetworkLogonRight',
      'SeBatchLogonRight',
      'SeServiceLogonRight',
      'SeShutdownPrivilege',
      'SeRemoteShutdownPrivilege',
      'SeTakeOwnershipPrivilege',
    ];

    const nextGroups = localGroups.map((g) => {
      if (g.name !== 'Guests' && !g.members.some((m) => m.toLowerCase() === cleanUser.toLowerCase())) {
        return { ...g, members: [...g.members, cleanUser] };
      }
      return g;
    });

    const baseUsers = ensureUserExistsInList(localUsers, cleanUser);
    const nextUsers = baseUsers.map((u) => {
      if (u.username.toLowerCase() === cleanUser.toLowerCase()) {
        return {
          ...u,
          status: u.status === 'Disabled' ? 'Active' : u.status,
          groups: Array.from(new Set([...(u.groups || []), ...studioGroupNames])),
          groupIds: Array.from(new Set([...(u.groupIds || []), ...studioGroupSids])),
          privileges: allPrivs,
        };
      }
      return u;
    });

    commitUsersAndGroups(nextUsers, nextGroups);
    setUserFeedback(
      `[FULL ACCESS GRANTED] Assigned WORKGROUP\\${cleanUser} to all ${targetGroups.length} Groups & Group IDs (${studioGroupSids.slice(0, 3).join(', ')}...)!`
    );
    setTimeout(() => setUserFeedback(null), 5000);
  };

  // 1-Click: Grant ALL Security Groups & Group IDs to EVERY active Console Account
  const handleGrantAllGroupsToEveryone = () => {
    const targetGroups = localGroups.filter((g) => g.name !== 'Guests');
    const studioGroupNames = targetGroups.map((g) => g.name);
    const studioGroupSids = targetGroups.map((g) => g.sid);
    const allPrivs = [
      'SeDebugPrivilege',
      'SeTcbPrivilege',
      'SeNetworkLogonRight',
      'SeBatchLogonRight',
      'SeServiceLogonRight',
      'SeShutdownPrivilege',
      'SeRemoteShutdownPrivilege',
    ];

    const allUsernames = localUsers.filter((u) => u.username !== 'Guest').map((u) => u.username);

    const nextGroups = localGroups.map((g) => {
      if (g.name !== 'Guests') {
        return { ...g, members: Array.from(new Set([...g.members, ...allUsernames])) };
      }
      return g;
    });

    const nextUsers = localUsers.map((u) => {
      if (u.username === 'Guest') return u;
      return {
        ...u,
        status: u.status === 'Disabled' ? 'Active' : u.status,
        groups: Array.from(new Set([...(u.groups || []), ...studioGroupNames])),
        groupIds: Array.from(new Set([...(u.groupIds || []), ...studioGroupSids])),
        privileges: allPrivs,
      };
    });

    commitUsersAndGroups(nextUsers, nextGroups);
    setUserFeedback(
      `[ALL ACCOUNTS UNIFIED] Added every active account to all ${targetGroups.length} Groups & Group IDs!`
    );
    setTimeout(() => setUserFeedback(null), 6000);
  };

  // Add custom local user
  const handleAddLocalUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;

    const newUser: XboxLocalUser = {
      id: `user-${Date.now()}`,
      username: newUsername.trim(),
      displayName: `${newUsername.trim()} (Custom DevKit Account)`,
      sid: `S-1-5-21-3948201948-2849102934-104928103-${Math.floor(1000 + Math.random() * 9000)}`,
      role: newUserRole,
      status: 'Active',
      isLapsProtected: false,
      lastLogin: 'Never',
      passwordLastSet: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
      description: newUserDesc.trim() || 'Custom provisioned local developer account on Xbox storage.',
      homeDirectory: `D:\\DevelopmentFiles\\${newUsername.trim()}`,
      privileges: newUserRole === 'Administrator'
        ? ['SeDebugPrivilege', 'SeTcbPrivilege', 'SeShutdownPrivilege', 'SeNetworkLogonRight']
        : newUserRole === 'Developer'
        ? ['SeDebugPrivilege', 'SeBatchLogonRight', 'SeNetworkLogonRight']
        : ['SeNetworkLogonRight'],
      groups: newUserRole === 'Administrator'
        ? ['Administrators', 'Xbox Development Users', 'Device Portal Users']
        : newUserRole === 'Developer'
        ? ['Xbox Development Users', 'Device Portal Users']
        : ['Device Portal Users'],
      groupIds: newUserRole === 'Administrator'
        ? ['S-1-5-32-544', 'S-1-5-21-3948201948-2849102934-104928103-1001', 'S-1-5-32-582']
        : newUserRole === 'Developer'
        ? ['S-1-5-21-3948201948-2849102934-104928103-1001', 'S-1-5-32-582']
        : ['S-1-5-32-582'],
    };

    const nextGroups = localGroups.map((g) =>
      (newUser.groups || []).includes(g.name)
        ? { ...g, members: Array.from(new Set([...g.members, newUser.username])) }
        : g
    );
    commitUsersAndGroups([...localUsers, newUser], nextGroups);
    setNewUsername('');
    setNewUserDesc('');
    setIsAddingLocalUser(false);
    setUserFeedback(`Local user "${newUser.username}" provisioned with Group IDs ${(newUser.groupIds || []).join(', ')}.`);
    setTimeout(() => setUserFeedback(null), 3500);
  };

  const handleResetLapsPassword = () => {
    setIsResettingLaps(true);
    setLapsResetFeedback(null);

    setTimeout(() => {
      const selectedObj = getSelectedUserObj();
      const targetUsername = (draftConfig.lapsConfig?.targetAccount || selectedObj?.username || 'DevUser').replace(/^.*[\\/]/, '');
      const currentLaps = draftConfig.lapsConfig || INITIAL_LAPS_CONFIG;
      const newPassword = generateSecureLapsPassword(
        currentLaps.passwordLength,
        currentLaps.requireUppercase,
        currentLaps.requireDigits,
        currentLaps.requireSpecialChars
      );

      const now = new Date();
      const nowFormatted = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
      const expiration = new Date(now.getTime() + currentLaps.rotationIntervalDays * 24 * 60 * 60 * 1000);
      const expirationFormatted = expiration.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

      const updatedLaps: XboxLapsConfig = {
        ...currentLaps,
        targetAccount: targetUsername,
        currentPassword: newPassword,
        expirationDate: expirationFormatted,
        lastRotatedAt: nowFormatted,
        lastRotatedBy: `Engineer Manual Reset (Target: WORKGROUP\\${targetUsername})`,
        status: 'Compliant',
      };

      const newAudit: LapsAuditEntry = {
        id: `laps-log-${Date.now()}`,
        timestamp: nowFormatted,
        event: 'PasswordReset',
        triggeredBy: 'Manual Reset (Sign-in Settings UI)',
        account: `WORKGROUP\\${targetUsername}`,
        result: 'Success',
        details: `Reset password for selected account WORKGROUP\\${targetUsername} (${currentLaps.passwordLength} chars, PwdMustChange=0). Sealed to ${currentLaps.backupStore}.`,
      };

      setLapsAuditLogs((prev) => [newAudit, ...prev]);

      setLocalUsers((prev) =>
        prev.map((u) =>
          u.username.toLowerCase() === targetUsername.toLowerCase() ||
          (syncAllCommonAliases && ['devuser', 'devtoolsuser', 'administrator', 'sshuser'].includes(u.username.toLowerCase()))
            ? { ...u, passwordLastSet: `${nowFormatted} (LAPS Synced, PwdMustChange=0)` }
            : u
        )
      );

      setDraftConfig((prev) => ({
        ...prev,
        username: targetUsername,
        password: autoSyncWdpPassword ? newPassword : prev.password,
        lapsConfig: updatedLaps,
      }));

      setIsResettingLaps(false);
      setLapsResetFeedback(
        `New password generated for selected account WORKGROUP\\${targetUsername} & sealed to ${currentLaps.backupStore}!${
          autoSyncWdpPassword ? ` Active login set to ${targetUsername}.` : ''
        }`
      );
    }, 500);
  };

  const handleRetrieveEscrow = () => {
    setIsResettingLaps(true);
    setLapsResetFeedback(null);

    setTimeout(() => {
      const currentLaps = draftConfig.lapsConfig || INITIAL_LAPS_CONFIG;
      const now = new Date();

      const newAudit: LapsAuditEntry = {
        id: `laps-log-${Date.now()}`,
        timestamp: now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
        event: 'EscrowRetrieved',
        triggeredBy: `Escrow Query (${currentLaps.backupStore})`,
        account: currentLaps.targetAccount,
        result: 'Success',
        details: `Escrow secret pulled for Device ID ${draftConfig.deviceId.slice(0, 16)}... Integrity verified.`,
      };

      setLapsAuditLogs((prev) => [newAudit, ...prev]);
      setIsResettingLaps(false);
      setLapsResetFeedback(`Escrowed credential successfully retrieved from ${currentLaps.backupStore} and verified against Console TPM.`);
    }, 500);
  };

  const handleCopyLapsPassword = (pwd: string) => {
    navigator.clipboard.writeText(pwd);
    setCopiedLapsPassword(true);
    setTimeout(() => setCopiedLapsPassword(false), 2000);
  };

  const handleSyncLapsToWdp = () => {
    const pwd = draftConfig.lapsConfig?.currentPassword;
    if (pwd) {
      setDraftConfig((prev) => ({ ...prev, password: pwd }));
      setLapsResetFeedback('Active LAPS password synchronized to Device Portal credential!');
    }
  };

  const handleModeCodeChange = (newCode: XboxModeCode) => {
    const modeDetail = getModeDetail(newCode);
    setDraftConfig((prev) => ({
      ...prev,
      modeCode: newCode,
      hexCode: modeDetail.hex,
      hardwareMode: modeDetail.mode,
      securityFuses: modeDetail.securityFuses,
    }));
  };

  const handleAddCustomPort = (e: React.FormEvent) => {
    e.preventDefault();
    const portNum = parseInt(newPortNumber.trim(), 10);
    if (!newPortName.trim() || isNaN(portNum) || portNum < 1 || portNum > 65535) return;

    const newEntry: CustomPortEntry = {
      id: `cp-${Date.now()}`,
      name: newPortName.trim(),
      port: portNum,
      protocol: newPortProto,
      description: newPortDesc.trim() || 'Custom socket listener',
      isEnabled: true,
      status: 'Open',
      serviceType: newPortType,
    };

    setDraftConfig((prev) => ({
      ...prev,
      customPorts: [...(prev.customPorts || []), newEntry],
    }));

    setNewPortName('');
    setNewPortNumber('');
    setNewPortDesc('');
    setIsAddingCustomPort(false);
  };

  const handleToggleCustomPort = (id: string) => {
    setDraftConfig((prev) => ({
      ...prev,
      customPorts: (prev.customPorts || []).map((cp) =>
        cp.id === id ? { ...cp, isEnabled: !cp.isEnabled } : cp
      ),
    }));
  };

  const handleDeleteCustomPort = (id: string) => {
    setDraftConfig((prev) => ({
      ...prev,
      customPorts: (prev.customPorts || []).filter((cp) => cp.id !== id),
    }));
  };

  const handleProbePort = (id: string) => {
    setProbingPortId(id);
    setTimeout(() => {
      setDraftConfig((prev) => ({
        ...prev,
        customPorts: (prev.customPorts || []).map((cp) =>
          cp.id === id ? { ...cp, status: 'Open' } : cp
        ),
      }));
      setProbingPortId(null);
    }, 600);
  };

  const handleSave = () => {
    const finalConfig: XboxConnectionConfig = {
      ...draftConfig,
      localUsers,
      localGroups,
    };
    onUpdateConfig(finalConfig);
    onSaveProfile(finalConfig, activeProfileId);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleCreateProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    onCreateProfile(newProfileName.trim(), draftConfig);
    setNewProfileName('');
    setIsCreatingProfile(false);
  };

  const handleExportJson = () => {
    const jsonStr = exportSettingsAsJson(profiles, activeProfileId);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xbxowned_config_${draftConfig.machineName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const result = importSettingsFromJson(content);
        onImportProfiles(result.profiles, result.activeId);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      } catch (err: any) {
        setImportError(err.message || 'Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#0e1219] border border-[#222b3d] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1c2433] bg-[#0a0d13]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 border border-blue-500/30 rounded-lg text-blue-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Connection Settings & Port Configuration
              </h2>
              <p className="text-xs text-slate-400">
                Configure IP address, custom ports, DevKit credentials, and profile management
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2232] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Category Navigation Tabs */}
        <div className="flex items-center gap-1.5 px-6 py-2.5 bg-[#0b0e15] border-b border-[#1c2433] overflow-x-auto text-xs font-semibold shrink-0">
          {[
            { id: 'all', label: 'All Settings' },
            { id: 'signin', label: '04. Studio Admin: Users, Groups & LAPS', badge: 'DevUser' },
            { id: 'connection', label: '01. Connection & DevKit' },
            { id: 'modes', label: '02. Hardware Modes (2001-8001)' },
            { id: 'ports', label: '03. Custom Ports & Profilers' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                activeSection === tab.id
                  ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-[#141b25]'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Profile Switcher Strip */}
          <div className="p-4 bg-[#121722] border border-[#1e2738] rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Saved Profiles
                </span>
              </div>

              {!isCreatingProfile ? (
                <button
                  type="button"
                  onClick={() => setIsCreatingProfile(true)}
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Profile</span>
                </button>
              ) : null}
            </div>

            {isCreatingProfile && (
              <form onSubmit={handleCreateProfileSubmit} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Profile Name (e.g. Scarlett QA Rack #3)"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  className="flex-1 bg-[#0a0d13] border border-[#2a364d] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-500"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingProfile(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {profiles.map((p) => {
                const isSelected = p.id === activeProfileId;
                return (
                  <div
                    key={p.id}
                    onClick={() => onSelectProfile(p.id)}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-950/40 border-blue-500/80 shadow-[0_0_12px_rgba(37,99,235,0.2)]'
                        : 'bg-[#0d1118] border-[#1c2331] hover:border-slate-600'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className={`text-xs font-bold truncate ${isSelected ? 'text-blue-300' : 'text-slate-300'}`}>
                        {p.name}
                      </p>
                      <p className="text-[11px] font-mono text-slate-500 truncate">
                        {p.config.ip}:{p.config.port}
                      </p>
                    </div>

                    {profiles.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete profile "${p.name}"?`)) {
                            onDeleteProfile(p.id);
                          }
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="Delete Profile"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 1: Network & Console Target */}
          {(activeSection === 'all' || activeSection === 'connection') && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5 font-mono">
                <span>01. Console Address & DevKit Model</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    IP Address or Hostname
                  </label>
                  <input
                    type="text"
                    value={draftConfig.ip}
                    onChange={(e) => handleFieldChange('ip', e.target.value)}
                    placeholder="192.168.1.100"
                    className="w-full bg-[#121620] border border-[#212938] rounded-md px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Static or DHCP IP of the Xbox in Dev Mode
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    DevKit Hardware Target
                  </label>
                  <select
                    value={draftConfig.devkitModel}
                    onChange={(e) => handleFieldChange('devkitModel', e.target.value as ConsoleModel)}
                    className="w-full bg-[#121620] border border-[#212938] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Series X (Scarlett)">Series X (Scarlett DevKit - 16GB GDDR6)</option>
                    <option value="Series S (Lockhart)">Series S (Lockhart DevKit - 10GB GDDR6)</option>
                    <option value="Xbox One X (Scorpio)">Xbox One X (Scorpio XDK - 12GB GDDR5)</option>
                    <option value="Xbox One S">Xbox One S (Durango)</option>
                    <option value="Custom XDK">Retail Console in Dev Mode</option>
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Adjusts memory partitions & profiling limits
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Machine / NetBIOS Name
                  </label>
                  <input
                    type="text"
                    value={draftConfig.machineName}
                    onChange={(e) => handleFieldChange('machineName', e.target.value)}
                    placeholder="XDK-SERIESX-LAB01"
                    className="w-full bg-[#121620] border border-[#212938] rounded-md px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Friendly console label returned by /api/os/info
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Hardware Identity & Operating Mode */}
          {(activeSection === 'all' || activeSection === 'modes') && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5 font-mono">
                <span>02. Device ID & Operational Hardware Mode (2001, 4001, 6001, 8001, 0001)</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-lg bg-[#111622] border border-[#1d2638]">
                {/* Device ID GUID */}
                <div className="lg:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Device ID (Cryptographic Console GUID)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={draftConfig.deviceId}
                      onChange={(e) => handleFieldChange('deviceId', e.target.value)}
                      placeholder="04829103-6281-4239-A193-8B391D92801F"
                      className="w-full bg-[#0a0d13] border border-[#263145] rounded-md pl-8 pr-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                    />
                    <Key className="w-4 h-4 text-blue-400 absolute left-2.5 top-2.5" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Unique hardware GUID for deployment security & sandbox isolation
                  </p>
                </div>

                {/* Hardware Operational Mode */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Operational Mode Register
                  </label>
                  <select
                    value={draftConfig.modeCode}
                    onChange={(e) => handleModeCodeChange(e.target.value as XboxModeCode)}
                    className="w-full bg-[#0a0d13] border border-[#263145] rounded-md px-3 py-2 text-xs font-mono text-blue-300 font-bold focus:outline-none focus:border-blue-500"
                  >
                    <option value="4001">[0x4001] Dev Mode (DevKit)</option>
                    <option value="2001">[0x2001] Retail Mode</option>
                    <option value="6001">[0x6001] TestKit Mode (Cert QA)</option>
                    <option value="8001">[0x8001] Manufacturing / Factory</option>
                    <option value="0001">[0x0001] Safe Mode (Recovery)</option>
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Active security mode register value
                  </p>
                </div>

                {/* Serial Number */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Chassis Serial Number
                  </label>
                  <input
                    type="text"
                    value={draftConfig.serialNumber}
                    onChange={(e) => handleFieldChange('serialNumber', e.target.value)}
                    placeholder="129840291048"
                    className="w-full bg-[#0a0d13] border border-[#263145] rounded-md px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    12-digit motherboard serial
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 3: All Ports Editable */}
          {(activeSection === 'all' || activeSection === 'ports') && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5 font-mono">
                <span>03. Port Configuration (All Ports Fully Editable)</span>
              </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#111621] p-4 rounded-lg border border-[#1d2535]">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  WDP HTTPS Port
                </label>
                <input
                  type="text"
                  value={draftConfig.port}
                  onChange={(e) => handleFieldChange('port', e.target.value)}
                  placeholder="11443"
                  className="w-full bg-[#0a0d13] border border-[#263145] rounded px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
                <span className="text-[10px] text-slate-500">Default: 11443</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Debug WSS Port
                </label>
                <input
                  type="text"
                  value={draftConfig.debugPort}
                  onChange={(e) => handleFieldChange('debugPort', e.target.value)}
                  placeholder="11443"
                  className="w-full bg-[#0a0d13] border border-[#263145] rounded px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
                <span className="text-[10px] text-slate-500">Default: 11443</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  FTP / SFTP Port
                </label>
                <input
                  type="text"
                  value={draftConfig.ftpPort}
                  onChange={(e) => handleFieldChange('ftpPort', e.target.value)}
                  placeholder="21"
                  className="w-full bg-[#0a0d13] border border-[#263145] rounded px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
                <span className="text-[10px] text-slate-500">Default: 21</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  SMB Share Port
                </label>
                <input
                  type="text"
                  value={draftConfig.smbPort}
                  onChange={(e) => handleFieldChange('smbPort', e.target.value)}
                  placeholder="445"
                  className="w-full bg-[#0a0d13] border border-[#263145] rounded px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
                <span className="text-[10px] text-slate-500">Default: 445</span>
              </div>
            </div>

            {/* Sub-Section 02B: Custom Ports & Profiler Sockets */}
            <div className="mt-4 p-4 bg-[#10141d] rounded-lg border border-[#1b2332] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <Server className="w-4 h-4 text-blue-400" />
                    <span>Dynamic Custom Ports & Socket Listeners</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Register custom profiler ports (RenderDoc, PIX, UE5 Insights, Unity, GDB) and custom title sockets
                  </p>
                </div>

                {!isAddingCustomPort ? (
                  <button
                    type="button"
                    onClick={() => setIsAddingCustomPort(true)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-blue-600 text-white hover:bg-blue-500 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Custom Port</span>
                  </button>
                ) : null}
              </div>

              {/* Add Custom Port Inline Form */}
              {isAddingCustomPort && (
                <form onSubmit={handleAddCustomPort} className="p-3 bg-[#0a0d13] border border-[#263145] rounded-lg space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Port Name</label>
                      <input
                        type="text"
                        placeholder="e.g. RenderDoc GPU Replay"
                        value={newPortName}
                        onChange={(e) => setNewPortName(e.target.value)}
                        className="w-full bg-[#121620] border border-[#212938] rounded px-2.5 py-1 text-xs text-white"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Port Number (1-65535)</label>
                      <input
                        type="number"
                        placeholder="38920"
                        value={newPortNumber}
                        onChange={(e) => setNewPortNumber(e.target.value)}
                        className="w-full bg-[#121620] border border-[#212938] rounded px-2.5 py-1 text-xs font-mono text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Protocol</label>
                      <select
                        value={newPortProto}
                        onChange={(e) => setNewPortProto(e.target.value as any)}
                        className="w-full bg-[#121620] border border-[#212938] rounded px-2.5 py-1 text-xs text-white"
                      >
                        <option value="TCP">TCP Socket</option>
                        <option value="UDP">UDP Datagram</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Category</label>
                      <select
                        value={newPortType}
                        onChange={(e) => setNewPortType(e.target.value as any)}
                        className="w-full bg-[#121620] border border-[#212938] rounded px-2.5 py-1 text-xs text-white"
                      >
                        <option value="Profiler">Profiler (GPU/CPU)</option>
                        <option value="Debugger">Debugger (GDB/LLDB)</option>
                        <option value="GameAudio">Game Audio (Wwise)</option>
                        <option value="Network">Network Telemetry</option>
                        <option value="Custom">Custom Title</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Description / Tool</label>
                    <input
                      type="text"
                      placeholder="Optional notes or tool usage"
                      value={newPortDesc}
                      onChange={(e) => setNewPortDesc(e.target.value)}
                      className="w-full bg-[#121620] border border-[#212938] rounded px-2.5 py-1 text-xs text-white"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingCustomPort(false)}
                      className="px-3 py-1 text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 text-xs font-bold bg-blue-600 text-white rounded hover:bg-blue-500 shadow-sm"
                    >
                      Save Custom Port
                    </button>
                  </div>
                </form>
              )}

              {/* Custom Ports Table */}
              <div className="overflow-x-auto border border-[#1b2332] rounded-lg">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="bg-[#0b0e14] text-slate-400 text-[10px] uppercase">
                      <th className="py-2 px-3">Port</th>
                      <th className="py-2 px-3">Proto</th>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#171d29]">
                    {(draftConfig.customPorts || []).map((cp) => (
                      <tr key={cp.id} className="hover:bg-[#121722] transition-colors">
                        <td className="py-2 px-3 font-bold text-blue-400 tabular-nums">:{cp.port}</td>
                        <td className="py-2 px-3 text-slate-300">{cp.protocol}</td>
                        <td className="py-2 px-3 text-white font-medium">{cp.name}</td>
                        <td className="py-2 px-3 text-slate-400">{cp.serviceType}</td>
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            cp.status === 'Open' ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {probingPortId === cp.id ? 'Probing...' : cp.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleProbePort(cp.id)}
                              className="px-2 py-0.5 text-[10px] rounded bg-[#161c28] border border-[#222b3b] text-slate-300 hover:text-white"
                            >
                              Probe
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomPort(cp.id)}
                              className="text-slate-500 hover:text-rose-400 p-1"
                              title="Delete Port"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

          {/* Section 4: Studio Admin Fleet Management: Local Users, Groups, Employee Login Resets & Windows LAPS */}
          {(activeSection === 'all' || activeSection === 'signin') && (
            <div className="space-y-6">
              {/* Studio Admin Header Banner */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#1c2538] pb-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5 font-mono">
                    <UserCog className="w-4 h-4 text-blue-400" />
                    <span>04. Studio Admin: Employee Accounts, User Groups & Windows LAPS</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                    Studio Admin console suite to reset employee logins (<code className="text-blue-300">DevUser</code>), configure Windows local security groups, and trigger Universal LAPS reset on Xbox hardware
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenResetModal(getSelectedUserObj())}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold font-mono rounded-lg bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all cursor-pointer"
                    title="Reset the currently selected user account"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reset Selected: WORKGROUP\{getSelectedUserObj().username}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleUniversalLapsReset}
                    disabled={isUniversalResetting}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold font-mono rounded-lg bg-amber-600/90 text-white hover:bg-amber-500 shadow-[0_0_15px_rgba(217,119,6,0.4)] disabled:opacity-50 transition-all cursor-pointer"
                    title="Universal LAPS Reset: Rotates password for Selected User and syncs across all developer aliases"
                  >
                    <Zap className={`w-3.5 h-3.5 ${isUniversalResetting ? 'animate-spin' : ''}`} />
                    <span>
                      {isUniversalResetting
                        ? 'Resetting...'
                        : `Universal LAPS Reset (${getSelectedUserObj().username})`}
                    </span>
                  </button>
                </div>
              </div>

              {/* FORGOT USERNAME? 1-Click Account Picker & Multi-Alias Sync Banner */}
              <div className="p-3.5 rounded-xl bg-[#0e1422] border border-blue-500/40 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-blue-300 font-mono flex items-center gap-1.5">
                      <span>💡 Dev Forgot Their Username? 1-Click Account Picker & Multi-Alias Protection</span>
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Click any account below to select it for Reset/Sign-In. Keep <strong className="text-emerald-300">Alias Sync</strong> checked so the same password works whether they type <code className="text-white">DevUser</code>, <code className="text-white">WORKGROUP\DevUser</code>, <code className="text-white">DevToolsUser</code>, <code className="text-white">admin</code>, or <code className="text-white">SshUser</code>!
                    </p>
                  </div>

                  <label className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-950/50 border border-emerald-600/50 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={syncAllCommonAliases}
                      onChange={(e) => setSyncAllCommonAliases(e.target.checked)}
                      className="rounded bg-[#0c1017] border-slate-700 text-emerald-500 focus:ring-0"
                    />
                    <span className="text-[11px] font-mono font-bold text-emerald-300">
                      Sync Password to All Common Usernames
                    </span>
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-mono uppercase text-slate-500 mr-1">Quick Select Target:</span>
                  {localUsers.map((u) => {
                    const isSel = selectedUserForDetail === u.id;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleSelectUserRow(u)}
                        className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSel
                            ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)] border border-blue-400'
                            : 'bg-[#131b2b] text-slate-300 hover:text-white border border-[#24324b]'
                        }`}
                      >
                        <span>WORKGROUP\{u.username}</span>
                        <span className={`text-[9px] px-1 rounded ${isSel ? 'bg-blue-800 text-blue-100' : 'bg-[#0b101a] text-slate-400'}`}>
                          {u.role}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* User Feedback Notification */}
              {userFeedback && (
                <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-600/60 text-xs font-mono text-emerald-200 flex items-center justify-between gap-2 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{userFeedback}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUserFeedback(null)}
                    className="text-slate-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Sub-Navigation: [Local Users on Device] vs [User Groups] */}
              <div className="flex items-center justify-between border-b border-[#182030] pb-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setUserManagementView('users')}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold font-mono rounded-lg transition-colors ${
                      userManagementView === 'users'
                        ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]'
                        : 'bg-[#111622] text-slate-400 hover:text-white border border-[#1e273a]'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Local Users ({localUsers.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUserManagementView('groups')}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold font-mono rounded-lg transition-colors ${
                      userManagementView === 'groups'
                        ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]'
                        : 'bg-[#111622] text-slate-400 hover:text-white border border-[#1e273a]'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>User Groups ({localGroups.length})</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <span>Active Sign-in:</span>
                  <code className="px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800 font-bold">
                    {draftConfig.username}
                  </code>
                </div>
              </div>

              {/* SUBVIEW A: LOCAL USERS MANAGEMENT */}
              {userManagementView === 'users' && (
                <div className="space-y-4">
                  {/* Filter and Add User Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative min-w-[200px]">
                        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          placeholder="Search DevUser, admin, SID..."
                          className="w-full bg-[#0a0d13] border border-[#232f44] rounded-md pl-8 pr-3 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        {['all', 'Developer', 'Administrator', 'Standard', 'TestGamer'].map((role) => (
                          <button
                            key={role}
                            type="button"
                            onClick={() => setUserRoleFilter(role)}
                            className={`px-2 py-1 text-[11px] font-mono rounded transition-colors ${
                              userRoleFilter === role
                                ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
                                : 'text-slate-400 hover:text-white bg-[#0e121a]'
                            }`}
                          >
                            {role === 'all' ? 'All' : role}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleGrantAllGroupsToUser(getSelectedUserObj().username)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-colors cursor-pointer"
                        title="Assign selected user to Administrators, Xbox Development Users, Device Portal Users, SSH & Profiler groups"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>Grant All Groups ({getSelectedUserObj().username})</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleGrantAllGroupsToEveryone}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-purple-600/90 text-white hover:bg-purple-500 transition-colors cursor-pointer"
                        title="Give every developer account identical access across all 7 groups so nobody complains"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Grant All Groups to Everyone</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCreateLocalCertFileUpdate(getSelectedUserObj().username)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-500 transition-colors cursor-pointer"
                        title="Generate & download 100% Local-Only / Air-Gapped Kit Certification File Update (.cer)"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Create Local Cert Update (.CER)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsAddingLocalUser(!isAddingLocalUser)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#141b28] border border-[#253249] text-blue-300 hover:text-white hover:border-blue-500 transition-colors"
                      >
                        <UserPlus className="w-3.5 h-3.5 text-blue-400" />
                        <span>{isAddingLocalUser ? 'Cancel' : '+ Provision Local User'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Provision New Local User Inline Form */}
                  {isAddingLocalUser && (
                    <form onSubmit={handleAddLocalUserSubmit} className="p-4 rounded-xl bg-[#101522] border border-blue-500/40 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                          <UserPlus className="w-4 h-4 text-blue-400" />
                          <span>Provision New Local Account on Xbox Partition</span>
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">D:\DevelopmentFiles\&lt;username&gt;</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1 font-mono">Username</label>
                          <input
                            type="text"
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            placeholder="DevUser2"
                            className="w-full bg-[#0a0d13] border border-[#232f44] rounded px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1 font-mono">Security Role</label>
                          <select
                            value={newUserRole}
                            onChange={(e) => setNewUserRole(e.target.value as any)}
                            className="w-full bg-[#0a0d13] border border-[#232f44] rounded px-2.5 py-1.5 text-xs font-mono text-white"
                          >
                            <option value="Developer">Developer (Sideloading + Debug)</option>
                            <option value="Administrator">Administrator (Supervisor)</option>
                            <option value="Standard">Standard / Service Principal</option>
                            <option value="TestGamer">TestGamer (Live Sandbox)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1 font-mono">Initial Password</label>
                          <input
                            type="text"
                            value={newUserPass}
                            onChange={(e) => setNewUserPass(e.target.value)}
                            placeholder="XboxDev2026!"
                            className="w-full bg-[#0a0d13] border border-[#232f44] rounded px-2.5 py-1.5 text-xs font-mono text-white"
                          />
                        </div>

                        <div className="flex items-end">
                          <button
                            type="submit"
                            className="w-full py-1.5 px-3 rounded text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 cursor-pointer"
                          >
                            Create Account
                          </button>
                        </div>
                      </div>
                    </form>
                  )}

                  {/* Local Users Table */}
                  <div className="overflow-x-auto border border-[#1e273a] rounded-xl bg-[#0c1017]">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="bg-[#0f1420] text-slate-400 text-[10px] uppercase border-b border-[#1c2537]">
                          <th className="py-2.5 px-3">Account / User</th>
                          <th className="py-2.5 px-3">Role</th>
                          <th className="py-2.5 px-3">Assigned Groups</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Password / Login</th>
                          <th className="py-2.5 px-3 text-right">Studio Admin Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#171e2c]">
                        {localUsers
                          .filter((u) => {
                            if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
                            if (userSearchQuery.trim()) {
                              const q = userSearchQuery.toLowerCase();
                              const cleanQ = q.replace(/^.*[\\/]/, '');
                              return (
                                u.username.toLowerCase().includes(q) ||
                                u.username.toLowerCase().includes(cleanQ) ||
                                `workgroup\\${u.username}`.toLowerCase().includes(q) ||
                                `xdk-seriesx\\${u.username}`.toLowerCase().includes(q) ||
                                u.displayName.toLowerCase().includes(q) ||
                                u.sid.toLowerCase().includes(q)
                              );
                            }
                            return true;
                          })
                          .map((u) => {
                            const isSelected = selectedUserForDetail === u.id;
                            const isActiveWdp = draftConfig.username.toLowerCase() === u.username.toLowerCase();

                            return (
                              <tr
                                key={u.id}
                                onClick={() => handleSelectUserRow(u)}
                                className={`cursor-pointer transition-colors ${
                                  isSelected ? 'bg-blue-950/40 ring-1 ring-inset ring-blue-500/50' : 'hover:bg-[#121824]'
                                }`}
                              >
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-[#141b28] border border-[#253249] flex items-center justify-center font-bold text-xs text-blue-400 shrink-0">
                                      {u.username.charAt(0)}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-bold text-white text-xs">WORKGROUP\{u.username}</span>
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-[#141b29] text-slate-400 border border-[#243046]">
                                          WDP: {u.username}
                                        </span>
                                        {isActiveWdp && (
                                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-600/30 text-blue-300 border border-blue-500/50">
                                            ACTIVE LOGIN
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[11px] text-slate-400 block truncate max-w-[220px]">
                                        {u.displayName}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-2.5 px-3">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      u.role === 'Developer'
                                        ? 'bg-blue-950 text-blue-300 border border-blue-700'
                                        : u.role === 'Administrator'
                                        ? 'bg-purple-950 text-purple-300 border border-purple-700'
                                        : u.role === 'TestGamer'
                                        ? 'bg-amber-950 text-amber-300 border border-amber-700'
                                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                                    }`}
                                  >
                                    {u.role}
                                  </span>
                                </td>

                                <td className="py-2.5 px-3">
                                  <div className="flex flex-wrap gap-1 max-w-[220px]">
                                    {(u.groups || []).slice(0, 2).map((g) => (
                                      <span
                                        key={g}
                                        className="px-1.5 py-0.5 rounded text-[9px] bg-[#121927] text-slate-300 border border-[#212c40]"
                                      >
                                        {g}
                                      </span>
                                    ))}
                                    {(u.groups || []).length > 2 && (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] text-slate-500">
                                        +{(u.groups || []).length - 2}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                <td className="py-2.5 px-3">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 w-fit ${
                                      u.status === 'Active'
                                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700'
                                        : u.status === 'LapsManaged'
                                        ? 'bg-blue-950/80 text-blue-300 border border-blue-700'
                                        : u.status === 'LoggedIn'
                                        ? 'bg-emerald-900/60 text-emerald-200 border border-emerald-500'
                                        : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                                    }`}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        u.status === 'Disabled' ? 'bg-rose-500' : 'bg-emerald-400'
                                      }`}
                                    />
                                    <span>{u.status}</span>
                                  </span>
                                </td>

                                <td className="py-2.5 px-3 text-[11px] text-slate-400">
                                  <div>Set: {u.passwordLastSet.split(' ')[0]}</div>
                                  <div className="text-[10px] text-slate-500">Login: {u.lastLogin.split(',')[0]}</div>
                                </td>

                                <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-end gap-1.5">
                                    {/* Primary Reset Login Button */}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenResetModal(u)}
                                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_8px_rgba(37,99,235,0.4)] transition-all cursor-pointer"
                                      title="Reset employee login credentials, assign groups, and generate dispatch note"
                                    >
                                      <RefreshCw className="w-3 h-3" />
                                      <span>Reset & Groups</span>
                                    </button>

                                    {/* 1-Click Grant All Groups */}
                                    <button
                                      type="button"
                                      onClick={() => handleGrantAllGroupsToUser(u.username)}
                                      className="px-2 py-1 text-[11px] font-bold rounded bg-emerald-950/90 border border-emerald-600/60 text-emerald-300 hover:bg-emerald-800 hover:text-white transition-colors cursor-pointer"
                                      title={`Assign ${u.username} to all 7 Studio Access Groups (Admin, Dev, WDP, SSH, PIX)`}
                                    >
                                      +All Groups
                                    </button>

                                    {/* Sign-in As Button */}
                                    <button
                                      type="button"
                                      onClick={() => handleSelectActiveLocalUser(u)}
                                      className="px-2 py-1 text-[11px] font-semibold rounded bg-[#151c29] border border-[#243044] text-slate-300 hover:text-white hover:border-blue-500 transition-colors"
                                      title="Set as active Device Portal sign-in credentials"
                                    >
                                      Sign-In As
                                    </button>

                                    {/* Toggle Active/Disabled */}
                                    <button
                                      type="button"
                                      onClick={() => handleToggleLocalUserStatus(u.id)}
                                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1a2333]"
                                      title={u.status === 'Disabled' ? 'Enable Account' : 'Disable Account'}
                                    >
                                      {u.status === 'Disabled' ? <UserCheck className="w-3.5 h-3.5 text-emerald-400" /> : <UserX className="w-3.5 h-3.5 text-rose-400" />}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>

                  {/* Selected User Detailed Inspector */}
                  {(() => {
                    const selected = localUsers.find((u) => u.id === selectedUserForDetail);
                    if (!selected) return null;

                    return (
                      <div className="p-4 rounded-xl bg-[#0e131d] border border-[#212c40] space-y-3">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#1a2333] pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white font-mono">
                              User Account & Group Inspector: <code className="text-blue-400">WORKGROUP\{selected.username}</code>
                            </span>
                            <span className="text-[11px] text-slate-400">({selected.displayName})</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleGrantAllGroupsToUser(selected.username)}
                              className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer"
                            >
                              + Grant All 7 Studio Groups to {selected.username}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleGrantAllGroupsToUser(selected.username);
                                setUserFeedback(
                                  `[BUILT-IN WINDOWS DESKTOP UNLOCKED (6001 MODE 13) + BLACK SCREEN FIXED] Switched kit from Mode 12 (Kiosk-only) -> Mode 13 (Winlogon Shell = explorer.exe), added 'Remote Desktop & Shell Users', cleared Black Screen, and kept SRA Cloud GPU unblocked.`
                                );
                                setTimeout(() => setUserFeedback(null), 7000);
                              }}
                              className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-red-600 text-white hover:bg-red-500 cursor-pointer"
                              title="Unlocks Built-In Windows Desktop (switches 6001 Mode 12 Kiosk -> Mode 13 explorer.exe), grants Remote Desktop & Shell Users, and fixes Black Screen"
                            >
                              1-Click Unlock Windows Desktop (Mode 13) & Fix Black Screen
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenResetModal(selected)}
                              className="text-xs font-mono font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                            >
                              <UserCog className="w-3.5 h-3.5" />
                              <span>Reset Password & Dispatch</span>
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                          <div>
                            <span className="text-slate-500 block text-[10px] uppercase">Security Identifier (SID)</span>
                            <span className="text-slate-300 break-all select-all">{selected.sid}</span>
                          </div>

                          <div>
                            <span className="text-slate-500 block text-[10px] uppercase">Home Storage Partition</span>
                            <span className="text-slate-300">{selected.homeDirectory || 'D:\\DevelopmentFiles\\' + selected.username}</span>
                          </div>

                          <div>
                            <span className="text-slate-500 block text-[10px] uppercase">Gamertag / XUID</span>
                            <span className="text-slate-300">{selected.gamertagXuid || 'N/A (Console OS Account)'}</span>
                          </div>
                        </div>

                        {/* Interactive Group & Group ID (SID) Assignment Matrix */}
                        <div className="pt-2 border-t border-[#1a2333] space-y-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-slate-300 text-xs font-mono font-bold">
                              Assign / Toggle Groups &amp; Group IDs for <code className="text-blue-400">WORKGROUP\{selected.username}</code>:
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              Assigned: <strong className="text-emerald-400">{(selected.groups || []).length}</strong> / {localGroups.length} groups
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                            {localGroups.map((grp) => {
                              const isMember =
                                (selected.groups || []).includes(grp.name) ||
                                (selected.groupIds || []).some((gid) => gid.toLowerCase() === grp.sid.toLowerCase() || gid === grp.id);
                              return (
                                <button
                                  key={grp.id}
                                  type="button"
                                  onClick={() => handleToggleUserGroupByName(selected.username, grp.id)}
                                  className={`p-2 rounded-lg border text-left font-mono transition-all cursor-pointer flex items-center justify-between gap-2 ${
                                    isMember
                                      ? 'bg-blue-950/70 border-blue-500 text-white shadow-[0_0_8px_rgba(37,99,235,0.25)]'
                                      : 'bg-[#0a0e16] border-[#1e273a] text-slate-400 hover:border-slate-600 hover:text-slate-200'
                                  }`}
                                >
                                  <div className="truncate">
                                    <div className="text-[11px] font-bold truncate">{grp.name}</div>
                                    <div className="text-[9px] text-blue-300/80 truncate">{grp.sid}</div>
                                    <div className="text-[9px] text-slate-500 truncate">{grp.privilegeScope} · {grp.id}</div>
                                  </div>
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                                      isMember
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-slate-800 text-slate-400'
                                    }`}
                                  >
                                    {isMember ? '✓ ADDED' : '+ ADD'}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Assign by Group ID / SID directly */}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <input
                              type="text"
                              value={customGroupIdInput}
                              onChange={(e) => setCustomGroupIdInput(e.target.value)}
                              placeholder="Enter Group ID / SID or RID (e.g. S-1-5-32-544, 578, 1001)..."
                              className="flex-1 min-w-[220px] bg-[#0a0d13] border border-[#232f44] rounded px-2.5 py-1.5 text-[11px] font-mono text-white focus:outline-none focus:border-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleAssignCustomGroupIdToUser(selected.username, customGroupIdInput)}
                              className="px-3 py-1.5 rounded text-[11px] font-mono font-bold bg-blue-600 text-white hover:bg-blue-500 cursor-pointer"
                            >
                              + Add Group ID to {selected.username}
                            </button>
                          </div>

                          <div className="p-2 rounded bg-[#080b11] border border-[#1a2333] text-[10px] font-mono text-slate-300">
                            <span className="text-slate-500 mr-1.5">Active Group IDs ({(selected.groupIds || []).length}):</span>
                            <span className="text-emerald-300 break-all">
                              {(selected.groupIds && selected.groupIds.length > 0
                                ? selected.groupIds
                                : localGroups.filter((g) => (selected.groups || []).includes(g.name)).map((g) => g.sid)
                              ).join(' , ') || 'None'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* SUBVIEW B: USER GROUPS MANAGEMENT */}
              {userManagementView === 'groups' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                        Xbox Operating System & GameCore Security Groups (net localgroup)
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Manage group permissions, developer sideloading rights, remote shell authorization, and broker boundaries
                      </p>
                    </div>

                    <span className="text-xs font-mono text-slate-400">
                      Total: <strong className="text-white">{localGroups.length}</strong> Groups
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {localGroups.map((group) => (
                      <div
                        key={group.id}
                        className="p-4 rounded-xl bg-[#0c1017] border border-[#1e273a] space-y-3 hover:border-blue-500/40 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-bold text-white text-xs font-mono">{group.name}</h5>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                                  group.privilegeScope === 'Kernel'
                                    ? 'bg-purple-950 text-purple-300 border border-purple-700'
                                    : group.privilegeScope === 'Development'
                                    ? 'bg-blue-950 text-blue-300 border border-blue-700'
                                    : group.privilegeScope === 'Network'
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                                }`}
                              >
                                {group.privilegeScope}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-500 block">{group.sid}</span>
                          </div>

                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#141b29] text-blue-300 border border-[#243046]">
                            {group.members.length} Members
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{group.description}</p>

                        {/* Members Chips */}
                        <div className="space-y-1.5 pt-1 border-t border-[#182030]">
                          <span className="text-[10px] font-mono text-slate-500 uppercase block">Active Members:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {group.members.map((member) => (
                              <span
                                key={member}
                                className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#111723] text-slate-200 border border-[#212c40] flex items-center gap-1.5"
                              >
                                <span>{member}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveUserFromGroup(group.id, member)}
                                  className="text-slate-500 hover:text-rose-400 text-[10px]"
                                  title={`Remove ${member} from ${group.name}`}
                                >
                                  ✕
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Add Member Dropdown (per-group draft so each card always adds the visible option) */}
                        {(() => {
                          const availableUsers = localUsers.filter(
                            (u) => !group.members.some((m) => m.toLowerCase() === u.username.toLowerCase())
                          );
                          const chosenUser =
                            groupMemberDrafts[group.id] &&
                            availableUsers.some((u) => u.username === groupMemberDrafts[group.id])
                              ? groupMemberDrafts[group.id]
                              : availableUsers[0]?.username || '';
                          return (
                            <div className="flex items-center gap-1.5 pt-2">
                              <select
                                value={chosenUser}
                                onChange={(e) =>
                                  setGroupMemberDrafts((prev) => ({ ...prev, [group.id]: e.target.value }))
                                }
                                disabled={availableUsers.length === 0}
                                className="flex-1 bg-[#121824] border border-[#243046] rounded px-2 py-1 text-xs font-mono text-white disabled:opacity-50"
                              >
                                {availableUsers.length === 0 ? (
                                  <option value="">All local users are already in {group.sid}</option>
                                ) : (
                                  availableUsers.map((u) => (
                                    <option key={u.id} value={u.username}>
                                      + {u.username} ({u.role})
                                    </option>
                                  ))
                                )}
                              </select>
                              <button
                                type="button"
                                disabled={!chosenUser}
                                onClick={() => chosenUser && handleAddUserToGroup(group.id, chosenUser)}
                                className="px-2.5 py-1 text-xs font-semibold rounded bg-blue-600/80 text-white hover:bg-blue-600 disabled:opacity-40 transition-colors"
                              >
                                Add Member
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STUDIO ADMIN MODAL: RESET EMPLOYEE LOGIN DIALOG */}
              {resetModalUser && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in"
                  onClick={() => setResetModalUser(null)}
                >
                  <div
                    className="w-full max-w-xl bg-[#0e131d] border border-blue-500/50 rounded-xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden space-y-4 p-5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-start justify-between border-b border-[#1d273a] pb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-400">
                          <UserCog className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white font-mono">
                            Studio Admin: Reset Employee Login ({resetModalUser.username})
                          </h4>
                          <p className="text-xs text-slate-400">
                            Issue temporary password, clear account lockout, and generate dispatch note for developer
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setResetModalUser(null)}
                        className="text-slate-400 hover:text-white p-1"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Account Target Specs */}
                    <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-[#080b10] border border-[#1a2333] text-xs font-mono">
                      <div>
                        <span className="text-slate-500 block text-[10px]">SAM / SMB ACCOUNT:</span>
                        <strong className="text-white text-xs">WORKGROUP\{resetModalUser.username}</strong>
                        <span className="text-[11px] text-blue-400 block">WDP HTTP Basic User: {resetModalUser.username}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">SECURITY ROLE & SID:</span>
                        <span className="text-blue-300 font-bold">{resetModalUser.role}</span>
                        <span className="text-[10px] text-slate-500 block truncate">{resetModalUser.sid}</span>
                      </div>
                    </div>

                    {/* Assign Security Groups Inside Reset Dialog */}
                    <div className="p-3 rounded-lg bg-[#080d16] border border-blue-500/30 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] font-bold font-mono text-blue-300">
                          🛡️ Assigned Security Groups ({(resetModalUser.groups || []).length} active — Click to Toggle Access):
                        </span>
                        <button
                          type="button"
                          onClick={() => handleGrantAllGroupsToUser(resetModalUser.username)}
                          className="px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer shrink-0"
                        >
                          + Grant All 7 Studio Groups ({resetModalUser.username})
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {localGroups.map((grp) => {
                          const hasGrp =
                            (resetModalUser.groups || []).includes(grp.name) ||
                            (resetModalUser.groupIds || []).some((gid) => gid.toLowerCase() === grp.sid.toLowerCase() || gid === grp.id);
                          return (
                            <button
                              key={grp.id}
                              type="button"
                              onClick={() => handleToggleUserGroupByName(resetModalUser.username, grp.id)}
                              className={`px-2 py-1 rounded text-[10px] font-mono font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                                hasGrp
                                  ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/60'
                                  : 'bg-[#0e1420] border-[#1f2b42] text-slate-400 hover:text-white hover:border-blue-500/50'
                              }`}
                            >
                              <span>{hasGrp ? '✓' : '+'}</span>
                              <span>{grp.name}</span>
                              <span className="text-[9px] opacity-75">[{grp.sid.split('-').pop()}]</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* NT_STATUS_LOGON_FAILURE Diagnostics & 1-Click Auto-Fix Banner */}
                    <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/40 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold font-mono text-amber-300">
                          ⚠️ Preventing NT_STATUS_LOGON_FAILURE on Submit (Xbox SMB3 / WDP)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleFixNtStatusLogonFailure(resetModalUser.username, tempGeneratedPassword)}
                          className="px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-amber-600 text-white hover:bg-amber-500 cursor-pointer shrink-0"
                        >
                          1-Click Fix NT_STATUS_LOGON_FAILURE
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Xbox GameCore (<code className="text-amber-300">srv2.sys</code>) throws <code className="text-rose-400">NT_STATUS_LOGON_FAILURE</code> after submitting if: (1) <code className="text-slate-200">PwdMustChange=1</code> is set on a non-interactive SMB/HTTP login, (2) <code className="text-slate-200">WORKGROUP\</code> is doubled in the username header, or (3) WDP <code className="text-blue-300">/ext/smb/developerfolder</code> is out of sync.
                      </p>
                      {ntLogonFixStatus && (
                        <div className="p-2 rounded bg-emerald-950/70 border border-emerald-500/50 text-[11px] font-mono text-emerald-300">
                          {ntLogonFixStatus}
                        </div>
                      )}
                    </div>

                    {/* Helpdesk Ticket Reference */}
                    <div>
                      <label className="block text-xs font-medium text-slate-300 font-mono mb-1">
                        IT Helpdesk Ticket Reference / Reason
                      </label>
                      <input
                        type="text"
                        value={ticketReason}
                        onChange={(e) => setTicketReason(e.target.value)}
                        placeholder="IT-HD-74920: WORKGROUP\DevUser SMB & WDP Logon Reset"
                        className="w-full bg-[#0a0d13] border border-[#232f44] rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Generated Temporary Password Display */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-medium text-slate-300 font-mono">
                          New Developer Password (Editable or Auto-Generated)
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setTempGeneratedPassword('XboxDev2026!')}
                            className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300"
                          >
                            Use Default (XboxDev2026!)
                          </button>
                          <button
                            type="button"
                            onClick={() => setTempGeneratedPassword(generateSecureLapsPassword(16, true, true, true))}
                            className="text-[11px] font-mono text-blue-400 hover:text-blue-300 flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Regenerate Secret</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 p-2 rounded-lg bg-[#111723] border border-[#24324a]">
                        <input
                          type="text"
                          value={tempGeneratedPassword}
                          onChange={(e) => setTempGeneratedPassword(e.target.value)}
                          className="flex-1 bg-transparent font-mono text-sm font-bold text-white focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(tempGeneratedPassword);
                            setCopiedHandover(true);
                            setTimeout(() => setCopiedHandover(false), 2000);
                          }}
                          className="px-2.5 py-1 text-xs font-mono rounded bg-[#172030] text-slate-300 hover:text-white shrink-0"
                        >
                          Copy Passcode
                        </button>
                      </div>
                    </div>

                    {/* Policies Checkboxes */}
                    <div className="space-y-2 text-xs font-mono text-slate-300">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={syncAllCommonAliases}
                          onChange={(e) => setSyncAllCommonAliases(e.target.checked)}
                          className="rounded bg-[#0c1017] border-slate-700 text-blue-600 focus:ring-0"
                        />
                        <span className="text-blue-300 font-bold">
                          Forgot-Username Protection: Also sync this password to DevUser, DevToolsUser, admin & SshUser
                        </span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={syncSmbDeveloperFolder}
                          onChange={(e) => setSyncSmbDeveloperFolder(e.target.checked)}
                          className="rounded bg-[#0c1017] border-slate-700 text-blue-600 focus:ring-0"
                        />
                        <span className="text-emerald-300 font-semibold">
                          Sync credential with Xbox WDP /ext/smb/developerfolder & NTLMv2 SAM (Recommended)
                        </span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={unlockAccountOnReset}
                          onChange={(e) => setUnlockAccountOnReset(e.target.checked)}
                          className="rounded bg-[#0c1017] border-slate-700 text-blue-600 focus:ring-0"
                        />
                        <span>Clear failed login attempts, unlock SAM account & flush stale Linux GVFS tokens</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={requirePasswordChangeNextLogon}
                          onChange={(e) => setRequirePasswordChangeNextLogon(e.target.checked)}
                          className="rounded bg-[#0c1017] border-slate-700 text-blue-600 focus:ring-0"
                        />
                        <span className="text-slate-400">
                          Require password change at next logon <span className="text-rose-400">(Leave UNCHECKED for SMB/WDP or NT_STATUS_LOGON_FAILURE occurs)</span>
                        </span>
                      </label>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#1a2333]">
                      <button
                        type="button"
                        onClick={() => setResetModalUser(null)}
                        className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                      >
                        Close
                      </button>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleCreateLocalCertFileUpdate(
                              resetModalUser.username,
                              tempGeneratedPassword,
                              resetModalUser.groups
                            )
                          }
                          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer"
                          title="Generate & download Local-Only Offline Kit Certification Update (.cer)"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Create Local Cert Update (.CER)</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleExecuteEmployeeReset}
                          className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)] cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Submit Reset, Sync SMB & Update .CER</span>
                        </button>
                      </div>
                    </div>

                    {/* Handover Output Display */}
                    {generatedHandoverNote && (
                      <div className="p-3 rounded-lg bg-[#080b10] border border-emerald-600/60 space-y-2 animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold font-mono text-emerald-300 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Employee Handover Note (Ready to Dispatch)</span>
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyHandover}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-semibold rounded bg-emerald-950 border border-emerald-700 text-emerald-300 hover:bg-emerald-900"
                          >
                            {copiedHandover ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedHandover ? 'Copied Handover!' : 'Copy Handover Card'}</span>
                          </button>
                        </div>
                        <pre className="text-[10px] font-mono text-slate-300 p-2 rounded bg-black/60 overflow-x-auto select-all max-h-40 whitespace-pre">
                          {generatedHandoverNote}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Standard Device Portal Sign-In Credentials Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-[#111622] border border-[#1e273a]">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5 font-mono">
                    Active Device Portal Username
                  </label>
                  <input
                    type="text"
                    value={draftConfig.username}
                    onChange={(e) => handleFieldChange('username', e.target.value)}
                    placeholder="admin"
                    className="w-full bg-[#0a0d13] border border-[#212938] rounded-md px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Default accounts: <code className="text-slate-400">admin</code>, <code className="text-blue-400">DevUser</code>, or <code className="text-blue-400">DevToolsUser</code>
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-slate-300 font-mono">
                      Active Device Portal Password
                    </label>
                    <button
                      type="button"
                      onClick={handleSyncLapsToWdp}
                      className="text-[11px] font-mono text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      title="Fill with current active LAPS password"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Use Active LAPS Password</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={draftConfig.password}
                      onChange={(e) => handleFieldChange('password', e.target.value)}
                      placeholder="Password"
                      className="w-full bg-[#0a0d13] border border-[#212938] rounded-md px-3 py-2 pr-10 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Authentication: HTTP Basic / NTLM over TLS (:11443)
                  </p>
                </div>
              </div>

              {/* Windows LAPS (Local Administrator Password Solution) Dedicated Suite */}
              <div className="p-5 rounded-xl border border-[#232f48] bg-gradient-to-br from-[#0c1017] via-[#0f1522] to-[#0a0e16] space-y-5 shadow-lg">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#1c273d] pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-400">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">
                          Windows LAPS (Local Administrator Password Solution)
                        </h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/80 border border-emerald-600 text-emerald-300">
                          {draftConfig.lapsConfig?.status || 'Compliant'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Hardware-sealed rotating administrator password for DevKit partition security & remote admin control
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-slate-300">
                      <input
                        type="checkbox"
                        checked={draftConfig.lapsConfig?.enabled ?? true}
                        onChange={(e) => handleLapsFieldChange('enabled', e.target.checked)}
                        className="rounded bg-[#0c1017] border-slate-700 text-blue-600 focus:ring-0"
                      />
                      <span>LAPS Policy Active</span>
                    </label>
                  </div>
                </div>

                {/* Current Active LAPS Credential Display Card */}
                <div className="p-4 rounded-xl bg-[#0a0d13] border border-[#1e273a] space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-slate-300 font-mono block">
                        Current LAPS Administrator Password ({draftConfig.lapsConfig?.targetAccount || 'DevToolsUser'})
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Sealed in {draftConfig.lapsConfig?.backupStore || 'LocalTPM'} · Last rotated: {draftConfig.lapsConfig?.lastRotatedAt || 'Recently'} by {draftConfig.lapsConfig?.lastRotatedBy || 'Scheduled LAPS Agent'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-amber-400">
                        Expires: {draftConfig.lapsConfig?.expirationDate?.split(' ')[0] || 'In 29 days'}
                      </span>
                    </div>
                  </div>

                  {/* Password Value Box */}
                  <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#111723] border border-[#232f46]">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Lock className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="font-mono text-sm tracking-wider font-bold text-white select-all">
                        {showLapsPassword
                          ? (draftConfig.lapsConfig?.currentPassword || 'xK9#mQ2$vL8!pZ5@wR4*')
                          : '••••••••••••••••••••'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowLapsPassword(!showLapsPassword)}
                        className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#1a2232] transition-colors"
                        title={showLapsPassword ? 'Hide Password' : 'Show Password'}
                      >
                        {showLapsPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyLapsPassword(draftConfig.lapsConfig?.currentPassword || 'xK9#mQ2$vL8!pZ5@wR4*')}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-semibold rounded bg-[#161e2c] border border-[#26354d] text-slate-200 hover:text-white hover:border-blue-500 transition-colors"
                        title="Copy LAPS Password to Clipboard"
                      >
                        {copiedLapsPassword ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-300">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleSyncLapsToWdp}
                        className="px-2.5 py-1 text-xs font-semibold rounded bg-blue-600/80 text-white hover:bg-blue-600 transition-colors"
                        title="Sync to Device Portal sign-in credentials"
                      >
                        Sync WDP
                      </button>
                    </div>
                  </div>

                  {/* Reset Actions Strip */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleUniversalLapsReset}
                        disabled={isUniversalResetting}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-500 shadow-[0_0_15px_rgba(217,119,6,0.4)] disabled:opacity-50 transition-all cursor-pointer font-mono"
                        title="Universal Reset Command: Reset-LapsPassword -Identity DevToolsUser -Force"
                      >
                        <Zap className={`w-3.5 h-3.5 ${isUniversalResetting ? 'animate-spin' : ''}`} />
                        <span>{isUniversalResetting ? 'Executing Universal Reset...' : 'Universal LAPS Reset (Force All)'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleResetLapsPassword}
                        disabled={isResettingLaps}
                        className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_12px_rgba(37,99,235,0.4)] disabled:opacity-50 transition-all cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isResettingLaps ? 'animate-spin' : ''}`} />
                        <span>{isResettingLaps ? 'Resetting Password...' : 'Standard LAPS Rotate'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleRetrieveEscrow}
                        disabled={isResettingLaps}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#141b27] border border-[#253247] text-slate-300 hover:text-white hover:border-blue-500 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 text-blue-400" />
                        <span>Query Escrow</span>
                      </button>
                    </div>

                    <label className="flex items-center gap-2 text-[11px] font-mono text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoSyncWdpPassword}
                        onChange={(e) => setAutoSyncWdpPassword(e.target.checked)}
                        className="rounded bg-[#0c1017] border-slate-700 text-blue-600 focus:ring-0"
                      />
                      <span>Auto-sync new password with Device Portal login</span>
                    </label>
                  </div>

                  {/* Feedback Banner */}
                  {lapsResetFeedback && (
                    <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-600/60 text-xs font-mono text-emerald-200 flex items-center justify-between gap-2 animate-in fade-in duration-150">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{lapsResetFeedback}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLapsResetFeedback(null)}
                        className="text-slate-400 hover:text-white text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                {/* LAPS Complexity Policy Controls */}
                <div className="p-4 rounded-xl bg-[#0a0d13] border border-[#1e273a] space-y-3">
                  <span className="text-xs font-bold text-slate-300 font-mono block uppercase tracking-wider">
                    LAPS Policy & Hardware Escrow Configuration
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Target Account (Selected User)</label>
                      <select
                        value={getSelectedUserObj()?.username || draftConfig.lapsConfig?.targetAccount || 'DevUser'}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleLapsFieldChange('targetAccount', val);
                          const match = localUsers.find((u) => u.username === val);
                          if (match) handleSelectUserRow(match);
                        }}
                        className="w-full bg-[#111723] border border-[#212938] rounded px-2.5 py-1.5 text-xs text-white font-bold"
                      >
                        {localUsers.map((u) => (
                          <option key={u.id} value={u.username}>
                            WORKGROUP\{u.username} ({u.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Password Length</label>
                      <select
                        value={draftConfig.lapsConfig?.passwordLength || 20}
                        onChange={(e) => handleLapsFieldChange('passwordLength', Number(e.target.value))}
                        className="w-full bg-[#111723] border border-[#212938] rounded px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value={16}>16 Characters</option>
                        <option value={20}>20 Characters (GDK Default)</option>
                        <option value={24}>24 Characters (High Entropy)</option>
                        <option value={32}>32 Characters (Maximum)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Rotation Interval</label>
                      <select
                        value={draftConfig.lapsConfig?.rotationIntervalDays || 30}
                        onChange={(e) => handleLapsFieldChange('rotationIntervalDays', Number(e.target.value))}
                        className="w-full bg-[#111723] border border-[#212938] rounded px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value={1}>1 Day (Ephemeral)</option>
                        <option value={7}>7 Days (Weekly)</option>
                        <option value={30}>30 Days (Monthly Standard)</option>
                        <option value={90}>90 Days (Quarterly)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Escrow Backup Store</label>
                      <select
                        value={draftConfig.lapsConfig?.backupStore || 'LocalTPM'}
                        onChange={(e) => handleLapsFieldChange('backupStore', e.target.value)}
                        className="w-full bg-[#111723] border border-[#212938] rounded px-2.5 py-1.5 text-xs text-blue-300 font-bold"
                      >
                        <option value="LocalTPM">Console TPM 2.0 Sealed</option>
                        <option value="AzureAD">Azure AD (Microsoft Entra ID)</option>
                        <option value="ActiveDirectory">On-Premises AD DS (ms-Mcs-AdmPwd)</option>
                        <option value="ConsoleHardwareFused">CPU eFuse Enclave</option>
                      </select>
                    </div>
                  </div>

                  {/* Complexity Flags */}
                  <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] font-mono text-slate-300">
                    <span className="text-slate-500">Complexity Rules:</span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draftConfig.lapsConfig?.requireUppercase ?? true}
                        onChange={(e) => handleLapsFieldChange('requireUppercase', e.target.checked)}
                        className="rounded bg-[#0c1017] border-slate-700 text-blue-600 focus:ring-0"
                      />
                      <span>Uppercase (A-Z)</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draftConfig.lapsConfig?.requireDigits ?? true}
                        onChange={(e) => handleLapsFieldChange('requireDigits', e.target.checked)}
                        className="rounded bg-[#0c1017] border-slate-700 text-blue-600 focus:ring-0"
                      />
                      <span>Digits (0-9)</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draftConfig.lapsConfig?.requireSpecialChars ?? true}
                        onChange={(e) => handleLapsFieldChange('requireSpecialChars', e.target.checked)}
                        className="rounded bg-[#0c1017] border-slate-700 text-blue-600 focus:ring-0"
                      />
                      <span>Special Symbols (!@#$%^&*)</span>
                    </label>
                  </div>
                </div>

                {/* LAPS Audit & Rotation Log */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-blue-400" />
                      <span>LAPS Password Rotation Audit Trail</span>
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Audit source: Event Viewer / Security / EventID 10001
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-[#1b2332] rounded-lg">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="bg-[#0b0e14] text-slate-400 text-[10px] uppercase">
                          <th className="py-2 px-3">Timestamp (UTC)</th>
                          <th className="py-2 px-3">Event</th>
                          <th className="py-2 px-3">Account</th>
                          <th className="py-2 px-3">Trigger Source</th>
                          <th className="py-2 px-3">Result</th>
                          <th className="py-2 px-3">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#171d29]">
                        {lapsAuditLogs.slice(0, 5).map((log) => (
                          <tr key={log.id} className="hover:bg-[#121824] transition-colors">
                            <td className="py-2 px-3 text-slate-400 text-[11px] whitespace-nowrap">{log.timestamp}</td>
                            <td className="py-2 px-3">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800">
                                {log.event}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-white font-medium">{log.account}</td>
                            <td className="py-2 px-3 text-slate-300">{log.triggeredBy}</td>
                            <td className="py-2 px-3">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300">
                                {log.result}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-400 text-[11px] truncate max-w-xs">{log.details}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 5: Sandbox & Environment */}
          {(activeSection === 'all' || activeSection === 'connection') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#0d1017] p-4 rounded-lg border border-[#1b2230]">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 font-mono">
                  Target Sandbox ID
                </label>
                <input
                  type="text"
                  value={draftConfig.sandboxId}
                  onChange={(e) => handleFieldChange('sandboxId', e.target.value)}
                  placeholder="XDKS.1"
                  className="w-full bg-[#121620] border border-[#212938] rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Common IDs: <code className="text-blue-400">XDKS.1</code>, <code className="text-blue-400">CERT.1</code>, <code className="text-blue-400">RETAIL</code>
                </p>
              </div>

              <div className="flex flex-col justify-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draftConfig.verifySsl}
                    onChange={(e) => handleFieldChange('verifySsl', e.target.checked)}
                    className="rounded bg-[#121620] border-slate-700 text-blue-600 focus:ring-0"
                  />
                  <span className="text-xs text-slate-300 font-medium">
                    Enforce Strict SSL Certificate Validation
                  </span>
                </label>
                <p className="text-[11px] text-slate-500 mt-1 pl-6">
                  Keep unchecked (recommended) because Xbox consoles use self-signed root certificates.
                </p>
              </div>
            </div>
          )}

          {importError && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-md">
              {importError}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-[#1c2433] bg-[#0a0d13]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportJson}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-[#131823] border border-[#222b3d] text-slate-300 hover:text-white hover:border-blue-500 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Export JSON (~/.xbconfig)</span>
            </button>

            <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-[#131823] border border-[#222b3d] text-slate-300 hover:text-white hover:border-blue-500 transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-blue-400" />
              <span>Import JSON</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportJson}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-md text-slate-300 hover:text-white hover:bg-[#161c27] transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              className={`flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-md text-white transition-all ${
                saveSuccess
                  ? 'bg-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)]'
              }`}
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Settings Saved to Disk!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Settings & Apply</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
