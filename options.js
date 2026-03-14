const tokenInput = document.getElementById("token");
const saveTokenButton = document.getElementById("save-token");
const statusText = document.getElementById("status");

const setStatus = (message, type = "") => {
  statusText.textContent = message;
  statusText.classList.remove("error", "success");
  if (type) {
    statusText.classList.add(type);
  }
};

const validateToken = (token) => {
  if (!token) {
    return "トークンを入力してください。";
  }

  if (!token.startsWith("secret_")) {
    return "トークンは secret_ で始まる値を入力してください。";
  }

  if (token.length < 16) {
    return "トークンが短すぎます。正しいトークンを入力してください。";
  }

  return "";
};

const loadStoredToken = async () => {
  const { notionToken } = await chrome.storage.local.get("notionToken");
  if (notionToken) {
    tokenInput.value = notionToken;
    setStatus("保存済みのトークンを読み込みました。", "success");
  }
};

const saveToken = async () => {
  const token = tokenInput.value.trim();
  const validationError = validateToken(token);
  if (validationError) {
    setStatus(validationError, "error");
    return;
  }

  await chrome.storage.local.set({ notionToken: token });
  setStatus("トークンを保存しました。", "success");
};

saveTokenButton.addEventListener("click", saveToken);
loadStoredToken();
