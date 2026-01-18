import { createClient } from '@supabase/supabase-js';

export const client = createClient(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_KEY);

export var user = await client.auth.getUser();

export const signInWithGoogle = async () => {
  const {error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options:{
        redirectTo: "http://localhost:5173/"
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
    const { data, error } = await client.auth.getUser();
    if (error) throw error;
    if (!data?.user) throw new Error("Not logged in");

    const { error: insertError } = await client
      .from('Roles')
      .insert({
        uid: data.user.id,
        role: role
      })
      .select();

    if (insertError) throw insertError;
}

export const extractSurveys = async() => {
  const {data} = await client
    .from('Surveyor')
    .select("*")

  return data;

}

export const goLive = async(ids) => {
  const { error } = await client
    .from('Surveyor')
    .update(
      {live: true },  // set live = true
    )
    .in('id', ids) 

  const {data} = await client
    .from("Surveyor")
    .select("*")
  return data;
}
export const goDown = async(ids) => {
  const {error} = await client
  .from('Surveyor')
  .update({
    live: false
  })
  .in('id', ids)

  const {data} = await client
    .from("Surveyor")
    .select("*")
  return data;

}

export const updateLeaderBoard = async() => { 
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData?.user) {
    return { ok: false, reason: "not_logged_in" };
  }

  const { data, error } = await client.rpc("increment_user_score");
  if (error) throw error;

  return { ok: true, data };
}