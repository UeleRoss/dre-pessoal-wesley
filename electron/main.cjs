const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

let mainWindow;
let db;
let app, BrowserWindow, ipcMain;

// Função auxiliar para verificar se estamos em dev mode
const isDev = () => app && !app.isPackaged;

const resolveLocalDbAsset = (...segments) => {
  const basePath = isDev() ? path.join(process.cwd(), "localdb") : path.join(process.resourcesPath, "localdb");
  return path.join(basePath, ...segments);
};

const ensureDatabase = () => {
  if (db) {
    return db;
  }

  const dbDir = path.join(app.getPath("userData"), "dre");
  const dbPath = path.join(dbDir, "dre.db");
  fs.mkdirSync(dbDir, { recursive: true });

  db = new Database(dbPath);
  const schemaPath = resolveLocalDbAsset("schema.sql");
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Arquivo de schema não encontrado em ${schemaPath}`);
  }

  const schema = fs.readFileSync(schemaPath, "utf-8");
  db.exec(schema);

  return db;
};

const setupIpc = () => {
  ipcMain.handle("db:select", (_event, { sql, params = [] }) => {
    const database = ensureDatabase();
    const statement = database.prepare(sql);
    return statement.all(params);
  });

  ipcMain.handle("db:run", (_event, { sql, params = [] }) => {
    const database = ensureDatabase();
    const statement = database.prepare(sql);
    return statement.run(params);
  });

  ipcMain.handle("db:transaction", (_event, statements = []) => {
    const database = ensureDatabase();
    const runTransaction = database.transaction((ops) => {
      ops.forEach(({ sql, params = [] }) => {
        database.prepare(sql).run(params);
      });
    });

    runTransaction(statements);
    return { success: true };
  });
};

const createWindow = () => {
  const preload = path.join(__dirname, "preload.cjs");
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev()) {
    const devServerURL = process.env.VITE_DEV_SERVER_URL || "http://localhost:8080";
    mainWindow.loadURL(devServerURL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    const indexPath = path.join(__dirname, "../dist/index.html");
    mainWindow.loadFile(indexPath);
  }
};

// Inicializar Electron
function initializeElectron() {
  const electron = require("electron");
  app = electron.app;
  BrowserWindow = electron.BrowserWindow;
  ipcMain = electron.ipcMain;

  app.whenReady().then(() => {
    ensureDatabase();
    setupIpc();
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}

// Iniciar
initializeElectron();
