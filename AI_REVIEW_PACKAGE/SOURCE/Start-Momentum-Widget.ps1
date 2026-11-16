# Momentum Desktop Widget Launcher
# Launches Momentum as a persistent, docked desktop widget

Add-Type -AssemblyName System.Windows.Forms
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea

$widgetWidth = 420
$widgetHeight = $screen.Height - 10
$widgetX = $screen.Width - $widgetWidth - 5
$widgetY = 5

$url = "http://localhost:5173"

# Ensure local Vite dev server is running
$testConnection = Test-NetConnection -ComputerName "localhost" -Port 5173 -WarningAction SilentlyContinue
if (-not $testConnection.TcpTestSucceeded) {
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev" -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
    Start-Sleep -Seconds 2
}

# Win32 definitions to make window Always-on-Top
$code = @"
using System;
using System.Runtime.InteropServices;

public class Win32 {
    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

    public static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
    public const uint SWP_NOMOVE = 0x0002;
    public const uint SWP_NOSIZE = 0x0001;
    public const uint SWP_SHOWWINDOW = 0x0040;
}
"@
Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue

# Launch Edge or Chrome in App Mode positioned on the right edge of screen
$edgePath = (Get-Command msedge.exe -ErrorAction SilentlyContinue)?.Source
$chromePath = (Get-Command chrome.exe -ErrorAction SilentlyContinue)?.Source

$browserArgs = "--app=$url --window-size=$widgetWidth,$widgetHeight --window-position=$widgetX,$widgetY --user-data-dir=`"$env:LOCALAPPDATA\MomentumWidget`""

if ($edgePath) {
    $proc = Start-Process -FilePath $edgePath -ArgumentList $browserArgs -PassThru
} elseif ($chromePath) {
    $proc = Start-Process -FilePath $chromePath -ArgumentList $browserArgs -PassThru
} else {
    Start-Process -FilePath $url
}

Write-Output "Momentum Desktop Widget is active at ($widgetX, $widgetY) with size ${widgetWidth}x${widgetHeight}."

