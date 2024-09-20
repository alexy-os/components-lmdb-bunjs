# Component Management System with Bun and LMDB

This project implements a component management system using Bun and LMDB for fast and efficient storage of HTML components. The system automatically stores all JSON-based components found in the `/components/` directory into a single LMDB database. The components are organized by `id` and `content` where `content` is the HTML block for the component.

The application provides an AJAX-based API that clients can use to fetch components by `id`, either individually or as a batch. The client-side page will cache the components in local storage, with versioning to ensure the cache is updated whenever there are changes in the server files.

### Project Structure

```
/components/heros.json, cards.json 
/data/components.mdb 
/index.ts
```

- **Server**: The server runs on Bun and performs CRUD operations on an LMDB database, storing components with `id` and `content` properties.
- **Client**: The client-side application renders a landing page that fetches the sections (e.g., `hero` and card components) from the server via AJAX, caching them locally. If the server detects changes in the `/components/` directory, it updates the database and resets the client’s cache.

### Features

- **Automatic Component Import**: The server scans all JSON files in the `/components/` directory and saves them into the LMDB database. If an `id` already exists, a sequence number is added to differentiate the components.
- **Component Fetching API**: The server exposes AJAX endpoints for fetching components either individually by `id` or in bulk. These components are then used to build the landing page on the client side.
- **Versioning and Cache Invalidations**: The client-side landing page caches the components in the browser’s local storage. If the files in the `/components/` directory change (detected by versioning), the cache is invalidated, and the client reloads the components.
- **CRUD with LMDB**: The project is written using an object-oriented approach with universal database connectors for managing the LMDB database.

### How It Works

1. **Server Side:**
   - Scans the `/components/` directory for JSON files.
   - Reads each JSON file and extracts the `id` and `content` fields.
   - Stores all components in an LMDB database (`components.mdb`) under a single table with unique `id`s.
   - Provides AJAX endpoints for the client to fetch individual or multiple components by `id`.

2. **Client Side:**
   - Upon first load, the landing page sends an AJAX request to fetch all sections (e.g., hero and cards).
   - Saves the sections in the local storage for quick access on subsequent loads.
   - If the server detects updates in the components, the version number changes, and the client automatically clears and updates its cache.

### Endpoints

- **GET /components/:id**: Fetch a single component by `id`.
- **GET /components**: Fetch multiple components (or all available).
  
### Example Component Files

`/components/heros.json`
```json
[
  {
    "id": "hero-1",
    "content": "<section class='hero'>Hero section content here</section>"
  }
]
```

`/components/cards.json`
```json
[
  {
    "id": "card-1",
    "content": "<div class='card'>Card 1 content</div>"
  },
  {
    "id": "card-2",
    "content": "<div class='card'>Card 2 content</div>"
  }
]
```

### Example Client AJAX Request

```js
fetch('/components')
  .then(response => response.json())
  .then(components => {
    localStorage.setItem('components', JSON.stringify(components));
    renderPage(components);
  });
```

### How to Run

1. Clone the repository.
2. Install Bun.
3. Run the project with the following command:
   ```bash
   bun run index.ts
   ```
4. Open `http://localhost:3005` to see the landing page and interact with the components.

### Universal Database Connectors

- **ComponentConnector**: This class manages all CRUD operations with the LMDB database, providing a clean and scalable interface for interacting with the data.

### Conclusion

This project is fully tested and ready to be deployed with Bun, offering efficient server-side rendering and component management with minimal dependencies. The LMDB database ensures fast access and storage of HTML blocks, making it a powerful solution for dynamic websites.

This project was created using `bun init` in bun v1.1.27. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
