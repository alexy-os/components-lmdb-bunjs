import { open } from 'lmdb';
import * as fs from 'fs';
import * as path from 'path';
import { serve } from 'bun';

class LMDBConnector {
  db: any;
  dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    this.db = open({
      path: this.dbPath,
    });
  }

  async put(key: string, value: any): Promise<void> {
    return this.db.put(key, value);
  }

  async get(key: string): Promise<any> {
    return this.db.get(key);
  }

  async remove(key: string): Promise<void> {
    return this.db.remove(key);
  }

  async getAll(): Promise<any[]> {
    let items = [];
    for (let { key, value } of this.db.getRange()) {
      items.push({ key, value });
    }
    return items;
  }
}

class ComponentManager {
  componentsDir: string;
  dbConnector: LMDBConnector;
  version: number;
  versionKey: string;

  constructor(componentsDir: string, dbConnector: LMDBConnector) {
    this.componentsDir = componentsDir;
    this.dbConnector = dbConnector;
    this.versionKey = '__version__';
    this.version = 1;
    this.loadComponents();
    this.watchComponentsDir();
  }

  async loadComponents() {
    console.log('Loading components...');
    await this.clearComponents();

    const files = fs.readdirSync(this.componentsDir);
    let componentIdSet = new Set<string>();
    let duplicateIdCounts: { [key: string]: number } = {};

    for (let file of files) {
      const filePath = path.join(this.componentsDir, file);
      if (path.extname(file) === '.json') {
        const data = fs.readFileSync(filePath, 'utf-8');
        const components = JSON.parse(data);

        for (let component of components) {
          let id = component.id;
          if (!id) continue;

          if (componentIdSet.has(id)) {
            if (!duplicateIdCounts[id]) duplicateIdCounts[id] = 1;
            duplicateIdCounts[id]++;
            id = `${id}_${duplicateIdCounts[id]}`;
          } else {
            componentIdSet.add(id);
          }

          await this.dbConnector.put(id, component.content);
        }
      }
    }
    await this.updateVersion();
  }

  watchComponentsDir() {
    console.log('Watching components directory for changes...');
    fs.watch(this.componentsDir, { recursive: true }, (eventType, filename) => {
      console.log(`Components directory changed: ${eventType} ${filename}`);
      this.loadComponents();
    });
  }

  async clearComponents() {
    const items = await this.dbConnector.getAll();
    for (let item of items) {
      const key = item.key;
      if (key !== this.versionKey) {
        await this.dbConnector.remove(key);
      }
    }
  }

  async updateVersion() {
    this.version++;
    console.log(`Updating version to ${this.version}`);
    await this.dbConnector.put(this.versionKey, this.version);
  }

  async getVersion() {
    const version = await this.dbConnector.get(this.versionKey);
    if (version) {
      this.version = version;
    } else {
      this.version = 1;
      await this.dbConnector.put(this.versionKey, this.version);
    }
    return this.version;
  }
}

const PORT = 3005;

const __dirname = process.cwd();

const dbPath = path.join(__dirname, 'data', 'components.mdb');
const componentsDir = path.join(__dirname, 'components');

const dbConnector = new LMDBConnector(dbPath);
const componentManager = new ComponentManager(componentsDir, dbConnector);

const server = serve({
  port: PORT,
  fetch: async (req) => {
    const url = new URL(req.url);
    const pathname = url.pathname;

    if (pathname === '/' || pathname === '/index.html') {
      const indexPath = path.join(__dirname, 'index.html');
      try {
        const data = fs.readFileSync(indexPath, 'utf-8');
        return new Response(data, {
          headers: { 'Content-Type': 'text/html' },
        });
      } catch (error) {
        console.error('Failed to read index.html', error);
        return new Response('Internal Server Error', { status: 500 });
      }
    } else if (pathname === '/version') {
      const version = await componentManager.getVersion();
      return new Response(JSON.stringify({ version }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } else if (pathname === '/components') {
      const id = url.searchParams.get('id');
      const ids = url.searchParams.get('ids');
      if (id) {
        const content = await dbConnector.get(id);
        if (content) {
          return new Response(JSON.stringify({ id, content }), {
            headers: { 'Content-Type': 'application/json' },
          });
        } else {
          return new Response('Component not found', { status: 404 });
        }
      } else if (ids) {
        const idsArray = ids.split(',').map((id) => id.trim());
        const components = [];
        for (let id of idsArray) {
          const content = await dbConnector.get(id);
          if (content) {
            components.push({ id, content });
          }
        }
        return new Response(JSON.stringify({ components }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        const items = await dbConnector.getAll();
        const components = items
          .filter((item) => item.key !== '__version__')
          .map((item) => ({
            id: item.key,
            content: item.value,
          }));
        return new Response(JSON.stringify({ components }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } else {
      return new Response('Not Found', { status: 404 });
    }
  },
});

console.log(`Server is running on port ${PORT}`);