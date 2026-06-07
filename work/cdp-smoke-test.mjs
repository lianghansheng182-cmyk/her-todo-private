const endpoint = "http://127.0.0.1:9222";
const appUrl = "http://127.0.0.1:5173/";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getWebSocketUrl() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${endpoint}/json/list`);
      const pages = await response.json();
      const page = pages.find((item) => item.url.includes("127.0.0.1:5173")) || pages[0];
      if (page?.webSocketDebuggerUrl) {
        return page.webSocketDebuggerUrl;
      }
    } catch {
      // Chrome may still be starting.
    }
    await sleep(250);
  }
  throw new Error("Could not find Chrome DevTools websocket");
}

function createClient(wsUrl) {
  const socket = new WebSocket(wsUrl);
  let nextId = 1;
  const pending = new Map();

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) {
        reject(new Error(message.error.message));
      } else {
        resolve(message.result);
      }
    }
  });

  return new Promise((resolve, reject) => {
    socket.addEventListener("open", () => {
      resolve({
        send(method, params = {}) {
          const id = nextId;
          nextId += 1;
          socket.send(JSON.stringify({ id, method, params }));
          return new Promise((resolveCommand, rejectCommand) => {
            pending.set(id, { resolve: resolveCommand, reject: rejectCommand });
          });
        },
        close() {
          socket.close();
        },
      });
    });
    socket.addEventListener("error", reject);
  });
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });

  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text);
  }

  return result.result.value;
}

async function waitForApp(client) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const ready = await evaluate(
      client,
      "Boolean(document.querySelector('.theme-picker select') && document.querySelector('input[name=\"title\"]'))"
    );
    if (ready) return;
    await sleep(250);
  }
  throw new Error("App did not become ready");
}

async function waitForWelcome(client) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const ready = await evaluate(
      client,
      "Boolean(document.querySelector('.welcome-card'))"
    );
    if (ready) return;
    await sleep(250);
  }
  throw new Error("Welcome screen did not become ready");
}

const wsUrl = await getWebSocketUrl();
const client = await createClient(wsUrl);

const setTheme = (theme) => `
  (() => {
    const select = document.querySelector('.theme-picker select');
    const setter = Object.getOwnPropertyDescriptor(select.constructor.prototype, 'value').set;
    setter.call(select, '${theme}');
    select.dispatchEvent(new Event('change', { bubbles: true }));
  })()
`;

try {
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Page.navigate", { url: appUrl });
  await waitForWelcome(client);

  const welcomeVisibleFirst = await evaluate(
    client,
    "Boolean(document.querySelector('.welcome-card')?.textContent.includes('给静茹的 Her Todo'))"
  );
  await evaluate(client, "document.querySelector('.welcome-button').click()");
  await sleep(150);
  await waitForApp(client);
  const welcomeStorageAfterClick = await evaluate(
    client,
    "localStorage.getItem('her-todo-welcome-seen')"
  );

  await client.send("Page.reload", { ignoreCache: true });
  await sleep(500);
  await waitForApp(client);
  const welcomeVisibleAfterReload = await evaluate(
    client,
    "Boolean(document.querySelector('.welcome-card'))"
  );

  const originalTheme = await evaluate(
    client,
    "document.querySelector('.theme-picker select').value"
  );
  const expected = ["obsidian", "glass", "aurora", "command", "soft-cyber", "lulu", "karry"];
  const options = await evaluate(
    client,
    "[...document.querySelector('.theme-picker select').options].map((option) => option.value)"
  );

  const switched = [];
  for (const theme of expected) {
    await evaluate(client, setTheme(theme));
    await sleep(100);
    switched.push({
      id: theme,
      active: await evaluate(
        client,
        `document.querySelector('main').classList.contains('theme-${theme}')`
      ),
    });
  }

  await evaluate(client, setTheme("soft-cyber"));
  await sleep(100);
  const persistedBeforeReload = await evaluate(
    client,
    "localStorage.getItem('her-todo-theme')"
  );
  await client.send("Page.reload", { ignoreCache: true });
  await sleep(500);
  await waitForApp(client);
  const persistedAfterReload = await evaluate(
    client,
    "document.querySelector('.theme-picker select').value"
  );

  await evaluate(client, setTheme("obsidian"));
  await sleep(100);
  const todoResult = await evaluate(
    client,
    `(() => new Promise((resolve) => {
      const stamp = Date.now();
      const setNativeValue = (element, value) => {
        const setter = Object.getOwnPropertyDescriptor(element.constructor.prototype, 'value').set;
        setter.call(element, value);
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const input = document.querySelector('input[name="title"]');
      setNativeValue(input, 'CDP测试任务-' + stamp);
      document.querySelector('.primary-button').click();
      setTimeout(() => {
        const addedCard = [...document.querySelectorAll('.task-card')].find((card) => card.textContent.includes('CDP测试任务-' + stamp));
        const added = Boolean(addedCard);
        addedCard?.querySelector('.icon-button')?.click();
        setTimeout(() => {
          setNativeValue(document.querySelector('input[name="title"]'), 'CDP测试任务-已编辑-' + stamp);
          document.querySelector('.primary-button')?.click();
          setTimeout(() => {
            const editedCard = [...document.querySelectorAll('.task-card')].find((card) => card.textContent.includes('CDP测试任务-已编辑-' + stamp));
            const edited = Boolean(editedCard);
            editedCard?.querySelector('.check-button')?.click();
            setTimeout(() => {
              const completed = Boolean(editedCard?.classList.contains('completed') || editedCard?.textContent.includes('done') || editedCard?.textContent.includes('已完成'));
              editedCard?.querySelector('.icon-button.danger')?.click();
              setTimeout(() => {
                const deleted = ![...document.querySelectorAll('.task-card')].some((card) => card.textContent.includes('CDP测试任务-已编辑-' + stamp));
                resolve({ added, edited, completed, deleted });
              }, 100);
            }, 100);
          }, 100);
        }, 100);
      }, 120);
    }))()`
  );

  await evaluate(client, setTheme(originalTheme));
  await sleep(100);

  console.log(
    JSON.stringify(
      {
        welcomeVisibleFirst,
        welcomeStorageAfterClick,
        welcomeVisibleAfterReload,
        options,
        switched,
        persistedBeforeReload,
        persistedAfterReload,
        ...todoResult,
        restoredTheme: originalTheme,
      },
      null,
      2
    )
  );
} finally {
  client.close();
}
