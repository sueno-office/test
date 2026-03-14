import {
  buildSinglePropertyValue,
  findTitlePropertyName,
  getDatabaseTitle,
  getPropertyConfig,
  supportedPropertyTypes
} from "./notion-utils.mjs";

const NOTION_VERSION = "2022-06-28";

const tokenInput = document.getElementById("token");
const saveTokenButton = document.getElementById("save-token");
const loadDbButton = document.getElementById("load-db");
const databaseSelect = document.getElementById("database-select");
const titleInput = document.getElementById("title");
const bodyInput = document.getElementById("body");
const propertyFields = document.getElementById("property-fields");
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

const renderDatabases = async (databases, selectedDatabaseId) => {
  databaseSelect.innerHTML = "";

  if (!databases.length) {
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "Databaseがありません（設定から取得）";
    databaseSelect.append(emptyOption);
    return;
  }

  for (const database of databases) {
    const option = document.createElement("option");
    option.value = database.id;
    option.textContent = getDatabaseTitle(database);
    databaseSelect.append(option);
  }

  if (selectedDatabaseId && databases.some((db) => db.id === selectedDatabaseId)) {
    databaseSelect.value = selectedDatabaseId;
  }

  await loadDatabaseSchema(databaseSelect.value);
};

const renderPropertyFields = (database) => {
  propertyFields.innerHTML = "";
  const entries = Object.entries(database.properties || {}).filter(
    ([, property]) => property.type !== "title" && supportedPropertyTypes.has(property.type)
  );

  if (!entries.length) {
    propertyFields.innerHTML = '<p class="hint">追加で入力できるプロパティはありません。</p>';
    return;
  }

  for (const [name, property] of entries) {
    const wrapper = document.createElement("div");
    wrapper.className = "property-item";

    const label = document.createElement("label");
    label.textContent = `${name} (${property.type})`;

    let input;
    if (property.type === "checkbox") {
      input = document.createElement("input");
      input.type = "checkbox";
    } else if (property.type === "select" || property.type === "multi_select") {
      input = document.createElement("select");
      if (property.type === "multi_select") {
        input.multiple = true;
      }
      if (property.type === "select") {
        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "選択してください";
        input.append(placeholder);
      }

      const options = getPropertyConfig(property).options || [];
      for (const optionConfig of options) {
        const option = document.createElement("option");
        option.value = optionConfig.name;
        option.textContent = optionConfig.name;
        input.append(option);
      }
    } else {
      input = document.createElement("input");
      input.type = property.type === "number" ? "number" : property.type === "date" ? "date" : "text";
      if (property.type === "rich_text") {
        input.placeholder = "テキスト";
      }
    }

    input.dataset.propertyName = name;
    input.dataset.propertyType = property.type;

    wrapper.append(label, input);
    propertyFields.append(wrapper);
  }
};

const buildPropertyPayload = () => {
  const payload = {};
  const fields = propertyFields.querySelectorAll("[data-property-name]");

  for (const field of fields) {
    const propertyName = field.dataset.propertyName;
    const propertyType = field.dataset.propertyType;

    if (propertyType === "checkbox") {
      if (field.checked) {
        payload[propertyName] = buildSinglePropertyValue(propertyType, true);
      }
      continue;
    }

    if (propertyType === "multi_select") {
      const selected = Array.from(field.selectedOptions).map((option) => option.value);
      const notionValue = buildSinglePropertyValue(propertyType, selected);
      if (notionValue) {
        payload[propertyName] = notionValue;
      }
      continue;
    }

    const notionValue = buildSinglePropertyValue(propertyType, field.value);
    if (notionValue) {
      payload[propertyName] = notionValue;
    }
  }

  return payload;
};

const loadDatabaseSchema = async (databaseId) => {
  if (!databaseId) {
    propertyFields.innerHTML = '<p class="hint">Databaseを選択すると入力可能なプロパティが表示されます。</p>';
    return;
  }

  const { notionToken, databaseSchemas = {} } = await chrome.storage.local.get([
    "notionToken",
    "databaseSchemas"
  ]);

  if (databaseSchemas[databaseId]) {
    renderPropertyFields(databaseSchemas[databaseId]);
    return;
  }

  if (!notionToken) {
    propertyFields.innerHTML = '<p class="hint">設定でトークンを保存するとプロパティを読み込めます。</p>';
    return;
  }

  const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
    headers: getHeaders(notionToken)
  });

  if (!response.ok) {
    propertyFields.innerHTML = '<p class="hint">プロパティ取得に失敗しました。</p>';
    return;
  }

  const schema = await response.json();
  databaseSchemas[databaseId] = schema;
  await chrome.storage.local.set({ databaseSchemas });
  renderPropertyFields(schema);
};

const loadStoredSettings = async () => {
  const { notionToken, selectedDatabaseId, notionDatabases = [] } = await chrome.storage.local.get([
    "notionToken",
    "selectedDatabaseId",
    "notionDatabases"
  ]);

  if (notionToken) {
    tokenInput.value = notionToken;
  }

  await renderDatabases(notionDatabases, selectedDatabaseId);
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

const loadDatabases = async () => {
  const token = tokenInput.value.trim();
  if (!token) {
    setStatus("設定でトークンを入力してください。", "error");
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

  const selectedDatabaseId = databaseSelect.value || databases[0].id;
  await chrome.storage.local.set({
    notionToken: token,
    notionDatabases: databases,
    selectedDatabaseId,
    databaseSchemas: {}
  });

  await renderDatabases(databases, selectedDatabaseId);
  setStatus(`${databases.length}件のDatabaseを保存しました。`, "success");
};

const createPage = async () => {
  const { notionToken } = await chrome.storage.local.get(["notionToken"]);
  const token = tokenInput.value.trim() || notionToken;
  const databaseId = databaseSelect.value;
  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  if (!token || !databaseId || !title) {
    setStatus("トークン・Database・タイトルは必須です。", "error");
    return;
  }

  const { databaseSchemas = {} } = await chrome.storage.local.get(["databaseSchemas"]);
  const database = databaseSchemas[databaseId];

  if (!database) {
    setStatus("Database情報がありません。設定からDB一覧を更新してください。", "error");
    return;
  }

  const titlePropertyName = findTitlePropertyName(database);
  if (!titlePropertyName) {
    setStatus("このDatabaseにtitleプロパティが見つかりません。", "error");
    return;
  }

  const payload = {
    parent: { database_id: databaseId },
    properties: {
      [titlePropertyName]: {
        title: [{ text: { content: title } }]
      },
      ...buildPropertyPayload()
    }
  };

  if (body) {
    payload.children = [
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: body } }]
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
  propertyFields.querySelectorAll("[data-property-name]").forEach((field) => {
    if (field.type === "checkbox") {
      field.checked = false;
    } else if (field.multiple) {
      Array.from(field.options).forEach((option) => {
        option.selected = false;
      });
    } else {
      field.value = "";
    }
  });

  setStatus("Notionページを作成しました。", "success");
};

saveTokenButton.addEventListener("click", saveToken);
loadDbButton.addEventListener("click", loadDatabases);
createPageButton.addEventListener("click", createPage);
databaseSelect.addEventListener("change", async () => {
  await chrome.storage.local.set({ selectedDatabaseId: databaseSelect.value });
  await loadDatabaseSchema(databaseSelect.value);
});

loadStoredSettings();
