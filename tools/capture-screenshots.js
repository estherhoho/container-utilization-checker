const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "outputs");
const profileDir = path.join(root, "work", "chrome-profile");
const port = 9223;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForJson(url, timeoutMs = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch (_) {
      // Chrome is still starting.
    }
    await sleep(150);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.events = new Map();
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });
    this.ws.addEventListener("message", (event) => this.onMessage(event));
  }

  onMessage(event) {
    const message = JSON.parse(event.data);
    if (message.id && this.pending.has(message.id)) {
      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result || {});
      return;
    }
    if (message.method && this.events.has(message.method)) {
      const waiters = this.events.get(message.method);
      this.events.delete(message.method);
      waiters.forEach((resolve) => resolve(message.params || {}));
    }
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  waitFor(method, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      const waiters = this.events.get(method) || [];
      waiters.push(resolve);
      this.events.set(method, waiters);
      setTimeout(() => reject(new Error(`Timed out waiting for ${method}`)), timeoutMs);
    });
  }

  close() {
    this.ws.close();
  }
}

async function createPage() {
  const response = await fetch(`http://127.0.0.1:${port}/json/new?http://localhost:4173`, { method: "PUT" });
  if (!response.ok) throw new Error(`Failed to create Chrome tab: ${response.status}`);
  const target = await response.json();
  const client = new CdpClient(target.webSocketDebuggerUrl);
  await client.open();
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  return client;
}

async function captureViewport(name, width, height, mobile) {
  const client = await createPage();
  await client.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: mobile ? 2 : 1,
    mobile
  });
  const load = client.waitFor("Page.loadEventFired");
  await client.send("Page.navigate", { url: "http://localhost:4173" });
  await load;
  await client.send("Runtime.evaluate", {
    expression: `
      localStorage.removeItem('cbm_guide_dismissed');
      document.querySelector('[data-example]').click();
      document.querySelector('#calculator-form').requestSubmit();
    `
  });
  await sleep(1100);
  const metricsResult = await client.send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const verdict = document.querySelector('[data-verdict-block]');
      const detail = document.querySelector('.supporting-details');
      const buttons = Array.from(document.querySelectorAll('.disabled-button'));
      const rect = verdict ? verdict.getBoundingClientRect() : null;
      return {
        viewport: { width: innerWidth, height: innerHeight },
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        hasHorizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        verdictVisibleAboveFold: rect ? rect.top >= 0 && rect.bottom <= innerHeight : false,
        supportingDetailsOpen: detail ? detail.open : null,
        disabledCtas: buttons.map((button) => ({
          ariaDisabled: button.getAttribute('aria-disabled'),
          nativeDisabled: button.hasAttribute('disabled'),
          text: button.textContent.trim()
        })),
        disclaimer: document.querySelector('.disclaimer-strip')?.textContent.trim(),
        resultHeadline: document.querySelector('[data-verdict-block] h2')?.textContent.trim()
      };
    })()`
  });
  const screenshot = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  const file = path.join(outputDir, `${name}-result.png`);
  fs.writeFileSync(file, Buffer.from(screenshot.data, "base64"));
  client.close();
  return { file, metrics: metricsResult.result.value };
}

async function main() {
  fs.mkdirSync(profileDir, { recursive: true });
  const chrome = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    "about:blank"
  ], { stdio: "ignore" });

  try {
    await waitForJson(`http://127.0.0.1:${port}/json/version`);
    const desktop = await captureViewport("desktop", 1280, 900, false);
    const mobile = await captureViewport("mobile", 375, 667, true);
    const report = { desktop, mobile };
    fs.writeFileSync(path.join(outputDir, "screenshot-metrics.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    chrome.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
