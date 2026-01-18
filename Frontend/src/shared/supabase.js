import { createClient } from '@supabase/supabase-js';

export const client = createClient(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_KEY);

export var user = await client.auth.getUser();

export const signInWithGoogle = async (role ) => {
  const {error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options:{
        redirectTo: `http://localhost:5173/?role=${role}`
    }
  });
  
  if (error) {
    console.error("Error signing in" + error);
  }
}

export const signOut = async () => {
    const {error} = await client.auth.signOut();
    if (error){
        // return error;
    }
    user = await client.auth.getUser();
    return;
}

export const getTopUsers = async() => {
    const {data, error} = await client
    .from('Users')
    .select(`
        score,
        completed_surveys,
        Name
    `)
    .order('score', { ascending: false })
    .limit(10);
    return data;
}

export const checkLoggedIn = async () => {
  const { data, error } = await client.auth.getUser();

  if (error) {
    return null;
  }

  if (data.user) {
    return data.user
  } else {
    // console.log('No user logged in')
    return null
  }
}
export const insertUser = async(role) =>{
    const {user} = await client.auth.getUser();
    console.log(user);
    const { data, error: insertError } = await client
        .from('Roles')
        .insert({
             uid: user.uid,
             role: role
            })
        .select()
}