Set oWS = WScript.CreateObject("WScript.Shell")
Dim fso
Set fso = CreateObject("Scripting.FileSystemObject")

' Path resolution (same as before)
currentScriptPath = WScript.ScriptFullName
currentScriptDir = fso.GetParentFolderName(currentScriptPath)
projectRoot = fso.GetParentFolderName(currentScriptDir)

' --- Shortcut 1: Start System (Silent) ---
sLinkFile = oWS.SpecialFolders("Desktop") & "\Sistema Oficina de Administracion.lnk"
Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = projectRoot & "\INICIAR_SILENCIOSO.vbs"
oLink.WorkingDirectory = projectRoot
oLink.Description = "Iniciar Sistema Oficina de Administracion"
oLink.IconLocation = "shell32.dll, 3" 
oLink.Save

' --- Shortcut 2: Stop System ---
sLinkFile2 = oWS.SpecialFolders("Desktop") & "\DETENER SISTEMA.lnk"
Set oLink2 = oWS.CreateShortcut(sLinkFile2)
oLink2.TargetPath = projectRoot & "\DETENER_SISTEMA.bat"
oLink2.WorkingDirectory = projectRoot
oLink2.Description = "Detener el Sistema"
oLink2.IconLocation = "shell32.dll, 27" ' Stop/Error icon
oLink2.Save

WScript.Echo "Shortcuts created successfully on Desktop!"
