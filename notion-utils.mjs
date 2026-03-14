export const supportedPropertyTypes = new Set([
  "rich_text",
  "number",
  "checkbox",
  "select",
  "multi_select",
  "url",
  "email",
  "phone_number",
  "date"
]);

export const getDatabaseTitle = (database) => {
  const titleArray = database?.title || [];
  if (!titleArray.length) {
    return "(無題のDatabase)";
  }
  return titleArray.map((piece) => piece.plain_text).join("");
};

export const findTitlePropertyName = (database) => {
  for (const [name, config] of Object.entries(database?.properties || {})) {
    if (config.type === "title") {
      return name;
    }
  }
  return null;
};

export const getPropertyConfig = (property) => property?.[property.type] || {};

export const buildSinglePropertyValue = (propertyType, rawValue) => {
  if (propertyType === "checkbox") {
    return { checkbox: Boolean(rawValue) };
  }

  if (propertyType === "multi_select") {
    const selected = (Array.isArray(rawValue) ? rawValue : []).filter(Boolean);
    if (!selected.length) {
      return null;
    }
    return { multi_select: selected.map((name) => ({ name })) };
  }

  const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  if (propertyType === "rich_text") {
    return { rich_text: [{ text: { content: value } }] };
  }
  if (propertyType === "number") {
    const numberValue = Number(value);
    if (Number.isNaN(numberValue)) {
      return null;
    }
    return { number: numberValue };
  }
  if (propertyType === "select") {
    return { select: { name: value } };
  }
  if (propertyType === "url") {
    return { url: value };
  }
  if (propertyType === "email") {
    return { email: value };
  }
  if (propertyType === "phone_number") {
    return { phone_number: value };
  }
  if (propertyType === "date") {
    return { date: { start: value } };
  }

  return null;
};
