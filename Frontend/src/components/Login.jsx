import {supabase} from "..supabase.js";


const signInWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google'
  })

  if (error) {
    console.error(error);
  }
}