const randomString = () => Math.random().toString(36).slice(2, 10);

export const generateId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const timePart = Date.now().toString(36);
  return `${timePart}${randomString()}${randomString()}`.slice(0, 32);
};

export type GenerateIdFn = () => string;
