const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("localDb", {
  select: (sql, params = []) => ipcRenderer.invoke("db:select", { sql, params }),
  run: (sql, params = []) => ipcRenderer.invoke("db:run", { sql, params }),
  transaction: (statements = []) => ipcRenderer.invoke("db:transaction", statements),
});
