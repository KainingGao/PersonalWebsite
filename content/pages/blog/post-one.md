---
type: PostLayout
title: How to Create a Free Full-Stack Website in 2025
colors: colors-a
date: '2025-02-12'
author: content/data/team/doris-soto.json
excerpt: >-
  Learn how to build and deploy a complete full-stack web application using Netlify, Render.com, and MongoDB Atlas - all on their free tiers.
featuredImage:
  type: ImageBlock
  url: /images/featured-Image6.jpg
  altText: Free Full-Stack Website Development
bottomSections:
  - elementId: ''
    type: RecentPostsSection
    colors: colors-f
    variant: variant-d
    subtitle: Recent posts
    showDate: true
    showAuthor: false
    showExcerpt: true
    recentCount: 2
    styles:
      self:
        height: auto
        width: wide
        margin:
          - mt-0
          - mb-0
          - ml-0
          - mr-0
        padding:
          - pt-12
          - pb-56
          - pr-4
          - pl-4
        justifyContent: center
      title:
        textAlign: left
      subtitle:
        textAlign: left
      actions:
        justifyContent: center
    showFeaturedImage: true
    showReadMoreLink: true
  - type: ContactSection
    backgroundSize: full
    title: 'Subscribe for more dev tips ✍️'
    colors: colors-f
    form:
      type: FormBlock
      elementId: sign-up-form
      fields:
        - name: firstName
          label: First Name
          hideLabel: true
          placeholder: First Name
          isRequired: true
          width: 1/2
          type: TextFormControl
        - name: lastName
          label: Last Name
          hideLabel: true
          placeholder: Last Name
          isRequired: false
          width: 1/2
          type: TextFormControl
        - name: email
          label: Email
          hideLabel: true
          placeholder: Email
          isRequired: true
          width: full
          type: EmailFormControl
        - name: updatesConsent
          label: Send me tutorial updates
          isRequired: false
          width: full
          type: CheckboxFormControl
      submitLabel: "Subscribe 🚀"
      styles:
        submitLabel:
          textAlign: center
    styles:
      self:
        height: auto
        width: narrow
        margin:
          - mt-0
          - mb-0
          - ml-4
          - mr-4
        padding:
          - pt-24
          - pb-24
          - pr-4
          - pl-4
        alignItems: center
        justifyContent: center
        flexDirection: row
      title:
        textAlign: left
      text:
        textAlign: left
---

# How to Create a Free Full-Stack Website in 2025

As of February 2025, it's still absolutely possible to build and deploy a complete full-stack web application without spending a dime. In this guide, I'll walk you through creating a modern web application with a React frontend, Node.js backend, and MongoDB database—all hosted for free on reliable platforms.

We'll use:
- **Netlify** for our frontend hosting
- **Render.com** for our backend hosting
- **MongoDB Atlas** for our database

Let's get started!

## Step 1: Setting Up Your MongoDB Atlas Database

MongoDB Atlas continues to offer one of the most generous free tiers among database providers in 2025. Here's how to set it up:

1. **Create a MongoDB Atlas account** at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. **Create a new cluster** by clicking "Build a Cluster" and selecting the "Free tier" option
3. **Choose your cloud provider and region** (select the region closest to your target audience for best performance)
4. **Configure cluster settings** - you can keep the defaults for M0 Sandbox
5. **Create a database user** with a secure password (note these credentials for later)
6. **Set IP access** - you can allow access from anywhere by entering 0.0.0.0/0 for development, but you should restrict this in production
7. **Connect to your cluster** - once created, click "Connect" and note your connection string

Your connection string will look something like this:
```
mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/<dbname>?retryWrites=true&w=majority
```

Make sure to replace `<username>`, `<password>`, and `<dbname>` with your actual information. We'll use this connection string in our backend setup.

## Step 2: Creating the Backend with Node.js and Express

Now, let's create a simple but powerful backend API using Node.js and Express:

1. **Initialize a new project**:
```bash
mkdir fullstack-backend
cd fullstack-backend
npm init -y
```

