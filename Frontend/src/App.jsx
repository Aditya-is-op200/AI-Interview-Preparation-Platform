import { RouterProvider } from "react-router";
import { router } from "./app.routes";
import { AuthProvider } from "./features/auth/auth.context.jsx";
import { InterviewProvider } from "./features/interview/interview.context.jsx";
function App() {
  return (
    <AuthProvider>
      <InterviewProvider>
        <RouterProvider router={router} />
      </InterviewProvider>
    </AuthProvider>
  );
}
export default App;

// AuthProvider is used to provide the user data to all the components in the application
// It is used to wrap the RouterProvider
// Router Provider is used to provide the router to the application
// React Router is used to provide the routing to the application