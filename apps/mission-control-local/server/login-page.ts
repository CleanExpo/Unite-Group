// Served before sign-in, so it stays in the server and carries no app code.
export const LOGIN_CSS = `
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0e1014;color:#f4f5f7;font:15px ui-monospace,SFMono-Regular,Menlo,monospace}
form{width:320px;padding:28px;background:#191e26;border:1px solid #2e3542;border-radius:6px}
h1{margin:0 0 20px;font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#a7adba}
label{display:block;margin-bottom:8px;font-size:12px;color:#a7adba}
input{width:100%;padding:10px;background:#0e1014;color:#f4f5f7;border:1px solid #2e3542;border-radius:4px;font:inherit}
input:focus{outline:2px solid #ff5c77;outline-offset:1px}
button{width:100%;margin-top:14px;padding:10px;background:#ff3b5c;color:#0e1014;border:0;border-radius:4px;font:inherit;font-weight:700;cursor:pointer}
p{margin:12px 0 0;font-size:12px;color:#f87171}
`;

const MESSAGES = {
  wrong: 'That passcode is not right.',
  locked: 'Too many tries. Wait 30 seconds, then try again.',
} as const;

export type LoginMessage = keyof typeof MESSAGES;

export function loginPage(message?: LoginMessage): string {
  const note = message ? `<p role="alert">${MESSAGES[message]}</p>` : '';
  return `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><title>Mission Control</title><link rel="stylesheet" href="/login.css"></head><body><form method="post" action="/login"><h1>Mission Control</h1><label for="passcode">Passcode</label><input id="passcode" name="passcode" type="password" autocomplete="current-password" autofocus required>${note}<button type="submit">Open</button></form></body></html>`;
}