2. **Install dependencies**:
```bash
npm install express mongoose cors dotenv
npm install nodemon --save-dev
```

3. **Create an .env file** to store environment variables:
```
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/<dbname>?retryWrites=true&w=majority
PORT=4000
```

4. **Create a server.js file**:
```javascript
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define a simple schema
const itemSchema = new mongoose.Schema({
  name: String,
  description: String,
  completed: Boolean,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Item = mongoose.model('Item', itemSchema);

// Routes
app.get('/', (req, res) => {
  res.send('API is running');
});

// GET all items
app.get('/api/items', async (req, res) => {
  try {
    const items = await Item.find();
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST a new item
app.post('/api/items', async (req, res) => {
  try {
    const newItem = new Item(req.body);
    const savedItem = await newItem.save();
    res.status(201).json(savedItem);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET a specific item
app.get('/api/items/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE an item
app.delete('/api/items/:id', async (req, res) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Listen
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

5. **Update package.json** with start scripts:
```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js"
}
```

6. **Test locally**:
```bash
npm run dev
```

Your backend should now be running locally at http://localhost:4000.

## Step 3: Creating the React Frontend

Now let's build a React frontend to interact with our API:

1. **Create a new React app**:
```bash
npx create-react-app fullstack-frontend
cd fullstack-frontend
```

2. **Install axios** for API requests:
```bash
npm install axios
```

3. **Create a .env file** in the React project:
```
REACT_APP_API_URL=http://localhost:4000/api
```

4. **Replace App.js** with a simple interface:
```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', description: '', completed: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL;

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/items`);
      setItems(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching items:', err);
      setError('Failed to fetch items. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewItem({
      ...newItem,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/items`, newItem);
      setNewItem({ name: '', description: '', completed: false });
      fetchItems();
    } catch (err) {
      console.error('Error creating item:', err);
      setError('Failed to create item. Please try again.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/items/${id}`);
      fetchItems();
    } catch (err) {
      console.error('Error deleting item:', err);
      setError('Failed to delete item. Please try again.');
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>My Full-Stack App</h1>
      </header>
      <main>
        <section className="form-section">
          <h2>Add New Item</h2>
          {error && <p className="error">{error}</p>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Name:</label>
              <input
                type="text"
                id="name"
                name="name"
                value={newItem.name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="description">Description:</label>
              <textarea
                id="description"
                name="description"
                value={newItem.description}
                onChange={handleInputChange}
                required
              />
            </div>
            <button type="submit">Add Item</button>
          </form>
        </section>
        <section className="items-section">
          <h2>Items</h2>
          {loading ? (
            <p>Loading...</p>
          ) : items.length === 0 ? (
            <p>No items found. Add one above!</p>
          ) : (
            <ul className="items-list">
              {items.map((item) => (
                <li key={item._id} className="item-card">
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <p className="date">Created: {new Date(item.createdAt).toLocaleDateString()}</p>
                  <button onClick={() => handleDelete(item._id)} className="delete-btn">
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
```

5. **Add some basic CSS** to App.css:
```css
.App {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.App-header {
  margin-bottom: 30px;
  text-align: center;
}

.form-section, .items-section {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 5px;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

input, textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

button {
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background: #0069d9;
}

.items-list {
  list-style: none;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.item-card {
  background: white;
  padding: 15px;
  border-radius: 5px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.delete-btn {
  background: #dc3545;
  margin-top: 10px;
}

.delete-btn:hover {
  background: #c82333;
}

.error {
  color: #dc3545;
  padding: 10px;
  background: #f8d7da;
  border-radius: 4px;
  margin-bottom: 15px;
}

.date {
  color: #6c757d;
  font-size: 0.9em;
}
```

6. **Test locally**:
```bash
npm start
```

Your React app should now be running at http://localhost:3000 and communicating with your backend.

## Step 4: Deploying the Backend to Render.com

Render.com offers a generous free tier for web services that's perfect for our backend:

1. **Create a Render account** at [render.com](https://render.com)

2. **Create a new Web Service**:
   - Click "New" and select "Web Service"
   - Connect your GitHub repository (you'll need to push your backend code to GitHub first)
   - Select your repository and branch
   - Name your service (e.g., "fullstack-backend")
   - Set build command: `npm install`
   - Set start command: `npm start`
   - Select "Free" plan
   - Click "Create Web Service"

3. **Add environment variables**:
   - In the Render dashboard, navigate to your service
   - Go to "Environment" tab
   - Add your MongoDB connection string as `MONGODB_URI`
   - Add `PORT=10000` (Render uses this port by default)

4. **Wait for deployment** to complete (this might take a few minutes for the first deploy)

5. **Note your service URL**, which will look like `https://your-service-name.onrender.com`

## Step 5: Deploying the Frontend to Netlify

Netlify offers a fantastic free tier for hosting static sites like our React app:

1. **Update the production API URL** in your frontend project:
```
REACT_APP_API_URL=https://your-backend-service-name.onrender.com/api
```

2. **Build your React app**:
```bash
npm run build
```

3. **Create a Netlify account** at [netlify.com](https://netlify.com)

4. **Deploy to Netlify** using one of these methods:
   
   **Option 1: Drag and drop**
   - Go to the Netlify dashboard
   - Simply drag and drop your `build` folder onto the Netlify dashboard

   **Option 2: GitHub integration**
   - Push your frontend code to GitHub
   - In the Netlify dashboard, click "New site from Git"
   - Select GitHub and authorize Netlify
   - Select your repository
   - Set build command: `npm run build`
   - Set publish directory: `build`
   - Click "Deploy site"

5. **Add environment variables in Netlify**:
   - Go to your site settings
   - Navigate to "Build & deploy" > "Environment"
   - Add `REACT_APP_API_URL` with your Render backend URL

6. **Set up redirects** for React Router (if you're using it):
   - Create a file called `_redirects` in your `public` folder with this content:
   ```
   /* /index.html 200
   ```

7. **Trigger a new deploy** if you made changes after the initial deployment

Your site should now be live at a URL like `https://your-site-name.netlify.app`!

## Step 6: Connecting Everything Together

Now that all components are deployed, let's make sure they can communicate with each other:

1. **Update CORS settings** in your backend `server.js` file to allow requests from your Netlify domain:

```javascript
// Specific CORS configuration for production
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://your-netlify-site-name.netlify.app'
  ],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

2. **Re-deploy your backend** to Render with this update

3. **Test the complete application** by visiting your Netlify URL and making sure you can:
   - View existing items
   - Add new items
   - Delete items

## Limitations and Considerations

While these free tiers are amazing for personal projects and prototypes, be aware of these limitations:

**MongoDB Atlas Free Tier:**
- 512 MB storage limit
- Shared RAM and CPU resources
- No SLA or guaranteed uptime
- Clusters automatically pause after 60 days of inactivity

**Render.com Free Tier:**
- Services spin down after 15 minutes of inactivity
- Spin-up takes 30-60 seconds when a new request comes in
- Limited compute resources
- 750 hours per month of free usage

**Netlify Free Tier:**
- 100 GB bandwidth per month
- 300 build minutes per month
- No more than 3 concurrent builds

For hobby projects, learning, and small portfolios, these limitations are usually not a problem. If your project gains traction, you can always upgrade to paid tiers later.

## Conclusion

Congratulations! You've built and deployed a complete full-stack web application using only free services. This setup provides:

- A modern React frontend hosted on Netlify
- A Node.js/Express backend API hosted on Render.com
- A MongoDB database hosted on Atlas

This architecture is not only cost-effective but also follows modern development practices with separate frontend and backend services. It's scalable, maintainable, and perfect for learning full-stack development or building small to medium-sized projects.

Remember that while these services offer generous free tiers, they may change their offerings over time. Always check their current terms and limitations if you're building something mission-critical.

Happy coding!

---

*Have you built anything interesting using this free stack? Let me know in the comments below!*