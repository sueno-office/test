const NOTION_VERSION = "2022-06-28";
const PROPERTY_CACHE_KEY = "databasePropertiesById";
const DATABASE_LIST_KEY = "cachedDatabases";

const tokenWarning = document.getElementById("token-warning");
const openOptionsInlineButton = document.getElementById("open-options-inline");
const openOptionsButton = document.getElementById("open-options");
const loadDbButton = document.getElementById("load-db");
const databaseSelect = document.getElementById("database-select");
const titleInput = document.getElementById("title");
const bodyInput = document.getElementById("body");
const createPageButton = document.getElementById("create-page");
const statusText = document.getElementById("status");
const propertiesSection = document.getElementById("properties-section");
const propertiesFields = document.getElementById("properties-fields");

let notionToken = "";
let databasePropertiesById = {};

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

const isSupportedPropertyType = (type) =>
  ["rich_text", "number", "select", "multi_select", "checkbox", "date", "url", "email", "phone_number"].includes(type);

const toPropertyEntries = (databaseProperties) =>
  Object.entries(databaseProperties || {}).filter(([, config]) => isSupportedPropertyType(config.type));

const createFieldWrapper = (propertyName, propertyType) => {
  const wrapper = document.createElement("div");
  wrapper.className = "property-field";

  const label = document.createElement("label");
  label.textContent = `${propertyName} (${propertyType})`;
  wrapper.append(label);

  return wrapper;
};

const createOptionElements = (selectElement, options) => {
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "選択してください";
  selectElement.append(empty);

  for (const option of options || []) {
    const element = document.createElement("option");
    element.value = option.name;
    element.textContent = option.name;
    selectElement.append(element);
  }
};

const renderPropertyFields = (databaseId) => {
  propertiesFields.innerHTML = "";

  const databaseProperties = databasePropertiesById[databaseId];
  const entries = toPropertyEntries(databaseProperties);

  propertiesSection.hidden = entries.length === 0;
  if (!entries.length) {
    return;
  }

  for (const [propertyName, config] of entries) {
    const type = config.type;
    const wrapper = createFieldWrapper(propertyName, type);

    let inputElement;

    if (type === "checkbox") {
      inputElement = document.createElement("input");
      inputElement.type = "checkbox";
      inputElement.className = "property-checkbox";
    } else if (type === "select") {
      inputElement = document.createElement("select");
      createOptionElements(inputElement, config.select?.options);
    } else if (type === "multi_select") {
      inputElement = document.createElement("input");
      inputElement.type = "text";
      inputElement.placeholder = "タグ1, タグ2（カンマ区切り）";
    } else if (type === "number") {
      inputElement = document.createElement("input");
      inputElement.type = "number";
      inputElement.step = "any";
    } else if (type === "date") {
      inputElement = document.createElement("input");
      inputElement.type = "date";
    } else if (["url", "email", "phone_number"].includes(type)) {
      inputElement = document.createElement("input");
      inputElement.type = "text";
      inputElement.placeholder = `${propertyName}を入力`;
    } else {
      inputElement = document.createElement("textarea");
      inputElement.rows = 2;
      inputElement.placeholder = `${propertyName}を入力`;
    }

    inputElement.dataset.propertyName = propertyName;
    inputElement.dataset.propertyType = type;
    wrapper.append(inputElement);
    propertiesFields.append(wrapper);
  }
};

const buildPropertyValue = (type, value, rawElement) => {
  if (type === "rich_text") {
    return value
      ? {
          rich_text: [{ text: { content: value } }]
        }
      : null;
  }

  if (type === "number") {
    return value === "" ? null : { number: Number(value) };
  }

  if (type === "select") {
    return value ? { select: { name: value } } : null;
  }

  if (type === "multi_select") {
    if (!value) {
      return null;
    }
    const names = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((name) => ({ name }));
    return names.length ? { multi_select: names } : null;
  }

  if (type === "checkbox") {
    return { checkbox: rawElement.checked };
  }

  if (type === "date") {
    return value ? { date: { start: value } } : null;
  }

  if (type === "url") {
    return value ? { url: value } : null;
  }

  if (type === "email") {
    return value ? { email: value } : null;
  }

  if (type === "phone_number") {
    return value ? { phone_number: value } : null;
  }

  return null;
};

const collectPropertiesFromForm = () => {
  const properties = {};
  const fields = propertiesFields.querySelectorAll("[data-property-name]");

  for (const element of fields) {
    const name = element.dataset.propertyName;
    const type = element.dataset.propertyType;
    const value = element.type === "checkbox" ? "" : element.value.trim();

    const notionValue = buildPropertyValue(type, value, element);
    if (notionValue) {
      properties[name] = notionValue;
    }
  }

  return properties;
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
  const { notionToken: storedToken, selectedDatabaseId, cachedDatabases, databasePropertiesById: storedProps } =
    await chrome.storage.local.get(["notionToken", "selectedDatabaseId", DATABASE_LIST_KEY, PROPERTY_CACHE_KEY]);

  notionToken = (storedToken || "").trim();
  databasePropertiesById = storedProps || {};

  if (selectedDatabaseId) {
    databaseSelect.dataset.selectedDatabaseId = selectedDatabaseId;
  }

  if (cachedDatabases?.length) {
    renderDatabaseOptions(cachedDatabases);
    const restoredId = selectedDatabaseId || databaseSelect.value;
    if (restoredId) {
      renderPropertyFields(restoredId);
    }
    setStatus(`保存済みDB一覧を読み込みました（${cachedDatabases.length}件）。`, "success");
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

const cacheDatabasesWithProperties = async (databases) => {
  const nextPropertyCache = { ...databasePropertiesById };
  for (const db of databases) {
    if (db.id && db.properties) {
      nextPropertyCache[db.id] = db.properties;
    }
  }

  databasePropertiesById = nextPropertyCache;

  await chrome.storage.local.set({
    [DATABASE_LIST_KEY]: databases,
    [PROPERTY_CACHE_KEY]: databasePropertiesById,
    selectedDatabaseId: databaseSelect.value
  });
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
  await cacheDatabasesWithProperties(databases);
  renderPropertyFields(databaseSelect.value);
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

  setStatus("ページ作成中...");

  const databaseProperties = databasePropertiesById[databaseId];
  if (!databaseProperties) {
    setStatus("Database情報がありません。DB一覧を更新してください。", "error");
    return;
  }

  const titlePropertyName = findTitlePropertyName({ properties: databaseProperties });

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
      },
      ...collectPropertiesFromForm()
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
  for (const field of propertiesFields.querySelectorAll("input, textarea, select")) {
    if (field.type === "checkbox") {
      field.checked = false;
    } else {
      field.value = "";
    }
  }
  setStatus("Notionページを作成しました。", "success");
};

openOptionsButton.addEventListener("click", openOptionsPage);
openOptionsInlineButton.addEventListener("click", openOptionsPage);
loadDbButton.addEventListener("click", loadDatabases);
createPageButton.addEventListener("click", createPage);
databaseSelect.addEventListener("change", async () => {
  const selectedId = databaseSelect.value;
  await chrome.storage.local.set({ selectedDatabaseId: selectedId });
  renderPropertyFields(selectedId);
});

loadStoredSettings();
