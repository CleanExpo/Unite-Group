# Fixed bootstrap broker; stdin is JSON data, never PowerShell source.
# The native child starts suspended and cannot run before Job Object admission.
$ErrorActionPreference = 'Stop'
try {
  # Windows PowerShell 5 defaults Console.In to the OEM code page. Node sends UTF-8.
  $inputReader = [IO.StreamReader]::new([Console]::OpenStandardInput(), [Text.UTF8Encoding]::new($false, $true), $false)
  $request = $inputReader.ReadToEnd() | ConvertFrom-Json
  if (-not [IO.Path]::IsPathRooted($request.executable) -or $request.executable.StartsWith('\\') -or
      [IO.Path]::GetExtension($request.executable) -ne '.exe' -or -not [IO.File]::Exists($request.executable) -or
      -not [IO.Directory]::Exists($request.cwd) -or $request.timeoutMs -lt 1 -or $request.timeoutMs -gt 1800000 -or $request.parentPid -lt 1) {
    throw 'Invalid containment request'
  }
  Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;
public static class UniteResearchJob {
  [StructLayout(LayoutKind.Sequential)] struct SecurityAttributes { public uint nLength; public IntPtr lpSecurityDescriptor; [MarshalAs(UnmanagedType.Bool)] public bool bInheritHandle; }
  [StructLayout(LayoutKind.Sequential)] struct BasicLimits { public long PerProcessUserTimeLimit, PerJobUserTimeLimit; public uint LimitFlags; public UIntPtr MinimumWorkingSetSize, MaximumWorkingSetSize; public uint ActiveProcessLimit; public UIntPtr Affinity; public uint PriorityClass, SchedulingClass; }
  [StructLayout(LayoutKind.Sequential)] struct IoCounters { public ulong ReadOperationCount, WriteOperationCount, OtherOperationCount, ReadTransferCount, WriteTransferCount, OtherTransferCount; }
  [StructLayout(LayoutKind.Sequential)] struct ExtendedLimits { public BasicLimits BasicLimitInformation; public IoCounters IoInfo; public UIntPtr ProcessMemoryLimit, JobMemoryLimit, PeakProcessMemoryUsed, PeakJobMemoryUsed; }
  [StructLayout(LayoutKind.Sequential)] struct Accounting { public long TotalUserTime, TotalKernelTime, ThisPeriodUserTime, ThisPeriodKernelTime; public uint TotalPageFaultCount, TotalProcesses, ActiveProcesses, TotalTerminatedProcesses; }
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] struct StartupInfo { public uint cb; public string lpReserved, lpDesktop, lpTitle; public uint dwX, dwY, dwXSize, dwYSize, dwXCountChars, dwYCountChars, dwFillAttribute, dwFlags; public short wShowWindow, cbReserved2; public IntPtr lpReserved2, hStdInput, hStdOutput, hStdError; }
  [StructLayout(LayoutKind.Sequential)] struct ProcessInfo { public IntPtr hProcess, hThread; public uint dwProcessId, dwThreadId; }
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern IntPtr CreateJobObject(IntPtr attributes, string name);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool SetInformationJobObject(IntPtr job, int infoClass, ref ExtendedLimits info, uint size);
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool CreateProcess(string application, StringBuilder command, IntPtr processAttributes, IntPtr threadAttributes, bool inheritHandles, uint flags, IntPtr environment, string cwd, ref StartupInfo startup, out ProcessInfo process);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);
  [DllImport("kernel32.dll", SetLastError=true)] static extern uint ResumeThread(IntPtr thread);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool TerminateProcess(IntPtr process, uint exitCode);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool TerminateJobObject(IntPtr job, uint exitCode);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool QueryInformationJobObject(IntPtr job, int infoClass, out Accounting info, uint size, IntPtr returnedLength);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool CloseHandle(IntPtr handle);
  [DllImport("kernel32.dll", SetLastError=true)] static extern IntPtr GetStdHandle(int kind);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool GetExitCodeProcess(IntPtr process, out uint exitCode);
  [DllImport("kernel32.dll", SetLastError=true)] static extern IntPtr OpenProcess(uint access, bool inherit, uint pid);
  [DllImport("kernel32.dll", SetLastError=true)] static extern uint WaitForMultipleObjects(uint count, IntPtr[] handles, bool waitAll, uint milliseconds);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool CreatePipe(out IntPtr read, out IntPtr write, ref SecurityAttributes attributes, uint size);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool SetHandleInformation(IntPtr handle, uint mask, uint flags);
  sealed class InputWriter {
    readonly IntPtr handle; readonly string input; readonly System.Threading.Thread thread;
    public bool Complete;
    public InputWriter(IntPtr handle, string input) { this.handle = handle; this.input = input ?? ""; thread = new System.Threading.Thread(Write); thread.IsBackground = true; }
    void Write() {
      try {
        using (var output = new System.IO.FileStream(new Microsoft.Win32.SafeHandles.SafeFileHandle(handle, true), System.IO.FileAccess.Write)) {
          byte[] bytes = new UTF8Encoding(false, true).GetBytes(input); output.Write(bytes, 0, bytes.Length);
        }
        Complete = true;
      } catch { /* The caller refuses successful completion when stdin was not fully written and closed. */ }
    }
    public void Start() { thread.Start(); }
    public bool Join() { return thread.Join(5000); }
  }
  static void Check(bool success) { if (!success) throw new Win32Exception(Marshal.GetLastWin32Error()); }
  static void StopAndConfirm(IntPtr job) {
    Check(TerminateJobObject(job, 124));
    var deadline = System.Diagnostics.Stopwatch.StartNew();
    do {
      Accounting accounting; Check(QueryInformationJobObject(job, 1, out accounting, (uint)Marshal.SizeOf(typeof(Accounting)), IntPtr.Zero));
      if (accounting.ActiveProcesses == 0) return;
      System.Threading.Thread.Sleep(10);
    } while (deadline.ElapsedMilliseconds < 5000);
    throw new InvalidOperationException("Job termination was not confirmed");
  }
  // CommandLineToArgvW-compatible quoting; no cmd.exe or shell interpolation.
  static string Quote(string value) {
    var output = new StringBuilder("\""); int slashes = 0;
    foreach (char character in value) {
      if (character == '\\') { slashes++; continue; }
      if (character == '"') { output.Append('\\', slashes * 2 + 1).Append('"'); slashes = 0; continue; }
      output.Append('\\', slashes).Append(character); slashes = 0;
    }
    return output.Append('\\', slashes * 2).Append('"').ToString();
  }
  public static int Run(string executable, string[] arguments, string input, string cwd, int timeoutMs, int parentPid) {
    var command = new StringBuilder(Quote(executable)); foreach (string argument in arguments) { if (argument.IndexOf('\0') >= 0) return 126; command.Append(' ').Append(Quote(argument)); }
    if (command.Length >= 32767) return 126; // Known zero: preflight precedes every native child creation.
    IntPtr job = IntPtr.Zero, parent = IntPtr.Zero, stdinRead = IntPtr.Zero, stdinWrite = IntPtr.Zero; var process = new ProcessInfo(); bool created = false, assigned = false; InputWriter writer = null;
    try {
      job = CreateJobObject(IntPtr.Zero, null); Check(job != IntPtr.Zero);
      var limits = new ExtendedLimits(); limits.BasicLimitInformation.LimitFlags = 0x00002000; // KILL_ON_JOB_CLOSE; breakaway is never allowed.
      Check(SetInformationJobObject(job, 9, ref limits, (uint)Marshal.SizeOf(typeof(ExtendedLimits))));
      parent = OpenProcess(0x00100000, false, (uint)parentPid); Check(parent != IntPtr.Zero);
      var pipeAttributes = new SecurityAttributes(); pipeAttributes.nLength = (uint)Marshal.SizeOf(typeof(SecurityAttributes)); pipeAttributes.bInheritHandle = true;
      Check(CreatePipe(out stdinRead, out stdinWrite, ref pipeAttributes, 0)); Check(SetHandleInformation(stdinWrite, 1, 0));
      var startup = new StartupInfo(); startup.cb = (uint)Marshal.SizeOf(typeof(StartupInfo)); startup.dwFlags = 0x00000100;
      startup.hStdInput = stdinRead; startup.hStdOutput = GetStdHandle(-11); startup.hStdError = GetStdHandle(-12);
      Check(CreateProcess(executable, command, IntPtr.Zero, IntPtr.Zero, true, 0x08000004, IntPtr.Zero, cwd, ref startup, out process)); // NO_WINDOW | SUSPENDED
      created = true; Check(AssignProcessToJobObject(job, process.hProcess)); assigned = true;
      Check(ResumeThread(process.hThread) != 0xffffffff);
      Check(CloseHandle(stdinRead)); stdinRead = IntPtr.Zero;
      writer = new InputWriter(stdinWrite, input); writer.Start(); stdinWrite = IntPtr.Zero;
      uint outcome = WaitForMultipleObjects(2, new [] { process.hProcess, parent }, false, (uint)timeoutMs);
      if (outcome == 0) {
        uint exitCode; Check(GetExitCodeProcess(process.hProcess, out exitCode)); StopAndConfirm(job);
        if (!writer.Join()) throw new InvalidOperationException("Input writer did not stop");
        if (!writer.Complete) return 127;
        // Reserved broker errors cannot be forged by a native child's own exit code.
        return exitCode == 125 || exitCode == 126 ? 127 : unchecked((int)exitCode);
      }
      if (outcome == 1 || outcome == 258) { StopAndConfirm(job); if (!writer.Join()) throw new InvalidOperationException("Input writer did not stop"); return 124; }
      throw new Win32Exception(Marshal.GetLastWin32Error());
    } finally {
      // Assignment failures leave a suspended process: terminate it before cleanup.
      if (created && !assigned) TerminateProcess(process.hProcess, 125);
      if (job != IntPtr.Zero) CloseHandle(job); // Also kills descendants left behind by an exited child.
      if (process.hThread != IntPtr.Zero) CloseHandle(process.hThread);
      if (process.hProcess != IntPtr.Zero) CloseHandle(process.hProcess);
      if (parent != IntPtr.Zero) CloseHandle(parent);
      if (stdinRead != IntPtr.Zero) CloseHandle(stdinRead);
      if (stdinWrite != IntPtr.Zero) CloseHandle(stdinWrite);
    }
  }
}
'@
  $exitCode = [UniteResearchJob]::Run([string]$request.executable, [string[]]$request.arguments, [string]$request.input, [string]$request.cwd, [int]$request.timeoutMs, [int]$request.parentPid)
  exit $exitCode
} catch {
  [Console]::Error.WriteLine('research_containment_failed')
  exit 125
}
