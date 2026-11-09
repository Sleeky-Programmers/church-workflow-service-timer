/**
 * The shared clock. Every server message will carry the server's time, and
 * each device corrects itself by the difference, so a phone with a wrong
 * clock still shows the same seconds as the display. Offline, the last
 * known offset keeps being used.
 */
let offset = 0;

export const now = () => Date.now() + offset;

export function syncToServer(serverNow: number) {
  offset = serverNow - Date.now();
}
