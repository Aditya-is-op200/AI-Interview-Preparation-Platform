import { RouterProvider } from "react-router";
import { router } from "./app.routes";
import { AuthProvider } from "./features/auth/auth.context.jsx";

function App() {
  return ( 
    <AuthProvider>
      <RouterProvider router={router}></RouterProvider>
    </AuthProvider>
  );
}
export default App;

// AuthProvider is used to provide the user data to all the components in the application
// It is used to wrap the RouterProvider
// Router Provider is used to provide the router to the application
// React Router is used to provide the routing to the application