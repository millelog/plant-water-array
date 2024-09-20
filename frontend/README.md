## File Structure
```
lua
frontend/
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── vite.config.js
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── index.css
│   ├── api/
│   │   ├── api.js
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── Sidebar.jsx
│   │   ├── DataTable.jsx
│   │   ├── AlertCard.jsx
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── Devices.jsx
│   │   ├── Sensors.jsx
│   │   ├── Readings.jsx
│   │   ├── Alerts.jsx
│   │   ├── Settings.jsx
│   └── routes.jsx
└── README.md
```
index.html: The HTML template file.
package.json: Contains project dependencies and scripts.
tailwind.config.js: Tailwind CSS configuration.
vite.config.js: Vite configuration file.
src/: Contains all the React code.
App.jsx: The main application component.
main.jsx: Entry point for React.
index.css: Global CSS styles.
api/: API utility functions for interacting with the backend.
components/: Reusable UI components.
pages/: Different pages/routes of the application.
routes.jsx: Defines the routing for the application.


##Running the Frontend
Navigate to the frontend directory:
```
bash
cd frontend
```
Install Dependencies:

If you haven't already installed the dependencies during setup:
```
bash
npm install
```
Run the Application:
```
bash
npm run dev
```
Access the Frontend:

Open your browser and navigate to:
```
arduino
http://localhost:5173
```
(Vite's default port is 5173)