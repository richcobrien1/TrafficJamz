// File: backend/src/services/client.js
// This file initializes a Supabase client for use in the backend services of the application.

import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

// This client can be used throughout the application to interact with Supabase services.
// Ensure that the environment variables REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY
// are set in your .env file or environment configuration for the application to work correctly.
// Example usage in a component or service:
// import { supabase } from '../services/client';
//
// async function fetchData() {
//   const { data, error } = await supabase
//     .from('your_table')
//     .select('*');
//   if (error) {
//     console.error('Error fetching data:', error);
//   } else {
//     console.log('Fetched data:', data);
//   }
// }
// This code initializes a Supabase client that can be used to perform database operations,
// authentication, and other Supabase features. The client is created using the URL and anon key