#define MyAppName "Mortal Nexus"
#define MyAppVersion "1.18.0.0"
#define MyAppPublisher "Marshal Law"
#define MyAppExeName "Mortal Nexus.exe"
#define PublishDir "..\production-build"

[Setup]
AppId={{1C25D6B7-3A60-4F0B-AE17-5A0AB82608DE}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\Mortal Nexus
DefaultGroupName=Mortal Nexus
DisableProgramGroupPage=yes
OutputDir=..\dist
OutputBaseFilename=MortalNexusStandaloneSetup
SetupIconFile=..\MortalNexus-v2.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
CloseApplications=yes
RestartApplications=no
SetupLogging=yes
VersionInfoVersion={#MyAppVersion}
VersionInfoCompany={#MyAppPublisher}
VersionInfoDescription=Mortal Nexus standalone self-contained installer
VersionInfoProductName={#MyAppName}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional shortcuts:"; Flags: checkedonce

[Files]
Source: "{#PublishDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\MortalNexus-v2.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\LICENSE"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\THIRD-PARTY-NOTICES.md"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\Mortal Nexus"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\MortalNexus-v2.ico"
Name: "{autodesktop}\Mortal Nexus"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\MortalNexus-v2.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch Mortal Nexus"; Flags: nowait postinstall skipifsilent

[Code]
const
  MainAppId = '{1C25D6B7-3A60-4F0B-AE17-5A0AB82608DE}_is1';
  PreviewAppId = '{5A6E0F0D-2D4D-4A90-9606-5412E44074B4}_is1';
  PrivateAppId = '{8C638B95-5AEF-4B59-AAC1-6A4F07F59D74}_is1';

procedure StopLegacyProcess(const FileName: String);
var
  ResultCode: Integer;
begin
  Exec(ExpandConstant('{sys}\taskkill.exe'), '/F /IM "' + FileName + '"', '', SW_HIDE,
    ewWaitUntilTerminated, ResultCode);
end;

procedure RunRegisteredUninstaller(RootKey: Integer; const AppId: String);
var
  Key: String;
  Command: String;
  Executable: String;
  ClosingQuote: Integer;
  FirstSpace: Integer;
  ResultCode: Integer;
begin
  Key := 'Software\Microsoft\Windows\CurrentVersion\Uninstall\' + AppId;
  if not RegQueryStringValue(RootKey, Key, 'QuietUninstallString', Command) then
    RegQueryStringValue(RootKey, Key, 'UninstallString', Command);
  if Command = '' then Exit;

  Executable := Command;
  if Copy(Executable, 1, 1) = '"' then
  begin
    Delete(Executable, 1, 1);
    ClosingQuote := Pos('"', Executable);
    if ClosingQuote > 0 then Delete(Executable, ClosingQuote, MaxInt);
  end
  else
  begin
    FirstSpace := Pos(' ', Executable);
    if FirstSpace > 0 then Delete(Executable, FirstSpace, MaxInt);
  end;

  if FileExists(Executable) then
    Exec(Executable, '/VERYSILENT /SUPPRESSMSGBOXES /NORESTART', '', SW_HIDE,
      ewWaitUntilTerminated, ResultCode);
end;

procedure RemoveRegisteredVersion(const AppId: String);
begin
  RunRegisteredUninstaller(HKLM64, AppId);
  RunRegisteredUninstaller(HKLM32, AppId);
  RunRegisteredUninstaller(HKCU, AppId);
end;

procedure RemoveLegacyInstallFolders;
begin
  DelTree(ExpandConstant('{autopf}\Mortal Nexus Iron Codex Preview'), True, True, True);
  DelTree(ExpandConstant('{autopf}\Mortal Nexus Private'), True, True, True);
  DelTree(ExpandConstant('{autopf}\Mortal Nexus'), True, True, True);
  DelTree(ExpandConstant('{commonprograms}\Mortal Nexus Iron Codex Preview'), True, True, True);
  DelTree(ExpandConstant('{commonprograms}\Mortal Nexus Private'), True, True, True);
  DelTree(ExpandConstant('{commonprograms}\Mortal Nexus'), True, True, True);
  DelTree(ExpandConstant('{userprograms}\Mortal Nexus Iron Codex Preview'), True, True, True);
  DelTree(ExpandConstant('{userprograms}\Mortal Nexus Private'), True, True, True);
  DelTree(ExpandConstant('{userprograms}\Mortal Nexus'), True, True, True);
  DeleteFile(ExpandConstant('{commondesktop}\Mortal Nexus Iron Codex Preview.lnk'));
  DeleteFile(ExpandConstant('{commondesktop}\Mortal Nexus Private.lnk'));
  DeleteFile(ExpandConstant('{commondesktop}\Mortal Nexus.lnk'));
  DeleteFile(ExpandConstant('{userdesktop}\Mortal Nexus Iron Codex Preview.lnk'));
  DeleteFile(ExpandConstant('{userdesktop}\Mortal Nexus Private.lnk'));
  DeleteFile(ExpandConstant('{userdesktop}\Mortal Nexus.lnk'));
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
begin
  StopLegacyProcess('Mortal Nexus.exe');
  StopLegacyProcess('Mortal Nexus Private.exe');
  StopLegacyProcess('Mortal Nexus Iron Codex Preview.exe');
  RemoveRegisteredVersion(PreviewAppId);
  RemoveRegisteredVersion(PrivateAppId);
  RemoveRegisteredVersion(MainAppId);
  RemoveLegacyInstallFolders;
  Result := '';
end;
