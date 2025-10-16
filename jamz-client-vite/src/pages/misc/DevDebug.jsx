import React, { useState } from 'react';

// Simple dev-only debug page useful on mobile browsers (Edge/Safari)
// Features:
//  - Send a structured client log to server (/api/debug/log)
//  - Run a /api/cors-test fetch and show the result

export default function DevDebug() {
  const [lastResult, setLastResult] = useState(null);
  const [sending, setSending] = useState(false);

  const sendClientLog = async (level = 'info') => {
    setSending(true);
    try {
      const payload = {
        level,
        message: `Client debug log (${level}) from ${navigator.userAgent}`,
        meta: {
          href: window.location.href,
          ua: navigator.userAgent,
          time: new Date().toISOString()
        }
      };

      const res = await fetch('/api/debug/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      setLastResult({ ok: res.ok, status: res.status });
    } catch (err) {
      setLastResult({ ok: false, error: err.message });
    } finally {
      setSending(false);
    }
  };

  const runCorsTest = async () => {
    setSending(true);
    try {
      const res = await fetch('/api/cors-test');
      // Read raw text first so we can show exactly what the browser received.
      let rawText = null;
      try {
        rawText = await res.text();
      } catch (textErr) {
        rawText = `Could not read response text: ${textErr && textErr.message}`;
      }

      // Try to parse the raw text as JSON for nicer display
      let parsed = null;
      try {
        parsed = JSON.parse(rawText);
      } catch (parseErr) {
        parsed = { parseError: parseErr && parseErr.message, rawText };
      }

      setLastResult({ ok: res.ok, status: res.status, body: parsed });
    } catch (err) {
      // Capture more details for DOMExceptions and other errors
      const errDetail = {
        name: err && err.name,
        message: err && err.message,
        stack: err && err.stack
      };
      setLastResult({ ok: false, error: errDetail });
    } finally {
      setSending(false);
    }
  };

  if (!import.meta.env.DEV) {
    return <div>Dev debug page is only available in development mode.</div>;
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Dev Debug Console</h2>
      <p>Use this page on a mobile browser to send logs to the server for debugging.</p>

      <div style={{ marginTop: 12 }}>
        <button onClick={() => sendClientLog('info')} disabled={sending}>Send Info Log</button>
        <button onClick={() => sendClientLog('warn')} disabled={sending} style={{ marginLeft: 8 }}>Send Warn Log</button>
        <button onClick={() => sendClientLog('error')} disabled={sending} style={{ marginLeft: 8 }}>Send Error Log</button>
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={runCorsTest} disabled={sending}>Run /api/cors-test</button>
      </div>

      <div style={{ marginTop: 16 }}>
        <strong>Last Result:</strong>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(lastResult, null, 2)}</pre>
      </div>
    </div>
  );
}
