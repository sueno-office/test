const NOTION_VERSION = "2022-06-28";

const tokenWarning = document.getElementById("token-warning");
const openOptionsInlineButton = document.getElementById("open-options-inline");
const openOptionsButton = document.getElementById("open-options");
const loadDbButton = document.getElementById("load-db");
const databaseSelect = document.getElementById("database-select");
const titleInput = document.getElementById("title");
const bodyInput = document.getElementById("body");
const createPageButton = document.getElementById("create-page");
const statusText = document.getElementById("status");

let notionToken = "";

const setStatus = (message, type = "") => {
  statusText.textContent = message;
  statusText.classList.remove("error", "success");
  if (type) {
    statusText.classList.add(type);
  }
};

const getHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  "Notion-Version": NOTION_VERSION,
  "Content-Type": "application/json"
});

const getDatabaseTitle = (database) => {
  const titleArray = database.title || [];
  if (!titleArray.length) {
    return "(無題のDatabase)";
  }
  return titleArray.map((piece) => piece.plain_text).join("");
};

const findTitlePropertyName = (database) => {
  const properties = database.properties || {};
  for (const [name, config] of Object.entries(properties)) {
    if (config.type === "title") {
      return name;
    }
  }
  return null;
};

const openOptionsPage = async () => {
  await chrome.runtime.openOptionsPage();
};

const applyTokenState = () => {
  const hasToken = Boolean(notionToken);
  tokenWarning.hidden = hasToken;
  loadDbButton.disabled = !hasToken;
  createPageButton.disabled = !hasToken;

  if (!hasToken) {
    setStatus("トークンが未設定です。設定画面から保存してください。", "error");
  }
};

const requireToken = () => {
  if (notionToken) {
    return true;
  }

  applyTokenState();
  return false;
};

const loadStoredSettings = async () => {
  const { notionToken: storedToken, selectedDatabaseId } = await chrome.storage.local.get([
    "notionToken",
    "selectedDatabaseId"
  ]);

  notionToken = (storedToken || "").trim();

  if (selectedDatabaseId) {
    databaseSelect.dataset.selectedDatabaseId = selectedDatabaseId;
  }

  applyTokenState();
};

const renderDatabaseOptions = (databases) => {
  const selectedId = databaseSelect.dataset.selectedDatabaseId;
  databaseSelect.innerHTML = "";

  for (const database of databases) {
    const option = document.createElement("option");
    option.value = database.id;
    option.textContent = getDatabaseTitle(database);
    databaseSelect.append(option);
  }

  if (selectedId) {
    databaseSelect.value = selectedId;
  }
};

const loadDatabases = async () => {
  if (!requireToken()) {
    return;
  }

  setStatus("Database一覧を取得中...");

  const response = await fetch("https://api.notion.com/v1/search", {
    method: "POST",
    headers: getHeaders(notionToken),
    body: JSON.stringify({
      filter: {
        value: "database",
        property: "object"
      },
      page_size: 100
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    setStatus(`DB取得失敗: ${response.status} ${errorText}`, "error");
    return;
  }

  const data = await response.json();
  const databases = data.results || [];

  if (!databases.length) {
    setStatus("アクセス可能なDatabaseが見つかりません。", "error");
    return;
  }

  renderDatabaseOptions(databases);
  await chrome.storage.local.set({ selectedDatabaseId: databaseSelect.value });
  setStatus(`${databases.length}件のDatabaseを読み込みました。`, "success");
};

const createPage = async () => {
  if (!requireToken()) {
    return;
  }

  const databaseId = databaseSelect.value;
  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  if (!databaseId || !title) {
    setStatus("Database・タイトルは必須です。", "error");
    return;
  }

  setStatus("Database情報を確認中...");

  const dbResponse = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
    headers: getHeaders(notionToken)
  });

  if (!dbResponse.ok) {
    const errorText = await dbResponse.text();
    setStatus(`Database情報取得失敗: ${dbResponse.status} ${errorText}`, "error");
    return;
  }

  const database = await dbResponse.json();
  const titlePropertyName = findTitlePropertyName(database);

  if (!titlePropertyName) {
    setStatus("このDatabaseにtitleプロパティが見つかりません。", "error");
    return;
  }

  const payload = {
    parent: {
      database_id: databaseId
    },
    properties: {
      [titlePropertyName]: {
        title: [
          {
            text: {
              content: title
            }
          }
        ]
      }
    }
  };

  if (body) {
    payload.children = [
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: {
                content: body
              }
            }
          ]
        }
      }
    ];
  }

  setStatus("ページ作成中...");

  const response = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: getHeaders(notionToken),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    setStatus(`作成失敗: ${response.status} ${errorText}`, "error");
    return;
  }

  await chrome.storage.local.set({ selectedDatabaseId: databaseId });
  titleInput.value = "";
  bodyInput.value = "";
  setStatus("Notionページを作成しました。", "success");
};

openOptionsButton.addEventListener("click", openOptionsPage);
openOptionsInlineButton.addEventListener("click", openOptionsPage);
loadDbButton.addEventListener("click", loadDatabases);
createPageButton.addEventListener("click", createPage);
databaseSelect.addEventListener("change", async () => {
  await chrome.storage.local.set({ selectedDatabaseId: databaseSelect.value });
});

loadStoredSettings();
