/**
 * PrimeChat Application Entry Point
 * 
 * Configures React Router, Chakra UI provider, and the global
 * PrimeChatProvider context. Defines the root route structure
 * with Home (landing/auth) and Dashboard pages.
 * 
 * @module AppEntry
 */

import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { ChakraProvider } from "@chakra-ui/react";
import { Outlet } from "react-router-dom";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Home from "./components/Home";
import Dashboard from "./components/Dashboard/Dashboard";
import PrimeChatProvider from "./context/appState";

const storedAuthToken = localStorage.getItem("token");

const appRouter = createBrowserRouter([
  {
    path: "/",
    element: (
      <PrimeChatProvider>
        <ChakraProvider>
          <App token={storedAuthToken} />
          <Outlet />
        </ChakraProvider>
      </PrimeChatProvider>
    ),
    children: [
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "/dashboard",
        element: <Dashboard />,
      },
    ],
  },
]);

const rootElement = ReactDOM.createRoot(document.getElementById("root"));
rootElement.render(
  <React.StrictMode>
    <RouterProvider router={appRouter} />
  </React.StrictMode>
);

reportWebVitals();
