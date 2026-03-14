const NOTION_VERSION = "2022-06-28";

const tokenInput = document.getElementById("token");
const saveTokenButton = document.getElementById("save-token");
const loadDbButton = document.getElementById("load-db");
const databaseSelect = document.getElementById("database-select");
const titleInput = document.getElementById("title");
const bodyInput = document.getElementById("body");
const createPageButton = document.getElementById("create-page");
const statusText = document.getElementById("status");

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

const loadStoredSettings = async () => {
  const { notionToken, selectedDatabaseId } = await chrome.storage.local.get([
    "notionToken",
    "selectedDatabaseId"
  ]);

  if (notionToken) {
    tokenInput.value = notionToken;
  }

  if (selectedDatabaseId) {
    databaseSelect.dataset.selectedDatabaseId = selectedDatabaseId;
  }
};

const saveToken = async () => {
  const token = tokenInput.value.trim();
  if (!token) {
    setStatus("トークンを入力してください。", "error");
    return;
  }

  await chrome.storage.local.set({ notionToken: token });
  setStatus("トークンを保存しました。", "success");
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
  const token = tokenInput.value.trim();
  if (!token) {
    setStatus("先にトークンを入力してください。", "error");
    return;
  }

  setStatus("Database一覧を取得中...");

  const response = await fetch("https://api.notion.com/v1/search", {
    method: "POST",
    headers: getHeaders(token),
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
  const token = tokenInput.value.trim();
  const databaseId = databaseSelect.value;
  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  if (!token || !databaseId || !title) {
    setStatus("トークン・Database・タイトルは必須です。", "error");
    return;
  }

  setStatus("Database情報を確認中...");

  const dbResponse = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
    headers: getHeaders(token)
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
    headers: getHeaders(token),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    setStatus(`作成失敗: ${response.status} ${errorText}`, "error");
    return;
  }

  await chrome.storage.local.set({ selectedDatabaseId: databaseId, notionToken: token });
  titleInput.value = "";
  bodyInput.value = "";
  setStatus("Notionページを作成しました。", "success");
};

saveTokenButton.addEventListener("click", saveToken);
loadDbButton.addEventListener("click", loadDatabases);
createPageButton.addEventListener("click", createPage);
databaseSelect.addEventListener("change", async () => {
  await chrome.storage.local.set({ selectedDatabaseId: databaseSelect.value });
});

loadStoredSettings();
