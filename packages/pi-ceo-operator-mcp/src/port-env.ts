/** Map platform-provided PORT when bypassing the Skybridge CLI wrapper.
 * Never override the internal port already chosen by the CLI.
 */
export function configureSkybridgePort(env: NodeJS.ProcessEnv): void {
  if (env.__PORT !== undefined || env.PORT === undefined) return;
  const port = Number(env.PORT);
  if (Number.isSafeInteger(port) && port >= 1 && port <= 65535) {
    env.__PORT = String(port);
  }
}
