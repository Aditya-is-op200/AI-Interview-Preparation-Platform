# 4-Layer Frontend Architecture

Modern React applications are generally divided into **4 layers**, where each layer has a single responsibility. This follows the **Separation of Concerns (SoC)** principle, making the application scalable, maintainable, and easy to debug.

```
Frontend
│
├── UI Layer
├── Hook Layer
├── State Layer
└── API Layer
```

Each layer focuses on one responsibility and communicates with the other layers in a structured way.

---

# 1. UI Layer (Presentation Layer)

```
UI
│
├── Components
└── Pages
```

## Purpose

The UI Layer is responsible for displaying the application to the user.

It contains everything the user can see and interact with.

Examples include:

- Buttons
- Forms
- Cards
- Navbar
- Sidebar
- Login Page
- Register Page
- Dashboard

The UI layer should only focus on **presentation** and **user interaction**.

It should **NOT** contain:

- API Calls
- Authentication Logic
- Business Logic
- Global State Management

---

## Components

**Location**

```text
src/features/auth/components
```

Components are **small reusable UI elements**.

Examples:

- Button
- Input
- Navbar
- Sidebar
- Card
- Loader
- Modal
- Avatar

Instead of writing the same HTML repeatedly, we create reusable components.

Example:

```jsx
<Button text="Login" />
```

The same button can be reused on multiple pages without rewriting code.

---

## Pages

**Location**

```text
src/features/auth/pages
```

Pages represent complete screens.

Examples:

- Login
- Register
- Dashboard
- Resume Analyzer
- Interview
- Profile

A page is usually built by combining multiple reusable components.

Example:

```
Login Page

↓

Heading

↓

Email Input

↓

Password Input

↓

Button

↓

Register Link
```

Pages receive data from Hooks and simply render it.

---

## Responsibilities

The UI Layer should:

- Render JSX
- Display data
- Accept user input
- Call Hooks
- Show loading/error states

The UI Layer should **never directly communicate with the backend**.

---

# 2. Hook Layer (Business Logic Layer)

```
Hook

↓

hooks
```

## Purpose

As mentioned by the instructor:

> **Hook Layer is responsible for managing the State Layer and API Layer.**

Hooks sit between the UI and the rest of the application.

They coordinate:

- State Layer
- API Layer

and expose simple functions to the UI.

---

## Why Hooks?

Instead of writing business logic inside pages,

```
Login.jsx
```

calls

```jsx
useAuth()
```

The hook internally manages:

- Authentication
- API Calls
- Loading
- Error Handling
- State Updates

The page doesn't need to know how login works.

Example:

```jsx
const {
    loading,
    handleLogin,
    handleRegister
} = useAuth();
```

Now the page simply calls

```jsx
handleLogin();
```

without worrying about backend implementation.

---

## Responsibilities

The Hook Layer is responsible for:

- Business Logic
- Validation
- Loading State
- Error Handling
- Calling API Services
- Updating Context/State
- Reusable Logic

---

## Flow

```
Login.jsx

↓

useAuth()

↓

login()

↓

Update Context
```

---

# 3. State Layer (Data Store)

```
State

↓

Data Store
```

Examples:

```
auth.context.jsx

ai.context.jsx
```

---

## Purpose

The State Layer stores information that needs to be shared across the application.

Think of it as the application's **shared memory**.

---

## Examples of Global State

- Logged-in User
- JWT Token
- Authentication Status
- Resume Data
- Interview Questions
- AI Responses
- Theme
- Loading State

---

Without Context:

```
App

↓

Navbar

↓

Dashboard

↓

Profile

↓

Child

↓

Child
```

This is called **Prop Drilling**.

Using Context, any component can access shared data directly.

---

## auth.context.jsx

Stores authentication-related information.

Examples:

- Current User
- JWT Token
- Login Status
- Logout Function
- Authentication Loading State

---

## ai.context.jsx

Stores AI-related information.

Examples:

- Resume
- Generated Questions
- Interview Feedback
- AI Responses
- AI Loading State

---

## Responsibilities

The State Layer stores:

- Global State
- User Information
- Authentication
- AI Responses
- Shared Application Data

---

# 4. API Layer (Communication Layer)

```
API

↓

Communication with Backend
```

**Location**

```
services/
```

Example:

```
auth.api.js
```

---

## Purpose

The API Layer is responsible for communicating with the backend.

This is the **only layer** that should make HTTP requests.

Instead of writing:

```jsx
fetch()

axios()
```

inside React pages,

all backend communication is centralized inside:

```
services/
```

---

Example:

```
services

↓

auth.api.js

↓

login()

↓

register()

↓

logout()

↓

refreshToken()
```

Example:

```javascript
export const login = (data) => {
    return axios.post("/api/auth/login", data);
};
```

Now Login.jsx never directly uses Axios.

It simply calls

```jsx
handleLogin();
```

which internally calls

```
auth.api.js
```

---

## Responsibilities

The API Layer is responsible for:

- Sending HTTP Requests
- Receiving Responses
- Communicating with the Backend
- Handling API Endpoints
- Centralizing API Code

---

# Complete Architecture Flow

```
                User
                  │
                  ▼
        Login/Register Page
             (UI Layer)
                  │
                  ▼
             useAuth()
            (Hook Layer)
                  │
      ┌───────────┴───────────┐
      ▼                       ▼
State Layer              API Layer
(auth.context)       (auth.api.js)
      │                       │
      │                 HTTP Request
      │                       ▼
      │                 Backend Server
      │                       │
      └───────────────┬───────┘
                      ▼
            Updated Authentication State
                      │
                      ▼
              UI Re-renders Automatically
```

---

# Responsibilities Summary

| Layer | Responsibility | Examples |
|--------|----------------|----------|
| **UI Layer** | Displays the interface and accepts user input | Login.jsx, Register.jsx, Button.jsx |
| **Hook Layer** | Manages business logic and coordinates State & API layers | `useAuth()`, `useAI()` |
| **State Layer** | Stores global/shared application data | `auth.context.jsx`, `ai.context.jsx` |
| **API Layer** | Handles communication with the backend | `auth.api.js`, `ai.api.js` |

---

# Advantages of This Architecture

- Clear Separation of Concerns
- Reusable Components and Hooks
- Centralized API Communication
- Cleaner React Components
- Easier Debugging
- Better Scalability
- Improved Maintainability
- Easier Team Collaboration

---

# One-Line Interview Explanation

> **The frontend follows a four-layer architecture where the UI Layer displays the interface, the Hook Layer manages business logic and coordinates the State and API layers, the State Layer stores global application data using Context, and the API Layer handles all communication with the backend. This separation keeps the application modular, reusable, scalable, and easy to maintain.**